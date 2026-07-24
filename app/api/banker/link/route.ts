import { NextRequest, NextResponse } from "next/server";
import { bankerCompanies, loadDb, saveDb, logAudit } from "@/lib/store";
import { getSessionUser } from "@/lib/auth/session";

/**
 * Merchant banker ↔ company linking, by share code.
 * The promoter finds their company code in Company Setup / Settings and gives
 * it to their banker; the banker enters it here to gain read/review access.
 *
 * GET  → companies linked to the logged-in banker.
 * POST { code } → link the banker's account to the company with that code.
 */
export async function GET() {
  const user = await getSessionUser();
  if (!user || user.role !== "MERCHANT_BANKER")
    return NextResponse.json({ error: "Merchant banker account required." }, { status: 403 });
  const db = await loadDb();
  return NextResponse.json({
    companies: bankerCompanies(db, user.email).map((c) => ({
      id: c.id, name: c.name, companyCode: c.companyCode ?? null,
    })),
  });
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || user.role !== "MERCHANT_BANKER")
    return NextResponse.json({ error: "Merchant banker account required." }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const code = String(body.code ?? "").trim().toUpperCase();
  if (!code) return NextResponse.json({ error: "Enter the company code." }, { status: 400 });

  const db = await loadDb();
  const company = db.companies.find((c) => (c.companyCode ?? "").toUpperCase() === code);
  if (!company)
    return NextResponse.json(
      { error: "No company found for this code. Ask the promoter to check the code shown in their Company Setup page." },
      { status: 404 }
    );

  const email = user.email.trim().toLowerCase();
  company.bankerEmails = company.bankerEmails ?? [];
  if (!company.bankerEmails.includes(email)) {
    company.bankerEmails.push(email);
    logAudit(db, company.id, user.name || user.email, "Merchant banker linked to company", "", `via code ${code}`);
    await saveDb(db);
  }
  return NextResponse.json({ company: { id: company.id, name: company.name } });
}
