import { NextRequest, NextResponse } from "next/server";
import { loadDb, saveDb, logAudit, getActiveCompany, companyDocuments, companyObjects } from "@/lib/store";
import { runAnalysis } from "@/lib/engine/analysis";

export async function GET() {
  const db = await loadDb();
  const company = getActiveCompany(db);
  return NextResponse.json({ documents: company ? companyDocuments(db, company.id) : [] });
}

/** Manual correction of extracted fields — vital for scanned documents. */
export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const db = await loadDb();
  const doc = db.documents.find((d) => d.id === body.id);
  if (!doc) return NextResponse.json({ error: "Document not found" }, { status: 404 });
  const before = JSON.stringify(doc.fields);
  if (body.fields) doc.fields = { ...doc.fields, ...body.fields };
  if (body.category) doc.category = body.category;
  if (body.status) doc.status = body.status;
  doc.manualOverride = true;
  doc.lastUpdated = new Date().toISOString().slice(0, 10);
  logAudit(db, doc.companyId, body.user ?? "Promoter", `Corrected extraction: ${doc.fileName}`, before, JSON.stringify(doc.fields));
  const company = db.companies.find((c) => c.id === doc.companyId);
  if (company) db.analysis[company.id] = runAnalysis(company, companyDocuments(db, company.id), companyObjects(db, company.id));
  await saveDb(db);
  return NextResponse.json({ document: doc });
}

export async function DELETE(req: NextRequest) {
  const id = new URL(req.url).searchParams.get("id");
  const db = await loadDb();
  const idx = db.documents.findIndex((d) => d.id === id);
  if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const [doc] = db.documents.splice(idx, 1);
  logAudit(db, doc.companyId, "Promoter", `Deleted document: ${doc.fileName}`);
  const company = db.companies.find((c) => c.id === doc.companyId);
  if (company) db.analysis[company.id] = runAnalysis(company, companyDocuments(db, company.id), companyObjects(db, company.id));
  await saveDb(db);
  return NextResponse.json({ ok: true });
}
