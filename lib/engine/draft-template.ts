import type {
  AnalysisResult, Company, CoverageRow, DocumentRecord, ExtractedFact,
  FinancialYear, ObjectOfIssue,
} from "../types";
import type { BlueprintSection } from "../ipo-blueprint/sme-prospectus-blueprint";

/**
 * Deterministic, fact-driven draft generator — the fallback for lib/engine/draft.ts.
 *
 * When no AI provider is configured, or every key is rate-limited, the AI call
 * returns null and the draft would otherwise fail. This module composes the
 * SAME prospectus-style sections (prose + markdown tables) directly from the
 * extracted facts, the company profile, the objects plan and the rule-engine
 * analysis — using only the markdown subset lib/utils/markdown.ts renders.
 *
 * Same discipline as the AI path: state only what the data supports, present
 * figures as tables, never invent names/numbers, no bracketed placeholders —
 * simply omit what is unavailable (tracked separately by the platform).
 */

export interface DetCtx {
  company: Company;
  docs: DocumentRecord[];
  facts: ExtractedFact[];
  objects: ObjectOfIssue[];
  analysis: AnalysisResult | null;
  row: CoverageRow;
}

// ── formatting helpers ───────────────────────────────────────────────────────

const cr = (n: number | null | undefined): string =>
  n == null ? "—" : `₹${Number.isInteger(n) ? n : Number(n.toFixed(2))} Cr`;

const num = (n: number | null | undefined, digits = 2): string =>
  n == null ? "—" : `${Number.isInteger(n) ? n : Number(n.toFixed(digits))}`;

function mdTable(headers: string[], rows: (string | number)[][]): string {
  if (!rows.length) return "";
  const h = `| ${headers.join(" | ")} |`;
  const sep = `| ${headers.map(() => "---").join(" | ")} |`;
  const body = rows.map((r) => `| ${r.map((c) => String(c)).join(" | ")} |`).join("\n");
  return `${h}\n${sep}\n${body}`;
}

const para = (...lines: (string | false | null | undefined)[]) =>
  lines.filter(Boolean).join("\n\n");

// ── fact / financial access ──────────────────────────────────────────────────

const live = (facts: ExtractedFact[]) => facts.filter((f) => f.status !== "REJECTED");

function factStr(facts: ExtractedFact[], key: string, fy?: string): string | null {
  const f = live(facts).find((x) => x.factKey === key && (fy ? x.financialYear === fy : true));
  return f ? f.normalizedValue : null;
}

const emptyFin = (fy: string): FinancialYear => ({
  fy, revenueCr: null, patCr: null, ebitdaCr: null, netWorthCr: null,
  borrowingsCr: null, receivablesCr: null, cfoCr: null,
});

/** Year-wise financials: the structured profile table first, else rebuilt from facts. */
function finRows(ctx: DetCtx): FinancialYear[] {
  const fromProfile = ctx.company.financials.filter(
    (f) => f.revenueCr != null || f.patCr != null || f.netWorthCr != null
  );
  if (fromProfile.length) return fromProfile;

  const byFy = new Map<string, FinancialYear>();
  const NUM_KEYS = new Set<keyof FinancialYear>([
    "revenueCr", "patCr", "ebitdaCr", "netWorthCr", "borrowingsCr", "receivablesCr", "cfoCr",
  ]);
  // Prefer audited/restated financial statements over tax records (whose "turnover"
  // can be read as revenue): apply higher-priority facts last so they win.
  const catOf = new Map(ctx.docs.map((d) => [d.id, d.category]));
  const prio = (f: ExtractedFact) => {
    const cat = catOf.get(f.documentId);
    return cat === "Restated Financials" ? 3 : cat === "Financial Statements" || cat === "Audit Report" ? 2 : cat === "Tax Returns" ? 0 : 1;
  };
  const ordered = live(ctx.facts).slice().sort((a, b) => prio(a) - prio(b));
  for (const f of ordered) {
    if (!f.financialYear || !NUM_KEYS.has(f.factKey as keyof FinancialYear)) continue;
    const row = byFy.get(f.financialYear) ?? emptyFin(f.financialYear);
    const n = parseFloat(f.normalizedValue);
    if (isFinite(n)) (row[f.factKey as keyof FinancialYear] as number | null) = n;
    byFy.set(f.financialYear, row);
  }
  return [...byFy.values()].sort((a, b) => a.fy.localeCompare(b.fy));
}

const latestFin = (rows: FinancialYear[]) =>
  rows.filter((r) => r.revenueCr != null || r.patCr != null).slice(-1)[0] ?? rows.slice(-1)[0] ?? null;

const location = (c: Company) => [c.city, c.state].filter(Boolean).join(", ");

// ── section composers ────────────────────────────────────────────────────────

function coverPage(ctx: DetCtx): string {
  const c = ctx.company;
  const cin = c.cin || factStr(ctx.facts, "cin");
  const rows: string[][] = [];
  if (c.issueSizeCr != null) rows.push(["Total issue size", cr(c.issueSizeCr)]);
  if (c.freshIssueCr != null) rows.push(["Fresh issue", cr(c.freshIssueCr)]);
  if (c.ofsCr != null) rows.push(["Offer for sale", cr(c.ofsCr)]);
  rows.push(["Proposed listing", c.proposedListingExchange || "SME platform (NSE Emerge / BSE SME)"]);

  return para(
    `This Draft Offer Document relates to the proposed initial public offering of equity shares of **${c.name}**${cin ? ` (Corporate Identity Number ${cin})` : ""}${c.industry ? `, a company engaged in ${c.industry}` : ""}${location(c) ? `, having its registered office at ${location(c)}` : ""}.`,
    rows.length ? mdTable(["Particulars", "Details"], rows) : "",
    "This is an AI-assisted draft prepared for review by a SEBI-registered merchant banker and legal counsel. It is not an offer document, has not been filed with SEBI or any stock exchange, and must not be used to invite any offer to subscribe for or purchase securities. Investment in equity and equity-related securities involves a degree of risk, and investors should not invest any funds in this offer unless they can afford to take the risk of losing their investment."
  );
}

function summaryOffer(ctx: DetCtx): string {
  const c = ctx.company;
  const rows = finRows(ctx);
  const l = latestFin(rows);
  const finTbl = rows.length
    ? mdTable(
        ["Financial Year", "Revenue", "EBITDA", "PAT", "Net worth"],
        rows.map((r) => [r.fy, cr(r.revenueCr), cr(r.ebitdaCr), cr(r.patCr), cr(r.netWorthCr)])
      )
    : "";
  const objTotal = ctx.objects.reduce((s, o) => s + o.amountCr, 0);

  return para(
    `**Our Company**`,
    `${c.name}${c.yearOfIncorporation ? `, incorporated in ${c.yearOfIncorporation},` : ""} is engaged in ${c.industry || "its business"}${location(c) ? ` and operates from ${location(c)}` : ""}.${c.promoterName ? ` The company is promoted by ${c.promoterName}${c.promoterExperienceYears ? `, who has approximately ${c.promoterExperienceYears} years of experience in the business` : ""}.` : ""}`,
    l ? `**Summary financial information**` : "",
    finTbl,
    `**The Offer**`,
    c.issueSizeCr != null
      ? `The proposed offer aggregates up to ${cr(c.issueSizeCr)}${c.freshIssueCr != null ? `, comprising a fresh issue of up to ${cr(c.freshIssueCr)}` : ""}${c.ofsCr ? ` and an offer for sale of up to ${cr(c.ofsCr)}` : ""}, proposed to be listed on the ${c.proposedListingExchange || "SME platform"}.`
      : `The final offer structure will be confirmed with the merchant banker.`,
    objTotal > 0
      ? `The net proceeds of the fresh issue are proposed to be utilised towards ${ctx.objects.map((o) => o.category).filter(Boolean).join(", ")}, aggregating ${cr(objTotal)}, as detailed in "Objects of the Issue".`
      : "",
    `Prospective investors should read this document together with the section "Risk Factors" and "Outstanding Litigation and Material Developments" before making any investment decision.`
  );
}

function summaryFinancials(ctx: DetCtx): string {
  const rows = finRows(ctx);
  if (!rows.length) return "";
  return para(
    `The following is a summary of the restated financial information for the reported financial years, derived from the extracted facts. These figures are subject to examination by a peer-reviewed auditor as part of the restated financial statements.`,
    mdTable(
      ["Particulars (₹ Cr)", ...rows.map((r) => r.fy)],
      [
        ["Revenue from operations", ...rows.map((r) => num(r.revenueCr))],
        ["EBITDA", ...rows.map((r) => num(r.ebitdaCr))],
        ["Profit after tax", ...rows.map((r) => num(r.patCr))],
        ["Net worth", ...rows.map((r) => num(r.netWorthCr))],
        ["Total borrowings", ...rows.map((r) => num(r.borrowingsCr))],
        ["Trade receivables", ...rows.map((r) => num(r.receivablesCr))],
        ["Cash flow from operations", ...rows.map((r) => num(r.cfoCr))],
      ]
    )
  );
}

/** Company-specific risk bullets, shared by "Risk Factors" and its summary. */
function riskBullets(ctx: DetCtx): string[] {
  const c = ctx.company;
  const rows = finRows(ctx);
  const l = latestFin(rows);
  const risks: string[] = [];

  if (c.top3CustomerPct != null && c.top3CustomerPct > 25)
    risks.push(`**Customer concentration.** Our top three customers contributed approximately ${c.top3CustomerPct}% of revenue. The loss of, or a significant reduction in business from, any of these customers could materially and adversely affect our results of operations.`);

  if (l?.receivablesCr != null && l?.revenueCr) {
    const days = Math.round((l.receivablesCr / l.revenueCr) * 365);
    if (days > 75)
      risks.push(`**Working capital and receivables.** Our trade receivables of ${cr(l.receivablesCr)} in ${l.fy} represent an operating cycle of approximately ${days} days. Any delay in collection could adversely affect our liquidity and working capital position.`);
  }

  if (l?.borrowingsCr != null && l?.netWorthCr) {
    const de = Number((l.borrowingsCr / l.netWorthCr).toFixed(2));
    if (de > 0.6)
      risks.push(`**Indebtedness.** As at ${l.fy} we had total borrowings of ${cr(l.borrowingsCr)} against a net worth of ${cr(l.netWorthCr)}, a debt-to-equity ratio of ${de}x. Our financing agreements contain restrictive covenants, and our ability to service debt depends on our operating performance.`);
  }

  if (l?.cfoCr != null && l?.patCr != null && l.patCr > 0 && l.cfoCr < l.patCr * 0.85)
    risks.push(`**Cash flow quality.** Our cash flow from operations of ${cr(l.cfoCr)} in ${l.fy} was lower than our profit after tax of ${cr(l.patCr)} for the year, reflecting investment in working capital. A sustained divergence could affect our ability to fund operations from internal accruals.`);

  for (const r of ctx.analysis?.rptRisks ?? [])
    risks.push(`**Related-party transactions.** We have entered into related-party transactions${r.amountCr ? ` aggregating ${cr(r.amountCr)}` : ""} with ${r.entityName}. Such transactions involve potential conflicts of interest, and there can be no assurance that they have been or will be on an arm's-length basis.`);

  const demand = factStr(ctx.facts, "demandNoticeCr");
  const litNote = c.pendingLitigationNote;
  if (demand || (litNote && !/no pending|nil/i.test(litNote)))
    risks.push(`**Outstanding litigation.** There are outstanding proceedings involving our company${demand ? `, including a demand of ${cr(parseFloat(demand))}` : ""}. An adverse outcome could result in liabilities and divert management attention. Refer to "Outstanding Litigation and Material Developments".`);

  // standard SME issue risks (always applicable, not company-invented)
  risks.push(`**SME platform liquidity.** The equity shares are proposed to be listed on the SME platform, where trading volumes may be limited. Investors may be unable to sell their shares at the desired price or time.`);
  risks.push(`**Market-making dependence.** Trading is supported by a mandatory market-making arrangement for a limited period. The absence of active market making thereafter could affect liquidity and price discovery.`);
  return risks;
}

function riskFactors(ctx: DetCtx): string {
  const risks = riskBullets(ctx);
  return para(
    `The following risk factors are derived from our own financial and operating data. Prospective investors should carefully consider each of the following, together with the other information in this document, before making an investment decision.`,
    risks.map((r, i) => `${i + 1}. ${r}`).join("\n\n")
  );
}

function theIssue(ctx: DetCtx): string {
  const c = ctx.company;
  const rows: string[][] = [];
  if (c.issueSizeCr != null) rows.push(["Total issue size", cr(c.issueSizeCr)]);
  if (c.freshIssueCr != null) rows.push(["Fresh issue", cr(c.freshIssueCr)]);
  if (c.ofsCr != null) rows.push(["Offer for sale", cr(c.ofsCr)]);
  rows.push(["Proposed listing", c.proposedListingExchange || "SME platform"]);
  return para(
    `The present offer is being made in terms of the applicable SEBI (Issue of Capital and Disclosure Requirements) Regulations for issues on the SME platform.`,
    rows.length ? mdTable(["Particulars", "Details"], rows) : "",
    `The number of equity shares and the issue price will be finalised in consultation with the merchant banker prior to filing. Pre-issue and post-issue shareholding will be presented in "Capital Structure".`
  );
}

function capitalStructure(ctx: DetCtx): string {
  const c = ctx.company;
  const authCap = factStr(ctx.facts, "authorisedCapitalCr");
  const rows: string[][] = [];
  if (authCap) rows.push(["Authorised share capital", cr(parseFloat(authCap))]);
  if (c.freshIssueCr != null) rows.push(["Fresh issue (this offer)", cr(c.freshIssueCr)]);
  return para(
    `The details of our share capital and its build-up are set out below. The authorised, issued, subscribed and paid-up capital, and the effect of this offer, will be finalised with the merchant banker.`,
    rows.length ? mdTable(["Particulars", "Amount"], rows) : "",
    `Promoter's contribution and the applicable lock-in will be computed in accordance with the SEBI ICDR Regulations for SME issues and disclosed in the final offer document.`
  );
}

function objectsOfIssue(ctx: DetCtx): string {
  const objs = ctx.objects;
  if (!objs.length)
    return `The objects of the issue and the proposed deployment of net proceeds will be set out here once the fund-utilisation plan is finalised.`;
  const total = objs.reduce((s, o) => s + o.amountCr, 0);
  const tbl = mdTable(
    ["Object of the Issue", "Amount", "Deployment", "Evidence"],
    objs.map((o) => [o.category || "—", cr(o.amountCr), o.deploymentTimeline || "As per schedule", o.evidence || "To be evidenced"])
  );
  const warnings = objs.filter((o) => o.warning).map((o) => `- ${o.category}: ${o.warning}`);
  return para(
    `The net proceeds of the fresh issue are proposed to be utilised as set out below. The requirements below are based on management estimates and, where applicable, on quotations and computations forming part of the record.`,
    tbl,
    `The total proposed deployment aggregates ${cr(total)}. The means of finance is the fresh issue of equity shares; any shortfall or surplus will be met from internal accruals. Deployment of the net proceeds will be monitored in accordance with applicable requirements.`,
    warnings.length ? `**Matters requiring confirmation**\n\n${warnings.join("\n")}` : ""
  );
}

function basisForPrice(ctx: DetCtx): string {
  const rows = finRows(ctx);
  const l = latestFin(rows);
  const ronw = l?.patCr != null && l?.netWorthCr ? Number(((l.patCr / l.netWorthCr) * 100).toFixed(2)) : null;
  const body: string[][] = [];
  if (l?.patCr != null) body.push(["Restated profit after tax", cr(l.patCr)]);
  if (l?.netWorthCr != null) body.push(["Net worth", cr(l.netWorthCr)]);
  if (ronw != null) body.push(["Return on net worth", `${ronw}%`]);
  return para(
    `The issue price will be determined by the company in consultation with the merchant banker on the basis of an assessment of market demand and the qualitative and quantitative factors described below.`,
    body.length ? mdTable(["Parameter", "Value"], body) : "",
    `Earnings per share, net asset value per share and the price-to-earnings multiple will be computed on the final share capital, and a peer comparison (P/E, EV/EBITDA, RoNW) will be provided by the merchant banker to justify the proposed price band.`
  );
}

function ourBusiness(ctx: DetCtx): string {
  const c = ctx.company;
  const lease = factStr(ctx.facts, "leaseValidTill");
  return para(
    `${c.name} is engaged in ${c.industry || "its business operations"}${location(c) ? `, with operations based in ${location(c)}` : ""}.`,
    c.yearOfIncorporation ? `The company has been in operation since ${c.yearOfIncorporation}${c.promoterName ? `, under the stewardship of its promoter ${c.promoterName}${c.promoterExperienceYears ? ` (approximately ${c.promoterExperienceYears} years of industry experience)` : ""}` : ""}.` : "",
    c.top3CustomerPct != null ? `Our customer base includes long-standing relationships; our top three customers contributed approximately ${c.top3CustomerPct}% of revenue in the most recent reported year.` : "",
    lease ? `Our principal operating facility is held under a lease valid until ${lease}.` : "",
    `A detailed description of our products, manufacturing facilities, capacity, customers and suppliers will be confirmed by the promoter and reviewed by the merchant banker.`
  );
}

function ourManagement(ctx: DetCtx): string {
  const c = ctx.company;
  const din = factStr(ctx.facts, "din");
  return para(
    `Our board of directors is responsible for the overall management of the company.`,
    c.promoterName ? `${c.promoterName} is the Managing Director${din ? ` (DIN ${din})` : ""}${c.promoterExperienceYears ? `, with approximately ${c.promoterExperienceYears} years of experience in the business` : ""}.` : "",
    `**Governance**`,
    `Independent directors: ${c.independentDirectorsAppointed === true ? "appointed" : c.independentDirectorsAppointed === false ? "not yet appointed" : "to be confirmed"}. Audit committee: ${c.auditCommitteeConstituted === true ? "constituted" : c.auditCommitteeConstituted === false ? "not yet constituted" : "to be confirmed"}.`,
    `The full composition of the board, key managerial personnel and board committees, along with their terms, will be confirmed prior to filing.`
  );
}

function promoters(ctx: DetCtx): string {
  const c = ctx.company;
  const din = factStr(ctx.facts, "din");
  const pan = factStr(ctx.facts, "pan");
  const entities = ctx.docs.flatMap((d) => (d.fields?.rptEntityNames as string[] | undefined) ?? []);
  const uniqEntities = [...new Set(entities)].slice(0, 6);
  return para(
    `Our promoter is ${c.promoterName || "to be confirmed"}${din ? ` (DIN ${din})` : ""}${pan ? `, PAN ${pan}` : ""}.${c.promoterExperienceYears ? ` The promoter has approximately ${c.promoterExperienceYears} years of experience in ${c.industry || "the business"}.` : ""}`,
    uniqEntities.length ? `**Promoter group / related entities identified**\n\n${uniqEntities.map((e) => `- ${e}`).join("\n")}` : "",
    `The complete promoter group, their shareholding and interests will be confirmed by the promoter and verified as part of the due-diligence process.`
  );
}

function relatedParty(ctx: DetCtx): string {
  const rptAmt = factStr(ctx.facts, "rptPurchasesCr");
  const loan = factStr(ctx.facts, "promoterLoanCr");
  const rows: string[][] = [];
  for (const r of ctx.analysis?.rptRisks ?? [])
    rows.push([r.entityName, r.relationship, r.amountCr ? cr(r.amountCr) : "—"]);
  if (!rows.length && rptAmt) rows.push(["Related party", "Disclosed related party", cr(parseFloat(rptAmt))]);
  return para(
    `Details of related-party transactions, as identified from the record, are set out below. These are subject to reconciliation with the restated financial statements and confirmation of the arm's-length basis.`,
    rows.length ? mdTable(["Counterparty", "Relationship", "Amount"], rows) : "No material related-party transactions were identified from the available records.",
    loan ? `An unsecured loan of ${cr(parseFloat(loan))} from a promoter-group source is on record; its terms, origin and utilisation require prominent disclosure and, where proceeds are proposed to repay it, a legal opinion.` : "",
    `The pricing methodology relative to independent vendors and the approval trail (including audit-committee ratification) will be disclosed in the final offer document.`
  );
}

function litigation(ctx: DetCtx): string {
  const c = ctx.company;
  const demand = factStr(ctx.facts, "demandNoticeCr");
  const note = c.pendingLitigationNote;
  const hasMatter = !!demand || (!!note && !/no pending|nil/i.test(note));
  if (!hasMatter)
    return `Based on the declarations and records available, there is no material outstanding litigation against the company, its promoters or directors. This position will be confirmed by a signed litigation declaration and verified during due diligence.`;
  return para(
    `The following outstanding matters have been identified from the record and require disclosure:`,
    note ? `- ${note}` : demand ? `- A demand/penalty of ${cr(parseFloat(demand))} is on record.` : "",
    demand && note && !note.includes(demand) ? `- A demand/penalty of ${cr(parseFloat(demand))} appears in the tax/legal records.` : "",
    `Each matter must be disclosed with its forum, amount and current status, and the litigation declaration reconciled against the detected notices before filing. Any inconsistency between a "NIL" declaration and a detected demand is a material item to be resolved.`
  );
}

function approvals(ctx: DetCtx): string {
  const gstin = factStr(ctx.facts, "gstin");
  const licenseDocs = ctx.docs.filter((d) => d.category === "Licenses & Approvals");
  const lines = licenseDocs.map((d) => `- ${d.fileName}`);
  return para(
    `The company holds the licenses and approvals required for its operations, as evidenced by the uploaded records.`,
    gstin ? `GST registration: ${gstin}.` : "",
    lines.length ? `**Evidenced approvals**\n\n${lines.join("\n")}` : "",
    `The complete schedule of approvals, with registration numbers and validity dates, will be tabulated and any pending or expiring approvals highlighted before filing.`
  );
}

function materialContracts(ctx: DetCtx): string {
  const contractDocs = ctx.docs.filter((d) => d.category === "Contracts");
  const lease = factStr(ctx.facts, "leaseValidTill");
  const lines = contractDocs.map((d) => `- ${d.fileName}`);
  return para(
    `The following material contracts and documents are available for inspection and form part of the record:`,
    lines.length ? lines.join("\n") : "The material contracts will be listed once the underlying agreements are provided.",
    lease ? `The principal facility lease is valid until ${lease}.` : "",
    `In addition, the standard documents for inspection (constitutional documents, board and shareholder resolutions, auditor's consents and material agreements) will be made available at the registered office.`
  );
}

function declaration(ctx: DetCtx): string {
  const c = ctx.company;
  return para(
    `We hereby declare that all relevant provisions of the Companies Act, 2013 and the guidelines, regulations and rules issued by the Government of India and the Securities and Exchange Board of India, as applicable, have been complied with, and that no statement made in this draft document is contrary thereto.`,
    `We further declare that this is an AI-assisted draft prepared for professional review and does not constitute a filing.`,
    `Signed for and on behalf of **${c.name}**${c.promoterName ? ` by ${c.promoterName}, Managing Director` : ""}.`
  );
}

// ── front matter ─────────────────────────────────────────────────────────────

function issueProgramme(ctx: DetCtx): string {
  return para(
    `The issue programme is tentative and will be finalised in consultation with the lead manager and the stock exchange.`,
    mdTable(["Event", "Date"], [
      ["Anchor / market maker arrangements", "To be notified"],
      ["Issue opens", "To be notified"],
      ["Issue closes", "To be notified"],
      ["Finalisation of basis of allotment", "To be notified"],
      ["Initiation of refunds / credit of shares", "To be notified"],
      ["Commencement of trading", "To be notified"],
    ]),
    `${ctx.company.name || "The company"} may, in consultation with the lead manager, revise the issue programme in accordance with applicable law.`
  );
}

function issuerResponsibility(ctx: DetCtx): string {
  const c = ctx.company;
  return para(
    `**${c.name || "The Issuer"}**, having made all reasonable inquiries, accepts responsibility for and confirms that this draft document contains all information with regard to the company and the issue which is material in the context of the issue; that the information contained herein is true and correct in all material aspects and is not misleading in any material respect; that the opinions and intentions expressed herein are honestly held; and that there are no other facts, the omission of which makes this document as a whole or any of such information or the expression of any such opinions or intentions misleading in any material respect.`
  );
}

function listingDetails(ctx: DetCtx): string {
  const c = ctx.company;
  return para(
    `The equity shares offered through this draft document are proposed to be listed on the **${c.proposedListingExchange || "SME platform (NSE Emerge / BSE SME)"}**. In-principle approval for listing of the equity shares will be obtained from the stock exchange prior to filing.`,
    `For the purposes of the issue, the designated stock exchange will be identified in the final offer document.`
  );
}

function generalRisk(): string {
  return para(
    `**General Risks**`,
    `Investment in equity and equity-related securities involves a degree of risk and investors should not invest any funds in this issue unless they can afford to take the risk of losing their investment. Investors are advised to read the risk factors carefully before taking an investment decision in this issue. For taking an investment decision, investors must rely on their own examination of the issuer and the issue, including the risks involved.`,
    `The equity shares have not been recommended or approved by the Securities and Exchange Board of India (SEBI), nor does SEBI guarantee the accuracy or adequacy of the contents of the offer document. Specific attention of the investors is invited to the section titled "Risk Factors".`
  );
}

function intermediaries(ctx: DetCtx): string {
  return para(
    `The following intermediaries have been / will be appointed for the purposes of the issue. Their details will be completed upon appointment and set out in the final offer document.`,
    mdTable(["Intermediary", "Name & Registration"], [
      ["Lead Manager to the Issue", "To be appointed"],
      ["Registrar to the Issue", "To be appointed"],
      ["Market Maker", "To be appointed"],
      ["Banker(s) to the Issue", "To be appointed"],
      ["Statutory / Peer-reviewed Auditor", "To be confirmed"],
      ["Legal Counsel to the Issue", "To be appointed"],
    ]),
    `${ctx.company.name || "The company"} will enter into the requisite agreements (issue agreement, registrar agreement, market-making agreement) with the appointed intermediaries.`
  );
}

function tableOfContents(ctx: DetCtx): string {
  // the export renders its own TOC; this section records the document plan
  void ctx;
  return para(
    `The offer document is organised as follows:`,
    [
      "- Front Matter — cover page, issue programme, responsibility statements, listing details and general risks",
      "- Section I — General: definitions, conventions and forward-looking statements",
      "- Section II — Summary of the offer document",
      "- Section III — Risk Factors",
      "- Section IV — Introduction: the issue, general information, capital structure, objects, basis for issue price and tax benefits",
      "- Section V — About the Company: industry, business, regulations, history, management, promoters, group companies, related-party transactions and dividend policy",
      "- Section VI — Financial Information: restated financial statements, other financial information, indebtedness, MD&A, capitalisation and KPIs",
      "- Section VII — Legal and Other Information: litigation, approvals and statutory disclosures",
      "- Section VIII — Issue-related Information: terms, structure, procedure and market making",
      "- Section IX — Main Provisions of the Articles of Association",
      "- Section X — Other Information: material contracts, documents for inspection and declaration",
    ].join("\n")
  );
}

// ── Section I — General ──────────────────────────────────────────────────────

function definitions(ctx: DetCtx): string {
  const c = ctx.company;
  return para(
    `**Company-related terms**`,
    mdTable(["Term", "Description"], [
      [`"our Company", "the Issuer", "we", "us"`, c.name || "The issuer company"],
      [`"Promoter"`, c.promoterName || "As identified in this document"],
      [`"Board" / "Board of Directors"`, `The board of directors of ${c.name || "the company"}`],
      [`"Registered Office"`, location(c) || "As stated in the General Information section"],
    ]),
    `**Issue-related terms**`,
    mdTable(["Term", "Description"], [
      [`"Issue" / "Offer"`, `The initial public offering of equity shares${c.issueSizeCr != null ? ` aggregating up to ${cr(c.issueSizeCr)}` : ""}`],
      [`"Fresh Issue"`, c.freshIssueCr != null ? `Fresh issue of equity shares aggregating up to ${cr(c.freshIssueCr)}` : "The fresh issue component of the offer"],
      [`"Offer for Sale"`, c.ofsCr ? `Offer for sale of equity shares aggregating up to ${cr(c.ofsCr)} by the promoter selling shareholders` : "Not applicable / as stated in the issue structure"],
      [`"Issue Price"`, "The price at which equity shares are allotted, determined with the lead manager"],
      [`"SME Platform"`, c.proposedListingExchange || "NSE Emerge / BSE SME"],
    ]),
    `**Conventional / general terms** — "SEBI" means the Securities and Exchange Board of India; "SEBI ICDR Regulations" means the SEBI (Issue of Capital and Disclosure Requirements) Regulations, 2018, as amended; "Companies Act" means the Companies Act, 2013; "RoC" means the jurisdictional Registrar of Companies; "FY / Fiscal" means the financial year ending March 31.`
  );
}

function conventions(ctx: DetCtx): string {
  const rows = finRows(ctx);
  return para(
    `In this document, unless the context otherwise requires, references to the financial year or fiscal are to the twelve-month period ended March 31 of that year. All financial amounts are presented in ₹ crore and, unless stated otherwise, are derived from the ${rows.length ? `financial statements for ${rows.map((r) => r.fy).join(", ")}` : "company's financial statements"}, which are subject to restatement and examination by a peer-reviewed auditor.`,
    `Figures have been rounded to two decimal places; totals may reflect rounding differences. Certain operational data (capacities, counts, percentages) are based on management records and certifications.`
  );
}

function forwardLooking(): string {
  return para(
    `This document contains certain "forward-looking statements", which may be identified by words such as "anticipate", "believe", "expect", "estimate", "intend", "plan", "propose", "will" or other words of similar import. All statements regarding expected financial condition, results of operations, business plans and prospects are forward-looking statements.`,
    `Forward-looking statements are subject to risks, uncertainties and assumptions, including those described in "Risk Factors". Actual results could differ materially from those contemplated. The company, the promoter and the intermediaries do not undertake any obligation to update forward-looking statements, except as required by applicable law and stock-exchange requirements.`
  );
}

// ── Section II — Summary ─────────────────────────────────────────────────────

function summaryIndustry(ctx: DetCtx): string {
  const c = ctx.company;
  const indDocs = ctx.docs.filter((d) => d.category === "Industry / Business Overview");
  return para(
    c.industry
      ? `The company operates in the ${c.industry} sector in India. Industry positioning, market size and demand drivers are summarised in "Industry Overview".`
      : `The industry positioning of the company will be summarised here from the industry material on record.`,
    indDocs.length
      ? `The industry description in this document is based on the following material on record: ${indDocs.map((d) => d.fileName).join("; ")}. A licensed industry report should replace this material before filing.`
      : `An industry report from a recognised agency is recommended to support this section before filing.`
  );
}

function summaryBusiness(ctx: DetCtx): string {
  const c = ctx.company;
  const lease = factStr(ctx.facts, "leaseValidTill");
  return para(
    `${c.name || "The company"} is engaged in ${c.industry || "its business"}${location(c) ? `, operating from ${location(c)}` : ""}.${c.yearOfIncorporation ? ` It has been in operation since ${c.yearOfIncorporation}.` : ""}${c.promoterName ? ` The business is led by ${c.promoterName}${c.promoterExperienceYears ? ` (${c.promoterExperienceYears} years of experience)` : ""}.` : ""}`,
    c.top3CustomerPct != null ? `The top three customers contributed approximately ${c.top3CustomerPct}% of revenue in the most recent reported year.` : "",
    lease ? `The principal operating facility is held under a lease valid until ${lease}.` : "",
    `A detailed description appears in "Our Business".`
  );
}

function summaryObjects(ctx: DetCtx): string {
  const objs = ctx.objects;
  if (!objs.length)
    return `The objects of the issue will be summarised here once the fund-utilisation plan is finalised in the Objects Builder.`;
  const total = objs.reduce((s, o) => s + o.amountCr, 0);
  return para(
    `The net proceeds of the fresh issue are proposed to be utilised as follows:`,
    mdTable(["Object", "Amount"], [
      ...objs.map((o) => [o.category || "—", cr(o.amountCr)]),
      ["**Total**", `**${cr(total)}**`],
    ]),
    `Details, deployment schedule and supporting evidence appear in "Objects of the Issue".`
  );
}

function summaryLitigation(ctx: DetCtx): string {
  const c = ctx.company;
  const demand = factStr(ctx.facts, "demandNoticeCr");
  const note = c.pendingLitigationNote;
  const hasMatter = !!demand || (!!note && !/no pending|nil/i.test(note));
  return para(
    hasMatter
      ? `There are outstanding matters involving the company${demand ? `, including a demand/penalty of ${cr(parseFloat(demand))} on record` : ""}. A summary of each matter, with forum and status, appears in "Outstanding Litigation and Material Developments".`
      : `Based on the declarations and records available, there is no material outstanding litigation involving the company, its promoter or directors. This position is subject to verification during due diligence.`,
    note && hasMatter ? `Declared position: ${note}` : ""
  );
}

function summaryRisks(ctx: DetCtx): string {
  const titles = riskBullets(ctx)
    .map((r) => (r.match(/\*\*(.+?)\*\*/)?.[1] ?? r).replace(/\.$/, ""))
    .slice(0, 5);
  return para(
    `The following are the principal risks relevant to an investment in the issue. Each is described in detail in "Risk Factors":`,
    titles.map((t, i) => `${i + 1}. ${t}`).join("\n")
  );
}

// ── Section III — Risk Factors (external / issue / engine-derived) ──────────

function externalRisks(ctx: DetCtx): string {
  const ind = ctx.company.industry || "the industry in which we operate";
  return para(
    `The following external risks apply to ${ind} and to Indian SMEs generally:`,
    [
      `1. **Input cost volatility.** Fluctuations in raw-material, energy and logistics costs could compress margins if increases cannot be passed on to customers.`,
      `2. **Competition.** ${ind.charAt(0).toUpperCase() + ind.slice(1)} is competitive and fragmented; competition from organised and unorganised players could affect volumes and pricing.`,
      `3. **Regulatory changes.** Changes in laws, taxation (including GST), environmental and labour regulations, or in industry-specific policies, could increase compliance costs or restrict operations.`,
      `4. **Macroeconomic conditions.** Adverse changes in economic growth, interest rates, inflation or liquidity in India could reduce demand and increase financing costs.`,
      `5. **Force majeure and disruptions.** Natural calamities, pandemics or supply-chain disruptions could interrupt operations.`,
    ].join("\n\n")
  );
}

function issueRisks(ctx: DetCtx): string {
  const c = ctx.company;
  const items = [
    `1. **No prior public market.** There has been no formal market for the equity shares prior to the issue; an active or sustained trading market may not develop.`,
    `2. **SME platform liquidity.** Trading on the SME platform is typically less liquid than on the main board; the trading lot requirements may further limit participation.`,
    `3. **Price volatility.** The issue price may not be indicative of the market price after listing, which may fluctuate significantly.`,
    `4. **Market-making dependence.** Liquidity support is provided by the market maker for a limited period as mandated for SME issues.`,
  ];
  if (c.ofsCr) items.push(`5. **Offer-for-sale component.** ${cr(c.ofsCr)} of the issue is an offer for sale, the proceeds of which go to the selling shareholders and not to the company.`);
  return para(`Risks specific to the issue and to listing on the SME platform:`, items.join("\n\n"));
}

function engineRisks(ctx: DetCtx): string {
  const gaps = (ctx.analysis?.gaps ?? []).filter(
    (g) => (g.severity === "Critical" || g.severity === "High") && g.status !== "Resolved"
  );
  if (!gaps.length)
    return `No additional High or Critical findings are currently open in the rule engine. Candidate risk factors surfaced by the analysis will appear here as the record evolves.`;
  return para(
    `The following candidate risk factors are derived from open findings of the deterministic rule engine over the company's own record. Each requires professional review before inclusion:`,
    gaps.slice(0, 8).map((g, i) => `${i + 1}. **${g.title}** (${g.severity}) — ${g.explanation}`).join("\n\n")
  );
}

// ── Section IV — Introduction (general info / tax benefits) ─────────────────

function generalInformation(ctx: DetCtx): string {
  const c = ctx.company;
  const cin = c.cin || factStr(ctx.facts, "cin");
  const brDate = factStr(ctx.facts, "boardResolutionDate");
  const rows: string[][] = [];
  if (c.name) rows.push(["Issuer", c.name]);
  if (cin) rows.push(["Corporate Identity Number", cin]);
  if (location(c)) rows.push(["Registered office", location(c)]);
  if (c.yearOfIncorporation) rows.push(["Year of incorporation", String(c.yearOfIncorporation)]);
  rows.push(["Registrar of Companies", "Jurisdictional RoC (as per the certificate of incorporation)"]);
  return para(
    rows.length ? mdTable(["Particulars", "Details"], rows) : "",
    brDate
      ? `The issue has been authorised by a resolution of the board of directors dated ${brDate}, and by the shareholders by special resolution.`
      : `The board and shareholders' resolutions authorising the issue will be referenced here from the corporate approvals on record.`,
    `The company secretary and compliance officer, and details of the intermediaries, will be stated in the final offer document.`
  );
}

function taxBenefits(ctx: DetCtx): string {
  return para(
    `The statement of possible special tax benefits available to ${ctx.company.name || "the company"} and its shareholders under the Income-tax Act, 1961 and other applicable tax laws is required to be certified by the statutory auditor and will be annexed to the offer document.`,
    `The statement is intended as general information; each investor is advised to consult their own tax advisor with respect to the tax consequences of an investment in the issue. There are no special tax benefits identified other than those available under the general provisions of law, unless certified otherwise by the auditor.`
  );
}

// ── Section V — About the Company ────────────────────────────────────────────

function industryOverview(ctx: DetCtx): string {
  const c = ctx.company;
  const indDocs = ctx.docs.filter((d) => d.category === "Industry / Business Overview");
  const excerpt = indDocs[0]?.extractedSummary;
  return para(
    c.industry
      ? `The company operates in the ${c.industry} sector. The structure, demand drivers and competitive landscape of this sector form the context for the company's operations and growth plans.`
      : `The industry context will be described here from the industry material on record.`,
    indDocs.length
      ? `Industry material on record: ${indDocs.map((d) => d.fileName).join("; ")}.${excerpt ? ` ${excerpt}` : ""}`
      : "",
    `Industry data in the final offer document should be sourced from a licensed report of a recognised industry research agency, with the source, date and methodology cited alongside each data point.`
  );
}

function keyRegulations(ctx: DetCtx): string {
  const gstin = factStr(ctx.facts, "gstin");
  const licenseDocs = ctx.docs.filter((d) => d.category === "Licenses & Approvals");
  return para(
    `The company's operations are governed, inter alia, by the following key statutes and regulations, in addition to industry-specific requirements:`,
    [
      "- Companies Act, 2013 and rules thereunder",
      "- Goods and Services Tax framework (CGST/SGST/IGST Acts)" + (gstin ? ` — GST registration ${gstin} on record` : ""),
      "- Income-tax Act, 1961",
      "- Factories Act, 1948 and state factory rules (where manufacturing operations are carried on)",
      "- Environmental statutes — Water (Prevention & Control of Pollution) Act, Air (Prevention & Control of Pollution) Act and consents thereunder",
      "- Labour and employment legislation (EPF, ESI, gratuity, minimum wages and allied laws)",
      "- Micro, Small and Medium Enterprises Development Act, 2006 (Udyam registration, where applicable)",
    ].join("\n"),
    licenseDocs.length
      ? `Licenses and registrations evidenced on record: ${licenseDocs.map((d) => d.fileName).join("; ")}. The complete schedule with validity dates appears in "Government and Other Statutory Approvals".`
      : `The applicable licenses and their validity will be evidenced in "Government and Other Statutory Approvals".`
  );
}

function history(ctx: DetCtx): string {
  const c = ctx.company;
  const cin = c.cin || factStr(ctx.facts, "cin");
  const authCap = factStr(ctx.facts, "authorisedCapitalCr");
  const constDocs = ctx.docs.filter((d) => d.category === "Constitutional");
  return para(
    `${c.name || "The company"} was incorporated${c.yearOfIncorporation ? ` in ${c.yearOfIncorporation}` : ""}${cin ? ` under Corporate Identity Number ${cin}` : ""}${location(c) ? `, with its registered office at ${location(c)}` : ""}.`,
    authCap ? `The authorised share capital of the company is ${cr(parseFloat(authCap))}.` : "",
    constDocs.length ? `Constitutional documents on record: ${constDocs.map((d) => d.fileName).join("; ")}.` : "",
    `Key milestones, changes in the registered office, amendments to the memorandum of association and the capital build-up history will be tabulated from the corporate records prior to filing.`
  );
}

function corporateGovernance(ctx: DetCtx): string {
  const c = ctx.company;
  const govDocs = ctx.docs.filter((d) => d.category === "Governance");
  return para(
    `The company is committed to adopting corporate-governance practices as required for listed SMEs, including the constitution of the board committees prescribed under the Companies Act, 2013 and the SEBI Listing Regulations (as applicable to SME-listed entities).`,
    mdTable(["Governance element", "Status"], [
      ["Independent directors", c.independentDirectorsAppointed === true ? "Appointed" : c.independentDirectorsAppointed === false ? "Not yet appointed" : "To be confirmed"],
      ["Audit committee", c.auditCommitteeConstituted === true ? "Constituted" : c.auditCommitteeConstituted === false ? "Not yet constituted" : "To be confirmed"],
      ["Nomination & remuneration committee", govDocs.length ? "Evidenced in governance records" : "To be confirmed"],
      ["Stakeholders' relationship committee", govDocs.length ? "Evidenced in governance records" : "To be confirmed"],
    ]),
    govDocs.length ? `Governance documents on record: ${govDocs.map((d) => d.fileName).join("; ")}.` : ""
  );
}

function groupCompanies(ctx: DetCtx): string {
  const entities = [...new Set(ctx.docs.flatMap((d) => (d.fields?.rptEntityNames as string[] | undefined) ?? []))]
    .filter((e) => e.toLowerCase() !== (ctx.company.name || "").toLowerCase())
    .slice(0, 8);
  return para(
    entities.length
      ? `The following entities have been identified from the record and require promoter confirmation of their classification as group companies / promoter-group entities:`
      : `No group companies have been identified from the available records. The promoter is required to confirm whether any entities qualify as group companies under the SEBI ICDR Regulations.`,
    entities.length ? entities.map((e) => `- ${e}`).join("\n") : "",
    entities.length ? `For each confirmed group company, the offer document must disclose its nature of business, financial summary and any pending litigation.` : ""
  );
}

function dividendPolicy(ctx: DetCtx): string {
  const declared = factStr(ctx.facts, "dividendDeclared");
  return para(
    declared
      ? `Dividend position as per the record: ${declared}.`
      : `Based on the records available, the company has not declared any dividend during the reported financial years.`,
    `The declaration and payment of dividends, if any, will be recommended by the board of directors and approved by the shareholders, at their discretion, subject to the provisions of the articles of association and the Companies Act, 2013. Future dividends will depend on revenues, profits, cash flow, financial condition, capital requirements and other factors.`
  );
}

// ── Section VI — Financial Information ───────────────────────────────────────

function restatedFinancials(ctx: DetCtx): string {
  const restated = ctx.docs.filter((d) => d.category === "Restated Financials");
  const summary = summaryFinancials(ctx);
  return para(
    restated.length
      ? `The restated financial statements, examined by a peer-reviewed auditor, are on record (${restated.map((d) => d.fileName).join("; ")}) and form the basis of the financial information in this document.`
      : `Restated financial statements examined by a peer-reviewed auditor are **mandatory** for the offer document and are not yet on record. The audited financial statements available have been used to prepare the interim summary below; they must be restated before filing.`,
    summary
  );
}

// year-wise ratio helpers
function ratioRows(ctx: DetCtx): { fy: string; revGrowth: number | null; ebitdaMargin: number | null; patMargin: number | null; ronw: number | null; de: number | null; recvDays: number | null }[] {
  const rows = finRows(ctx);
  return rows.map((r, i) => {
    const prev = rows[i - 1];
    return {
      fy: r.fy,
      revGrowth: prev?.revenueCr && r.revenueCr != null ? Number((((r.revenueCr - prev.revenueCr) / prev.revenueCr) * 100).toFixed(1)) : null,
      ebitdaMargin: r.revenueCr && r.ebitdaCr != null ? Number(((r.ebitdaCr / r.revenueCr) * 100).toFixed(1)) : null,
      patMargin: r.revenueCr && r.patCr != null ? Number(((r.patCr / r.revenueCr) * 100).toFixed(1)) : null,
      ronw: r.netWorthCr && r.patCr != null ? Number(((r.patCr / r.netWorthCr) * 100).toFixed(1)) : null,
      de: r.netWorthCr && r.borrowingsCr != null ? Number((r.borrowingsCr / r.netWorthCr).toFixed(2)) : null,
      recvDays: r.revenueCr && r.receivablesCr != null ? Math.round((r.receivablesCr / r.revenueCr) * 365) : null,
    };
  });
}

function otherFinancialInfo(ctx: DetCtx): string {
  const ratios = ratioRows(ctx);
  if (!ratios.length) return "";
  const pct = (v: number | null) => (v == null ? "—" : `${v}%`);
  return para(
    `The following accounting ratios are computed strictly from the extracted financial figures. Per-share metrics (EPS, NAV per share) will be computed once the share capital structure is finalised.`,
    mdTable(
      ["Ratio (formula)", ...ratios.map((r) => r.fy)],
      [
        ["Return on net worth (PAT ÷ net worth)", ...ratios.map((r) => pct(r.ronw))],
        ["EBITDA margin (EBITDA ÷ revenue)", ...ratios.map((r) => pct(r.ebitdaMargin))],
        ["PAT margin (PAT ÷ revenue)", ...ratios.map((r) => pct(r.patMargin))],
        ["Debt-equity (borrowings ÷ net worth)", ...ratios.map((r) => (r.de == null ? "—" : `${r.de}x`))],
      ]
    )
  );
}

function indebtedness(ctx: DetCtx): string {
  const rows = finRows(ctx);
  const loan = factStr(ctx.facts, "promoterLoanCr");
  const bankDocs = ctx.docs.filter((d) => d.category === "Banking");
  return para(
    `The company's borrowings, as per the record, are summarised below. The detailed schedule (lender-wise sanction, outstanding, security and covenants) will be compiled from sanction letters and loan agreements.`,
    rows.some((r) => r.borrowingsCr != null)
      ? mdTable(["Financial Year", "Total borrowings"], rows.filter((r) => r.borrowingsCr != null).map((r) => [r.fy, cr(r.borrowingsCr)]))
      : "No borrowing figures are available on the record yet.",
    loan ? `An unsecured loan of ${cr(parseFloat(loan))} from a promoter-group source is on record and is disclosed separately in "Related Party Transactions".` : "",
    bankDocs.length ? `Banking documents on record: ${bankDocs.map((d) => d.fileName).join("; ")}.` : ""
  );
}

function mdAndA(ctx: DetCtx): string {
  const rows = finRows(ctx);
  const paras: string[] = [];
  for (let i = 1; i < rows.length; i++) {
    const a = rows[i - 1], b = rows[i];
    const bits: string[] = [];
    if (a.revenueCr && b.revenueCr != null) {
      const g = Number((((b.revenueCr - a.revenueCr) / a.revenueCr) * 100).toFixed(1));
      bits.push(`revenue ${g >= 0 ? "increased" : "decreased"} by ${Math.abs(g)}% from ${cr(a.revenueCr)} to ${cr(b.revenueCr)}`);
    }
    if (a.patCr != null && b.patCr != null && a.patCr !== 0) {
      const g = Number((((b.patCr - a.patCr) / Math.abs(a.patCr)) * 100).toFixed(1));
      bits.push(`profit after tax moved from ${cr(a.patCr)} to ${cr(b.patCr)} (${g >= 0 ? "+" : ""}${g}%)`);
    }
    if (b.cfoCr != null) bits.push(`cash flow from operations was ${cr(b.cfoCr)}`);
    if (bits.length) paras.push(`**${b.fy} compared with ${a.fy}.** In ${b.fy}, ${bits.join("; ")}.`);
  }
  const anomalies = (ctx.analysis?.financialChecks ?? []).filter((f) => f.severity === "High" || f.severity === "Medium");
  return para(
    `The following discussion of the results of operations and financial condition is based on the extracted financial figures and should be read together with the restated financial statements.`,
    paras.join("\n\n"),
    anomalies.length
      ? `**Matters requiring management explanation**\n\n${anomalies.map((a) => `- ${a.checkName}: ${a.explanation}`).join("\n")}`
      : "",
    `Management's explanations for period-on-period movements, unusual items and known trends will be confirmed by the promoter and reviewed by the merchant banker.`
  );
}

function capitalisation(ctx: DetCtx): string {
  const rows = finRows(ctx);
  const l = latestFin(rows);
  const de = l?.netWorthCr && l?.borrowingsCr != null ? Number((l.borrowingsCr / l.netWorthCr).toFixed(2)) : null;
  return para(
    `The capitalisation of the company, pre-issue, based on the latest reported figures${l ? ` (${l.fy})` : ""}:`,
    l
      ? mdTable(["Particulars", "Pre-issue", "Post-issue"], [
          ["Total borrowings", cr(l.borrowingsCr), "To be computed"],
          ["Net worth", cr(l.netWorthCr), "To be computed"],
          ["Debt / equity", de == null ? "—" : `${de}x`, "To be computed"],
        ])
      : "Pre-issue figures will be presented from the restated statements.",
    `The post-issue capitalisation will be computed on completion of the issue, based on the final issue price and allotment.`
  );
}

function kpis(ctx: DetCtx): string {
  const ratios = ratioRows(ctx);
  if (!ratios.length) return "";
  return para(
    `Key performance indicators computed from the extracted figures:`,
    mdTable(
      ["KPI", ...ratios.map((r) => r.fy)],
      [
        ["Revenue growth (YoY)", ...ratios.map((r) => (r.revGrowth == null ? "—" : `${r.revGrowth}%`))],
        ["EBITDA margin", ...ratios.map((r) => (r.ebitdaMargin == null ? "—" : `${r.ebitdaMargin}%`))],
        ["PAT margin", ...ratios.map((r) => (r.patMargin == null ? "—" : `${r.patMargin}%`))],
        ["Return on net worth", ...ratios.map((r) => (r.ronw == null ? "—" : `${r.ronw}%`))],
        ["Receivable days", ...ratios.map((r) => (r.recvDays == null ? "—" : String(r.recvDays)))],
        ["Debt-equity", ...ratios.map((r) => (r.de == null ? "—" : `${r.de}x`))],
      ]
    ),
    `KPIs must be certified and reconciled to the restated financial statements before filing.`
  );
}

// ── Section VII — Legal (other statutory disclosures) ───────────────────────

function otherRegulatory(ctx: DetCtx): string {
  const brDate = factStr(ctx.facts, "boardResolutionDate");
  const rows = finRows(ctx);
  const l = latestFin(rows);
  return para(
    `**Authority for the issue.** ${brDate ? `The issue has been authorised by the board of directors by resolution dated ${brDate} and by the shareholders by special resolution.` : `The board and shareholders' resolutions authorising the issue are to be referenced from the corporate approvals on record.`}`,
    `**Eligibility.** The company proposes to list on the SME platform under Chapter IX of the SEBI ICDR Regulations.${l?.netWorthCr != null ? ` The latest reported net worth is ${cr(l.netWorthCr)}.` : ""}${rows.filter((r) => (r.ebitdaCr ?? 0) > 0).length >= 2 ? ` The company has positive operating profit (EBITDA) in at least two of the preceding financial years, as reflected in the record.` : ""} Compliance with the eligibility criteria of the relevant exchange will be confirmed by the lead manager.`,
    `**Prohibition.** Neither the company, nor its promoter or directors, is debarred from accessing the capital markets by SEBI, based on the declarations and KYC records available; this is subject to verification during due diligence.`,
    `**Disclaimer clauses.** The prescribed disclaimer clauses of SEBI and the stock exchange will be reproduced verbatim in the final offer document.`,
    `**Filing, listing and consents.** The offer document will be filed with the stock exchange and SEBI as required; consents of the directors, auditor and intermediaries will be obtained and referenced.`
  );
}

// ── Section VIII — Issue Information ─────────────────────────────────────────

function termsOfIssue(ctx: DetCtx): string {
  const c = ctx.company;
  return para(
    `The equity shares being offered are subject to the provisions of the Companies Act, 2013, the SEBI ICDR Regulations, the memorandum and articles of association, and the terms of this document and the application form.`,
    mdTable(["Particulars", "Terms"], [
      ["Instrument", "Equity shares of the company"],
      ["Face value", "To be stated (typically ₹10 per share)"],
      ["Issue price", "To be determined with the lead manager"],
      ["Issue size", c.issueSizeCr != null ? cr(c.issueSizeCr) : "To be finalised"],
      ["Ranking", "Pari passu with existing equity shares, including dividends"],
      ["Trading lot", "As prescribed for the SME platform"],
    ]),
    `The equity shares will be issued in dematerialised form, and trading shall be in dematerialised form only.`
  );
}

function issueStructure(ctx: DetCtx): string {
  const c = ctx.company;
  return para(
    `The issue is structured in accordance with the requirements applicable to SME issues:`,
    mdTable(["Component", "Allocation"], [
      ["Market maker reservation", "As prescribed for SME issues (typically up to 5% of the issue)"],
      ["Net issue — retail individual investors", "Not less than 50% of the net issue"],
      ["Net issue — other investors (including QIB/NII)", "Balance of the net issue"],
    ]),
    c.issueSizeCr != null ? `The total issue aggregates up to ${cr(c.issueSizeCr)}${c.freshIssueCr != null ? `, of which the fresh issue is up to ${cr(c.freshIssueCr)}` : ""}${c.ofsCr ? ` and the offer for sale is up to ${cr(c.ofsCr)}` : ""}.` : "",
    `The final structure, minimum application size and lot size will be set out in the final offer document as per the exchange's requirements.`
  );
}

function issueProcedure(): string {
  return para(
    `All applicants must apply through the **Application Supported by Blocked Amount (ASBA)** process, including through the UPI mechanism where applicable, by which the application amount is blocked in the applicant's bank account and debited only upon allotment.`,
    [
      "- Applications may be submitted through self-certified syndicate banks (SCSBs), the syndicate, registered brokers, registrar and share transfer agents and depository participants, as applicable.",
      "- Retail individual investors may use the UPI mechanism through recognised applications.",
      "- Allotment will be made in dematerialised form only; applicants must hold a demat account.",
      "- No separate refund process arises under ASBA; blocked amounts are released on finalisation of the basis of allotment.",
    ].join("\n"),
    `The detailed issue procedure, including application forms, payment instructions and grounds for rejection, will follow the standard SME issue procedure prescribed by SEBI and the exchange.`
  );
}

function foreignOwnership(ctx: DetCtx): string {
  const ind = ctx.company.industry;
  return para(
    `Foreign investment in Indian companies is governed by the Foreign Exchange Management Act, 1999 (FEMA), the rules and regulations thereunder, and the consolidated FDI policy issued by the Government of India.`,
    `Foreign direct investment is permitted up to the sectoral cap applicable to the company's activities${ind ? ` (${ind})` : ""}, under the automatic or approval route as applicable. Investments by persons resident outside India must also comply with the pricing, reporting and other conditions under FEMA.`,
    `Eligibility of NRIs, FPIs and other non-resident categories to participate in the issue will be set out in the final offer document in accordance with applicable law.`
  );
}

function marketMaking(ctx: DetCtx): string {
  return para(
    `In accordance with the requirements for SME issues, ${ctx.company.name || "the company"} will, through the lead manager, enter into a market-making agreement with a SEBI-registered market maker for the equity shares.`,
    [
      "- The market maker will provide two-way quotes for the prescribed period (generally three years from listing).",
      "- The market maker's inventory, spread and presence requirements will follow the exchange's market-making framework for the SME platform.",
      "- A portion of the issue is reserved for the market maker as required.",
    ].join("\n"),
    `The name of the market maker and the terms of the arrangement will be disclosed in the final offer document.`
  );
}

function basisOfAllotment(): string {
  return para(
    `The basis of allotment will be finalised in consultation with the designated stock exchange in accordance with the SEBI ICDR Regulations.`,
    [
      "- Allotment to retail individual investors will not be less than the minimum application size, subject to availability, with proportionate allotment or lottery in case of oversubscription as prescribed.",
      "- Allotment to other categories will be on a proportionate basis within each category.",
      "- The market maker reservation portion will be allotted to the market maker.",
      "- Unsubscribed portions may be spilled over between categories as permitted.",
    ].join("\n")
  );
}

function utilisationOfProceeds(ctx: DetCtx): string {
  const objs = ctx.objects;
  const total = objs.reduce((s, o) => s + o.amountCr, 0);
  return para(
    `The board of directors certifies that:`,
    [
      `- all monies received out of the issue shall be credited/transferred to a separate bank account,`,
      `- details of all monies utilised out of the issue shall be disclosed under an appropriate head in the balance sheet indicating the purpose for which such monies were utilised,`,
      `- details of all unutilised monies out of the issue, if any, shall be disclosed under an appropriate separate head indicating the form in which such unutilised monies have been invested,`,
      `- pending utilisation, the net proceeds will be deposited only with scheduled commercial banks.`,
    ].join("\n"),
    objs.length ? `The proceeds are proposed to be applied to the objects aggregating ${cr(total)}, as set out in "Objects of the Issue"${objs.some((o) => o.warning) ? `; items flagged for confirmation are listed there` : ""}.` : "",
    `Interim use and monitoring of the proceeds will comply with the SEBI ICDR Regulations applicable to SME issues.`
  );
}

// ── Section IX — AoA ────────────────────────────────────────────────────────

function aoaProvisions(ctx: DetCtx): string {
  const authCap = factStr(ctx.facts, "authorisedCapitalCr");
  const constDocs = ctx.docs.filter((d) => d.category === "Constitutional");
  return para(
    constDocs.length
      ? `The articles of association are on record (${constDocs.map((d) => d.fileName).join("; ")}). The main provisions relevant to shareholders include those relating to share capital and variation of rights, transfer and transmission of shares, general meetings and voting rights, dividends, borrowing powers and the appointment and rotation of directors.`
      : `The main provisions of the articles of association — relating to share capital, transfer of shares, general meetings, voting rights, dividends, borrowing powers and directors — will be summarised here once the articles are on record.`,
    authCap ? `The authorised share capital as per the record is ${cr(parseFloat(authCap))}.` : "",
    `A clause-wise summary of the articles must be prepared by legal counsel prior to filing.`
  );
}

// generic composer for any other blueprint section
function generic(s: BlueprintSection, ctx: DetCtx): string {
  const sf = live(ctx.facts).filter(
    (f) => s.requiredFacts.includes(f.factKey) || s.helpfulFacts.includes(f.factKey) || f.linkedProspectusSections.includes(s.sectionName)
  );
  const facts = [...new Map(sf.map((f) => [`${f.factKey}|${f.financialYear ?? ""}`, f])).values()].slice(0, 20);
  const bullets = facts.map((f) => `- ${f.factLabel}${f.financialYear ? ` (${f.financialYear})` : ""}: ${f.normalizedValue}${f.unit ? ` ${f.unit}` : ""}`);
  return para(
    `This section addresses ${s.purpose.charAt(0).toLowerCase() + s.purpose.slice(1)}`,
    bullets.length ? `Based on the extracted facts:\n\n${bullets.join("\n")}` : "",
    `The full content of this section will be finalised from the supporting documents and reviewed by the merchant banker.`
  );
}

// ── dispatch ─────────────────────────────────────────────────────────────────

const COMPOSERS: Record<string, (ctx: DetCtx) => string> = {
  // front matter
  "fm-1": coverPage,
  "fm-2": issueProgramme,
  "fm-3": issuerResponsibility,
  "fm-4": listingDetails,
  "fm-5": generalRisk,
  "fm-6": intermediaries,
  "fm-7": tableOfContents,
  // Section I — General
  "g-1": definitions,
  "g-2": conventions,
  "g-3": forwardLooking,
  // Section II — Summary
  "s-1": summaryOffer,
  "s-2": summaryIndustry,
  "s-3": summaryBusiness,
  "s-4": summaryFinancials,
  "s-5": summaryObjects,
  "s-6": summaryLitigation,
  "s-7": summaryRisks,
  // Section III — Risk Factors
  "r-1": riskFactors,
  "r-2": externalRisks,
  "r-3": issueRisks,
  "r-4": engineRisks,
  // Section IV — Introduction
  "i-1": theIssue,
  "i-2": summaryFinancials,
  "i-3": generalInformation,
  "i-4": capitalStructure,
  "i-5": objectsOfIssue,
  "i-6": basisForPrice,
  "i-7": taxBenefits,
  // Section V — About the Company
  "c-1": industryOverview,
  "c-2": ourBusiness,
  "c-3": keyRegulations,
  "c-4": history,
  "c-5": ourManagement,
  "c-6": corporateGovernance,
  "c-7": promoters,
  "c-8": groupCompanies,
  "c-9": relatedParty,
  "c-10": dividendPolicy,
  // Section VI — Financial Information
  "f-1": restatedFinancials,
  "f-2": otherFinancialInfo,
  "f-3": indebtedness,
  "f-4": mdAndA,
  "f-5": capitalisation,
  "f-6": kpis,
  // Section VII — Legal
  "l-1": litigation,
  "l-2": approvals,
  "l-3": otherRegulatory,
  // Section VIII — Issue Information
  "x-1": termsOfIssue,
  "x-2": issueStructure,
  "x-3": issueProcedure,
  "x-4": foreignOwnership,
  "x-5": marketMaking,
  "x-6": basisOfAllotment,
  "x-7": utilisationOfProceeds,
  // Sections IX / X
  "a-1": aoaProvisions,
  "o-1": materialContracts,
  "o-2": declaration,
};

/** Compose a section's text deterministically. Returns "" only if nothing can be said. */
export function generateSectionDeterministic(s: BlueprintSection, ctx: DetCtx): string {
  const fn = COMPOSERS[s.sectionId];
  const text = (fn ? fn(ctx) : generic(s, ctx)).trim();
  return text;
}
