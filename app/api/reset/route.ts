import { NextResponse } from "next/server";
import { loadDb, promoterCompanies, purgeCompanyIds, saveDb } from "@/lib/store";
import { getSessionUser } from "@/lib/auth/session";

/**
 * Reset, fresh start for THIS promoter only. Deletes the caller's companies
 * and everything attached to them; other promoters' data is untouched.
 */
export async function DELETE() {
  const user = await getSessionUser();
  if (!user || user.role === "MERCHANT_BANKER")
    return NextResponse.json({ error: "Only a promoter can reset their own data." }, { status: 403 });

  const db = await loadDb();
  const ids = new Set(promoterCompanies(db, user.email).map((c) => c.id));
  const removed = purgeCompanyIds(db, ids);

  await saveDb(db);
  return NextResponse.json({ ok: true, removedCompanies: removed });
}
