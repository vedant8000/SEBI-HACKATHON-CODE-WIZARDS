import { NextRequest, NextResponse } from "next/server";
import {
  bankerCompanies, genCompanyCode, loadDb, promoterCompanies, saveDb, uid, logAudit, type Db,
} from "@/lib/store";
import { getSessionUser } from "@/lib/auth/session";
import type { Company } from "@/lib/types";

/** The companies this session may see/manage. */
async function scopedCompanies(db: Db) {
  const user = await getSessionUser();
  if (!user) return { user: null, companies: [] as Company[] };
  const companies =
    user.role === "MERCHANT_BANKER" ? bankerCompanies(db, user.email) : promoterCompanies(db, user.email);
  return { user, companies };
}

/** Backfill share codes for companies created before code-based banker linking. */
function ensureCompanyCodes(db: Db): boolean {
  const taken = new Set(db.companies.map((c) => c.companyCode).filter(Boolean) as string[]);
  let changed = false;
  for (const c of db.companies) {
    if (!c.companyCode) {
      c.companyCode = genCompanyCode(taken);
      taken.add(c.companyCode);
      changed = true;
    }
    if (!c.bankerEmails) { c.bankerEmails = []; changed = true; }
  }
  return changed;
}

export async function GET() {
  const db = await loadDb();
  if (ensureCompanyCodes(db)) await saveDb(db);
  const { companies } = await scopedCompanies(db);
  return NextResponse.json({ companies, activeCompanyId: db.activeCompanyId });
}

// create a company (onboarding)
export async function POST(req: NextRequest) {
  const body = await req.json();
  const db = await loadDb();
  ensureCompanyCodes(db);
  const { user, companies: myCompanies } = await scopedCompanies(db);
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  if (body.action === "activate") {
    // Only companies in the caller's own scope can be activated.
    if (!myCompanies.some((c) => c.id === body.id))
      return NextResponse.json({ error: "Company not found in your account." }, { status: 403 });
    db.activeCompanyId = body.id;
    await saveDb(db);
    return NextResponse.json({ ok: true });
  }
  // Guard against duplicates WITHIN this promoter's companies: re-submitting
  // the same company name updates their existing record instead of creating a
  // parallel company. Another promoter's identically-named company is untouched.
  const existing = myCompanies.find(
    (c) => c.name.trim().toLowerCase() === String(body.name ?? "").trim().toLowerCase()
  );
  if (existing) {
    Object.assign(existing, {
      cin: body.cin ?? existing.cin,
      industry: body.industry ?? existing.industry,
      city: body.city ?? existing.city,
      state: body.state ?? existing.state,
      yearOfIncorporation: body.yearOfIncorporation ? Number(body.yearOfIncorporation) : existing.yearOfIncorporation,
      promoterName: body.promoterName ?? existing.promoterName,
      promoterExperienceYears: body.promoterExperienceYears ? Number(body.promoterExperienceYears) : existing.promoterExperienceYears,
      issueSizeCr: body.issueSizeCr ? Number(body.issueSizeCr) : existing.issueSizeCr,
      freshIssueCr: body.freshIssueCr ? Number(body.freshIssueCr) : existing.freshIssueCr,
      ofsCr: body.ofsCr !== undefined ? Number(body.ofsCr) : existing.ofsCr,
      proposedListingExchange: body.proposedListingExchange ?? existing.proposedListingExchange,
      financials: body.financials?.length ? body.financials : existing.financials,
      top3CustomerPct: body.top3CustomerPct ? Number(body.top3CustomerPct) : existing.top3CustomerPct,
      independentDirectorsAppointed: body.independentDirectorsAppointed ?? existing.independentDirectorsAppointed,
      auditCommitteeConstituted: body.auditCommitteeConstituted ?? existing.auditCommitteeConstituted,
      pendingLitigationNote: body.pendingLitigationNote ?? existing.pendingLitigationNote,
    });
    db.activeCompanyId = existing.id;
    logAudit(db, existing.id, existing.promoterName || "Promoter", "Company profile updated (deduplicated)", "", existing.name);
    await saveDb(db);
    return NextResponse.json({ company: existing });
  }
  const company: Company = {
    id: uid("co"),
    name: body.name ?? "",
    cin: body.cin ?? "",
    industry: body.industry ?? "",
    city: body.city ?? "",
    state: body.state ?? "",
    yearOfIncorporation: body.yearOfIncorporation ? Number(body.yearOfIncorporation) : null,
    promoterName: body.promoterName ?? "",
    promoterExperienceYears: body.promoterExperienceYears ? Number(body.promoterExperienceYears) : null,
    issueSizeCr: body.issueSizeCr ? Number(body.issueSizeCr) : null,
    freshIssueCr: body.freshIssueCr ? Number(body.freshIssueCr) : null,
    ofsCr: body.ofsCr ? Number(body.ofsCr) : null,
    proposedListingExchange: body.proposedListingExchange ?? "NSE Emerge / BSE SME",
    status: "Onboarding",
    financials: body.financials ?? [],
    top3CustomerPct: body.top3CustomerPct ? Number(body.top3CustomerPct) : null,
    independentDirectorsAppointed: body.independentDirectorsAppointed ?? null,
    auditCommitteeConstituted: body.auditCommitteeConstituted ?? null,
    pendingLitigationNote: body.pendingLitigationNote ?? "",
    createdAt: new Date().toISOString(),
    ownerEmail: user.email.trim().toLowerCase(),
    companyCode: genCompanyCode(new Set(db.companies.map((c) => c.companyCode).filter(Boolean) as string[])),
    bankerEmails: [],
  };
  db.companies.push(company);
  db.activeCompanyId = company.id;
  logAudit(db, company.id, body.promoterName || "Promoter", "Company profile created", "", company.name);
  await saveDb(db);
  return NextResponse.json({ company });
}

// update active company profile
export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const db = await loadDb();
  ensureCompanyCodes(db);
  const { user, companies: myCompanies } = await scopedCompanies(db);
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const company = myCompanies.find((c) => c.id === (body.id ?? db.activeCompanyId)) ?? myCompanies[0];
  if (!company) return NextResponse.json({ error: "No company" }, { status: 404 });
  // adopt legacy unowned companies on first edit
  if (!company.ownerEmail && user.role !== "MERCHANT_BANKER") company.ownerEmail = user.email.trim().toLowerCase();
  const before = JSON.stringify({ name: company.name, issueSizeCr: company.issueSizeCr });
  // companyCode, bankerEmails & ownerEmail are managed by the platform, never by profile edits
  const { companyCode: _cc, bankerEmails: _be, ownerEmail: _oe, ...updates } = (body.updates ?? {}) as Record<string, unknown>;
  Object.assign(company, updates);
  logAudit(db, company.id, company.promoterName || "Promoter", "Company profile updated", before, JSON.stringify(body.updates ?? {}));
  await saveDb(db);
  return NextResponse.json({ company });
}
