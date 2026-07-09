import { NextRequest, NextResponse } from "next/server";
import { loadDb, saveDb, uid, logAudit, getActiveCompany, companyDocuments, companyObjects } from "@/lib/store";
import { runAnalysis } from "@/lib/engine/analysis";
import type { ObjectOfIssue } from "@/lib/types";

export async function GET() {
  const db = loadDb();
  const company = getActiveCompany(db);
  return NextResponse.json({ objects: company ? companyObjects(db, company.id) : [] });
}

/** Save the fund utilisation plan built in Objects Builder. */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const db = loadDb();
  const company = getActiveCompany(db);
  if (!company) return NextResponse.json({ error: "No company" }, { status: 400 });

  const items: ObjectOfIssue[] = (body.objects ?? []).map((o: Partial<ObjectOfIssue>) => ({
    id: o.id ?? uid("obj"),
    category: o.category ?? "",
    amountCr: Number(o.amountCr) || 0,
    evidence: o.evidence ?? "",
    warning: o.warning ?? null,
    deploymentTimeline: o.deploymentTimeline ?? "",
  }));

  // computed warnings
  const total = items.reduce((s, o) => s + o.amountCr, 0);
  for (const o of items) {
    if (/general corporate/i.test(o.category) && total > 0 && o.amountCr / total > 0.25)
      o.warning = "General corporate purposes exceeds 25% of the issue — regulatory ceiling concern.";
    if (/debt|repayment/i.test(o.category) && body.relatedPartyRepayment)
      o.warning = "Repayment includes promoter/related-party debt — regulatory & legal review required.";
  }

  db.objectsByCompany[company.id] = items;
  db.analysis[company.id] = runAnalysis(company, companyDocuments(db, company.id), items);
  logAudit(db, company.id, "Promoter", "Objects of issue updated", "", `${items.length} objects, total ₹${total} Cr`);
  saveDb(db);
  return NextResponse.json({ objects: items, analysis: db.analysis[company.id] });
}
