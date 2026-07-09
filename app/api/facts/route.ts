import { NextRequest, NextResponse } from "next/server";
import {
  loadDb, saveDb, uid, logAudit, getActiveCompany,
  companyDocuments, companyObjects, companyFacts,
} from "@/lib/store";
import { detectConflicts, syncFieldsFromFacts, FACT_META } from "@/lib/document-processing/facts";
import { runAnalysis } from "@/lib/engine/analysis";
import type { ExtractedFact } from "@/lib/types";

export async function GET() {
  const db = loadDb();
  const company = getActiveCompany(db);
  if (!company) return NextResponse.json({ facts: [], conflicts: [] });
  return NextResponse.json({
    facts: companyFacts(db, company.id),
    conflicts: db.conflicts.filter((c) => c.companyId === company.id),
  });
}

/**
 * PATCH { id, action: "accept" | "reject" | "needs-review" | "edit", value? }
 * — promoter review of extracted facts. Edits are flagged for MB verification.
 * POST { factKey, factLabel?, value, financialYear? } — manual fact entry.
 */
export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const db = loadDb();
  const fact = db.facts.find((f) => f.id === body.id);
  if (!fact) return NextResponse.json({ error: "Fact not found" }, { status: 404 });
  const before = `${fact.status}:${fact.normalizedValue}`;

  if (body.action === "accept") fact.status = "ACCEPTED";
  else if (body.action === "reject") fact.status = "REJECTED";
  else if (body.action === "needs-review") fact.status = "NEEDS_REVIEW";
  else if (body.action === "edit") {
    fact.factValue = String(body.value ?? fact.factValue);
    fact.normalizedValue = String(body.value ?? fact.normalizedValue);
    fact.status = "PROMOTER_EDITED"; // merchant banker verification required
  }
  fact.updatedAt = new Date().toISOString();

  const doc = db.documents.find((d) => d.id === fact.documentId);
  const company = db.companies.find((c) => c.id === fact.companyId);
  if (doc && company) {
    if (fact.status === "REJECTED" && fact.factKey in doc.fields) delete doc.fields[fact.factKey];
    syncFieldsFromFacts(doc, companyFacts(db, company.id));
    db.conflicts = db.conflicts.filter((c) => c.companyId !== company.id);
    db.conflicts.push(...detectConflicts(company.id, companyFacts(db, company.id)));
    db.analysis[company.id] = runAnalysis(company, companyDocuments(db, company.id), companyObjects(db, company.id));
  }
  logAudit(db, fact.companyId, body.user ?? "Promoter", `Fact ${body.action}: ${fact.factLabel}`, before, `${fact.status}:${fact.normalizedValue}`);
  saveDb(db);
  return NextResponse.json({ fact });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const db = loadDb();
  const company = getActiveCompany(db);
  if (!company) return NextResponse.json({ error: "No company" }, { status: 400 });
  if (!body.factKey || body.value === undefined)
    return NextResponse.json({ error: "factKey and value are required" }, { status: 400 });

  const now = new Date().toISOString();
  const fact: ExtractedFact = {
    id: uid("fact"),
    companyId: company.id,
    documentId: "manual",
    chunkId: null,
    factKey: body.factKey,
    factLabel: body.factLabel ?? FACT_META[body.factKey]?.label ?? body.factKey,
    factValue: String(body.value),
    normalizedValue: String(body.value),
    financialYear: body.financialYear ?? null,
    unit: /Cr$/.test(body.factKey) ? "INR crore" : null,
    confidence: 50,
    sourceFileName: "Manual promoter input — evidence pending",
    pageStart: null,
    pageEnd: null,
    linkedProspectusSections: FACT_META[body.factKey]?.sections ?? [],
    status: "PROMOTER_EDITED",
    extractionMethod: "manual",
    createdAt: now,
    updatedAt: now,
  };
  db.facts.push(fact);
  db.analysis[company.id] = runAnalysis(company, companyDocuments(db, company.id), companyObjects(db, company.id));
  logAudit(db, company.id, body.user ?? "Promoter", `Manual fact entered: ${fact.factLabel}`, "", fact.normalizedValue);
  saveDb(db);
  return NextResponse.json({ fact });
}
