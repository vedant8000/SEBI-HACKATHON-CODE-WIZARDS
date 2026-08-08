import { NextRequest, NextResponse } from "next/server";
import { loadDb, getActiveCompanyFor, companyDraft, companyFacts } from "@/lib/store";
import { getSessionUser } from "@/lib/auth/session";
import { answerPromoterQuestion } from "@/lib/ai/provider";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const { question } = await req.json();
  const db = await loadDb();
  const user = await getSessionUser();
  const company = user ? getActiveCompanyFor(db, user) : null;
  if (!company) return NextResponse.json({ answer: "Create or select a company first, then I can answer questions grounded in your own documents." });
  const answer = await answerPromoterQuestion(
    question ?? "", company,
    db.analysis[company.id] ?? null,
    companyDraft(db, company.id),
    companyFacts(db, company.id)
  );
  return NextResponse.json({ answer });
}
