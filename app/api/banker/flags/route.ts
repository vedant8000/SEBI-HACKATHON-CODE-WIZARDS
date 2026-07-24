import { NextRequest, NextResponse } from "next/server";
import { bankerCompanies, companyFlags, getActiveCompany, loadDb, logAudit, saveDb, uid } from "@/lib/store";
import { getSessionUser } from "@/lib/auth/session";
import type { BankerFlag, FlagTargetType, Severity } from "@/lib/types";

/**
 * Merchant banker correction flags — the "pinpoint what to fix" channel.
 *
 * GET → flags visible to the caller (banker: linked companies; promoter: active company).
 * POST { companyId, targetType, targetId?, targetLabel, message, severity? } → banker creates a flag.
 * PATCH { id, status } → promoter marks ADDRESSED / banker reopens or closes.
 */

const TARGET_TYPES: FlagTargetType[] = ["document", "fact", "gap", "section", "general"];
const SEVERITIES: Severity[] = ["Critical", "High", "Medium", "Low"];

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const db = await loadDb();
  if (user.role === "MERCHANT_BANKER") {
    const ids = new Set(bankerCompanies(db, user.email).map((c) => c.id));
    return NextResponse.json({ flags: db.flags.filter((f) => ids.has(f.companyId)) });
  }
  const company = getActiveCompany(db);
  return NextResponse.json({ flags: company ? companyFlags(db, company.id) : [] });
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || user.role !== "MERCHANT_BANKER")
    return NextResponse.json({ error: "Only merchant bankers can raise correction flags." }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const message = String(body.message ?? "").trim();
  if (!message) return NextResponse.json({ error: "Describe what needs to be corrected." }, { status: 400 });

  const db = await loadDb();
  const company = bankerCompanies(db, user.email).find((c) => c.id === body.companyId);
  if (!company)
    return NextResponse.json({ error: "You are not linked to this company." }, { status: 403 });

  const now = new Date().toISOString();
  const flag: BankerFlag = {
    id: uid("flag"),
    companyId: company.id,
    targetType: TARGET_TYPES.includes(body.targetType) ? body.targetType : "general",
    targetId: body.targetId ? String(body.targetId) : null,
    targetLabel: String(body.targetLabel ?? "General").slice(0, 160),
    message: message.slice(0, 2000),
    severity: SEVERITIES.includes(body.severity) ? body.severity : "Medium",
    status: "OPEN",
    author: user.name || user.email,
    createdAt: now,
    updatedAt: now,
  };
  db.flags.unshift(flag);
  logAudit(db, company.id, flag.author, `Banker flag raised: ${flag.targetLabel}`, "", `[${flag.severity}] ${flag.message.slice(0, 120)}`);
  await saveDb(db);
  return NextResponse.json({ flag });
}

export async function PATCH(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const db = await loadDb();
  const flag = db.flags.find((f) => f.id === body.id);
  if (!flag) return NextResponse.json({ error: "Flag not found." }, { status: 404 });

  const status = body.status === "ADDRESSED" ? "ADDRESSED" : body.status === "OPEN" ? "OPEN" : null;
  if (!status) return NextResponse.json({ error: "status must be OPEN or ADDRESSED." }, { status: 400 });

  if (user.role === "MERCHANT_BANKER") {
    const linked = bankerCompanies(db, user.email).some((c) => c.id === flag.companyId);
    if (!linked) return NextResponse.json({ error: "You are not linked to this company." }, { status: 403 });
  }
  // Promoters may only mark flags addressed (never silently reopen/close others)
  if (user.role !== "MERCHANT_BANKER" && status !== "ADDRESSED")
    return NextResponse.json({ error: "Promoters can only mark a flag as addressed." }, { status: 403 });

  const before = flag.status;
  flag.status = status;
  flag.updatedAt = new Date().toISOString();
  logAudit(db, flag.companyId, user.name || user.email, `Banker flag ${status === "ADDRESSED" ? "addressed" : "reopened"}: ${flag.targetLabel}`, before, status);
  await saveDb(db);
  return NextResponse.json({ flag });
}
