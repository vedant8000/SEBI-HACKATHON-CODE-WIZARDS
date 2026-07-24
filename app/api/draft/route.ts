import { NextRequest, NextResponse } from "next/server";
import {
  loadDb, saveDb, logAudit, getActiveCompany,
  companyDocuments, companyObjects, companyDraft, companyFacts,
} from "@/lib/store";
import { generateDraft } from "@/lib/engine/draft";
import { aiAvailable } from "@/lib/ai/provider";

export const maxDuration = 300;

export async function GET() {
  const db = await loadDb();
  const company = getActiveCompany(db);
  return NextResponse.json({ draft: company ? companyDraft(db, company.id) : [], aiAvailable: aiAvailable() });
}

/**
 * Generate the blueprint-driven, source-linked draft (priority sections).
 * Uses the AI provider when available; otherwise the deterministic rule-based
 * generator produces the same sections from extracted facts — so a draft is
 * always produced, even without an API key or when keys are rate-limited.
 */
export async function POST(req: NextRequest) {
  const db = await loadDb();
  const company = getActiveCompany(db);
  if (!company) return NextResponse.json({ error: "Create a company profile first." }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const sections = await generateDraft(
    company,
    companyDocuments(db, company.id),
    companyFacts(db, company.id),
    companyObjects(db, company.id),
    db.analysis[company.id] ?? null,
    body?.sectionIds
  );

  // replace regenerated sections, keep comments
  const existing = db.draftSections.filter((s) => s.companyId === company.id);
  for (const s of sections) {
    const old = existing.find((e) => e.sectionName === s.sectionName);
    if (old) s.comments = old.comments;
  }
  const names = new Set(sections.map((s) => s.sectionName));
  db.draftSections = db.draftSections
    .filter((s) => s.companyId !== company.id || !names.has(s.sectionName))
    .concat(sections);

  logAudit(db, company.id, "System", "Draft generated (blueprint)", "", `${sections.length} sections`);
  await saveDb(db);
  return NextResponse.json({ draft: db.draftSections.filter((s) => s.companyId === company.id) });
}
