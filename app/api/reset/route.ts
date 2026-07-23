import { NextResponse } from "next/server";
import { loadDb, saveDb } from "@/lib/store";

/** Reset everything — fresh start. */
export async function DELETE() {
  const db = await loadDb();
  db.companies = [];
  db.documents = [];
  db.chunks = [];
  db.facts = [];
  db.conflicts = [];
  db.draftSections = [];
  db.objectsByCompany = {};
  db.analysis = {};
  db.auditLog = [];
  db.activeCompanyId = null;
  await saveDb(db);
  return NextResponse.json({ ok: true });
}
