import { NextResponse } from "next/server";
import { loadDb, promoterCompanies, saveDb } from "@/lib/store";
import { getSessionUser } from "@/lib/auth/session";

/**
 * Reset — fresh start for THIS promoter only. Deletes the caller's companies
 * and everything attached to them; other promoters' data is untouched.
 */
export async function DELETE() {
  const user = await getSessionUser();
  if (!user || user.role === "MERCHANT_BANKER")
    return NextResponse.json({ error: "Only a promoter can reset their own data." }, { status: 403 });

  const db = await loadDb();
  const ids = new Set(promoterCompanies(db, user.email).map((c) => c.id));

  db.companies = db.companies.filter((c) => !ids.has(c.id));
  db.documents = db.documents.filter((d) => !ids.has(d.companyId));
  db.chunks = db.chunks.filter((c) => !ids.has(c.companyId));
  db.facts = db.facts.filter((f) => !ids.has(f.companyId));
  db.conflicts = db.conflicts.filter((c) => !ids.has(c.companyId));
  db.draftSections = db.draftSections.filter((s) => !ids.has(s.companyId));
  db.flags = db.flags.filter((f) => !ids.has(f.companyId));
  db.auditLog = db.auditLog.filter((a) => !ids.has(a.companyId));
  for (const id of ids) {
    delete db.objectsByCompany[id];
    delete db.analysis[id];
  }
  if (db.activeCompanyId && ids.has(db.activeCompanyId)) db.activeCompanyId = null;

  await saveDb(db);
  return NextResponse.json({ ok: true, removedCompanies: ids.size });
}
