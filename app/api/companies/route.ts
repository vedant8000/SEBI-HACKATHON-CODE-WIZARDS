import { NextRequest, NextResponse } from "next/server";
import { loadDb, saveDb, uid, logAudit } from "@/lib/store";
import type { Company } from "@/lib/types";

export async function GET() {
  const db = loadDb();
  return NextResponse.json({ companies: db.companies, activeCompanyId: db.activeCompanyId });
}

// create a company (onboarding)
export async function POST(req: NextRequest) {
  const body = await req.json();
  const db = loadDb();
  if (body.action === "activate") {
    db.activeCompanyId = body.id;
    saveDb(db);
    return NextResponse.json({ ok: true });
  }
  // Guard against duplicates: re-submitting the same company name updates the
  // existing record (and its evidence) instead of creating a parallel company.
  const existing = db.companies.find(
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
    saveDb(db);
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
  };
  db.companies.push(company);
  db.activeCompanyId = company.id;
  logAudit(db, company.id, body.promoterName || "Promoter", "Company profile created", "", company.name);
  saveDb(db);
  return NextResponse.json({ company });
}

// update active company profile
export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const db = loadDb();
  const company = db.companies.find((c) => c.id === (body.id ?? db.activeCompanyId));
  if (!company) return NextResponse.json({ error: "No company" }, { status: 404 });
  const before = JSON.stringify({ name: company.name, issueSizeCr: company.issueSizeCr });
  Object.assign(company, body.updates ?? {});
  logAudit(db, company.id, company.promoterName || "Promoter", "Company profile updated", before, JSON.stringify(body.updates ?? {}));
  saveDb(db);
  return NextResponse.json({ company });
}
