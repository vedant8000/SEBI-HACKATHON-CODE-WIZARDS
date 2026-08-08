import { NextResponse } from "next/server";
import { loadDb, saveDb, getActiveCompanyFor, companyDraft, logAudit } from "@/lib/store";
import { getSessionUser } from "@/lib/auth/session";

/**
 * Send the generated draft to the merchant banker for review in one action:
 * every generated section (not "Not Started", not already Approved) moves to
 * "MB Review Pending". This is what marks the final "Sent for MB Review" step
 * of the promoter journey as complete.
 */
export async function POST() {
  const db = await loadDb();
  const user = await getSessionUser();
  const company = user ? getActiveCompanyFor(db, user) : null;
  if (!company) return NextResponse.json({ error: "No company in scope." }, { status: 400 });

  const sections = companyDraft(db, company.id).filter(
    (s) => s.status !== "Not Started" && s.generatedText.trim() && s.status !== "Approved"
  );
  if (!sections.length)
    return NextResponse.json({ error: "Generate the draft before sending it for review." }, { status: 400 });

  const now = new Date().toISOString();
  const by = user?.name || company.promoterName || "Promoter";
  for (const s of sections) {
    const old = s.status;
    s.status = "MB Review Pending";
    s.updatedAt = now;
    logAudit(db, company.id, by, `Sent for merchant banker review: ${s.sectionName}`, old, s.status);
  }
  await saveDb(db);
  return NextResponse.json({ ok: true, sent: sections.length });
}
