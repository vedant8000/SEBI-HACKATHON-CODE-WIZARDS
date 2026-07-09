import { NextResponse } from "next/server";
import { loadDb, saveDb, logAudit, getActiveCompany, companyDocuments, companyObjects } from "@/lib/store";
import { runAnalysis } from "@/lib/engine/analysis";

/** GET: last stored analysis. POST: re-run readiness/gaps/heatmap/RPT/financial checks/observations. */
export async function GET() {
  const db = loadDb();
  const company = getActiveCompany(db);
  return NextResponse.json({ analysis: company ? db.analysis[company.id] ?? null : null });
}

export async function POST() {
  const db = loadDb();
  const company = getActiveCompany(db);
  if (!company) return NextResponse.json({ error: "Create a company profile first." }, { status: 400 });
  const analysis = runAnalysis(company, companyDocuments(db, company.id), companyObjects(db, company.id));
  db.analysis[company.id] = analysis;
  logAudit(db, company.id, "System", "Analysis re-run", "", `Score ${analysis.scores.overall}/100, ${analysis.gaps.length} gaps`);
  saveDb(db);
  return NextResponse.json({ analysis });
}
