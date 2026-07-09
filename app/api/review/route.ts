import { NextRequest, NextResponse } from "next/server";
import { loadDb, saveDb, uid, logAudit } from "@/lib/store";
import type { Role, SectionReviewStatus } from "@/lib/types";

/**
 * Merchant Banker Review Room actions.
 * POST { action: "comment" | "approve" | "request-changes" | "assign-back" | "needs-legal" | "mark-review",
 *        sectionId, comment?, user, role }
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const db = loadDb();
  const section = db.draftSections.find((s) => s.id === body.sectionId);
  if (!section) return NextResponse.json({ error: "Section not found" }, { status: 404 });

  const user: string = body.user ?? "Merchant Banker";
  const role: Role = body.role ?? "MERCHANT_BANKER";
  const oldStatus = section.status;

  const statusMap: Record<string, SectionReviewStatus | undefined> = {
    approve: "Approved",
    "request-changes": "Changes Requested",
    "assign-back": "Changes Requested",
    "mark-review": "MB Review Pending",
    "promoter-reviewed": "Promoter Reviewed",
  };

  if (body.comment) {
    section.comments.push({ id: uid("cm"), author: user, role, comment: body.comment, createdAt: new Date().toISOString() });
  }
  const newStatus = statusMap[body.action];
  if (newStatus) section.status = newStatus;
  if (body.action === "needs-legal") {
    section.comments.push({ id: uid("cm"), author: user, role, comment: "Marked as needing legal review.", createdAt: new Date().toISOString() });
  }
  section.updatedAt = new Date().toISOString();

  logAudit(db, section.companyId, user,
    `${body.action} on section: ${section.sectionName}`, oldStatus, section.status);
  saveDb(db);
  return NextResponse.json({ section });
}
