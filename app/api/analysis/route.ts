import { NextResponse } from "next/server";
import { loadDb, saveDb, logAudit, getActiveCompany, companyDocuments, companyFacts, companyObjects } from "@/lib/store";
import { runAnalysis } from "@/lib/engine/analysis";
import { detectConflicts } from "@/lib/document-processing/facts";

/** GET: last stored analysis. POST: re-run readiness/gaps/heatmap/RPT/financial checks/observations. */
export async function GET() {
  const db = await loadDb();
  const company = getActiveCompany(db);
  return NextResponse.json({ analysis: company ? db.analysis[company.id] ?? null : null });
}

export async function POST() {
  const db = await loadDb();
  const company = getActiveCompany(db);
  if (!company) return NextResponse.json({ error: "Create a company profile first." }, { status: 400 });
  // conflicts are part of the analysis — recompute with current facts & rules
  db.conflicts = db.conflicts.filter((c) => c.companyId !== company.id);
  db.conflicts.push(...detectConflicts(company.id, companyFacts(db, company.id)));
  const analysis = runAnalysis(company, companyDocuments(db, company.id), companyObjects(db, company.id));
  db.analysis[company.id] = analysis;
  logAudit(db, company.id, "System", "Analysis re-run", "", `Score ${analysis.scores.overall}/100, ${analysis.gaps.length} gaps`);
  await saveDb(db);
  return NextResponse.json({ analysis });
}
