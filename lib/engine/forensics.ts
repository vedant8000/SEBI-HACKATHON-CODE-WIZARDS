import type {
  Company, DocumentRecord, FinancialCheck, ObjectOfIssue, RptRisk,
} from "../types";
import type { IntegritySignal, IntegrityScore } from "../types";

/**
 * Disclosure-Integrity engine.
 *
 * This does NOT detect fraud and makes no accusation. It scores the INTERNAL
 * CONSISTENCY and earnings-quality of the numbers the promoter has themselves
 * reported, the same sniff-test a merchant banker or exchange reviewer applies
 * to a first-time SME before a DRHP is filed. Every signal is derived from data
 * the rule engine already computed (cash-flow conversion, receivable spikes,
 * margin jumps, RPT concentration, use-of-proceeds) plus a light Benford
 * first-digit check. The output tells the promoter what a reviewer will most
 * likely question, so they can prepare the explanation (or fix the disclosure)
 * BEFORE filing, never a verdict of wrongdoing.
 */

const r1 = (n: number) => Math.round(n * 10) / 10;
const pctChange = (a: number, b: number) => (b === 0 ? 0 : Math.round(((a - b) / Math.abs(b)) * 100));

// first significant digit (1-9) of a positive magnitude, else null
function firstDigit(n: number): number | null {
  let x = Math.abs(n);
  if (!isFinite(x) || x === 0) return null;
  while (x < 1) x *= 10;
  while (x >= 10) x /= 10;
  const d = Math.floor(x);
  return d >= 1 && d <= 9 ? d : null;
}

/** Benford expected frequency for leading digit d. */
const benfordExpected = (d: number) => Math.log10(1 + 1 / d);

/**
 * Collect every reported magnitude we can see, audited figures, objects
 * amounts and numbers extracted from uploaded documents, and measure how far
 * the leading-digit distribution sits from Benford's law. With a small sample
 * this is only indicative, so we say so and never deduct hard on it.
 */
function benfordCheck(company: Company, objects: ObjectOfIssue[], docs: DocumentRecord[]) {
  const nums: number[] = [];
  for (const f of company.financials) {
    for (const v of [f.revenueCr, f.patCr, f.ebitdaCr, f.netWorthCr, f.borrowingsCr, f.receivablesCr, f.cfoCr]) {
      if (v != null && v !== 0) nums.push(v);
    }
  }
  for (const o of objects) if (o.amountCr) nums.push(o.amountCr);
  for (const d of docs) {
    for (const raw of d.keyNumbers ?? []) {
      const m = String(raw).replace(/[,₹%x×]/gi, "").match(/-?\d+(\.\d+)?/);
      if (m) { const v = parseFloat(m[0]); if (isFinite(v) && v !== 0) nums.push(v); }
    }
  }

  const digits = nums.map(firstDigit).filter((d): d is number => d != null);
  const n = digits.length;
  if (n < 20) {
    return { checked: false, sampleSize: n, madPct: null as number | null,
      note: `Only ${n} reported figures available, too few for a reliable leading-digit test. Upload more financial documents to enable it.` };
  }
  const counts = new Array(10).fill(0);
  for (const d of digits) counts[d]++;
  let mad = 0;
  for (let d = 1; d <= 9; d++) mad += Math.abs(counts[d] / n - benfordExpected(d));
  mad /= 9;
  const madPct = r1(mad * 100);
  const note =
    mad < 0.012 ? `Leading-digit spread of the reported figures tracks the natural (Benford) distribution (deviation ${madPct}%).`
      : mad < 0.02 ? `Leading-digit spread deviates modestly from the natural distribution (deviation ${madPct}%), usually benign for a small sample, worth an eye.`
        : `Leading-digit spread deviates from the natural distribution (deviation ${madPct}%). With ${n} figures this is only indicative, but reviewers do look for over-rounded numbers.`;
  return { checked: true, sampleSize: n, madPct, note };
}

// small field reader over documents (mirrors analysis.ts)
function docField<T>(docs: DocumentRecord[], key: string): T | undefined {
  for (const d of docs) {
    const v = d.fields?.[key];
    if (v !== undefined && v !== null) return v as T;
  }
  return undefined;
}

export function computeIntegrityScore(
  company: Company,
  docs: DocumentRecord[],
  objects: ObjectOfIssue[],
  ctx: { financialChecks: FinancialCheck[]; rptRisks: RptRisk[] }
): IntegrityScore {
  const fin = company.financials.filter((f) => f.revenueCr !== null);
  const latest = fin[fin.length - 1];
  const prior = fin[fin.length - 2];

  const signals: IntegritySignal[] = [];
  const sig = (
    id: string, label: string, weight: number, status: IntegritySignal["status"],
    frac: number, detail: string, whyItMatters: string, prepare: string
  ) => signals.push({ id, label, weight, status, deduction: r1(weight * frac), detail, whyItMatters, prepare });

  // 1 ── Cash-flow conversion (CFO vs PAT) ──────────────────────────────────
  if (latest?.cfoCr != null && latest?.patCr != null && latest.patCr > 0) {
    const q = Math.round((latest.cfoCr / latest.patCr) * 100);
    const status = q < 60 ? "flag" : q < 85 ? "watch" : "clean";
    sig("cfo-pat", "Cash-flow conversion", 18, status, status === "flag" ? 1 : status === "watch" ? 0.5 : 0,
      `${latest.fy} operating cash flow ₹${latest.cfoCr} Cr is ${q}% of reported profit ₹${latest.patCr} Cr.`,
      "Profit not backed by cash is the first thing a reviewer questions, it can signal aggressive revenue recognition or uncollected sales.",
      "Prepare a receivables ageing schedule and a collection plan; an auditor comfort note on cash conversion helps.");
  } else {
    sig("cfo-pat", "Cash-flow conversion", 18, "na", 0,
      "Cash-flow or profit figures not available for the latest year.",
      "Profit not backed by cash is a classic earnings-quality concern.",
      "Enter CFO and PAT in Company Profile or upload the cash-flow statement.");
  }

  // 2 ── Receivables growing faster than revenue ────────────────────────────
  if (latest?.receivablesCr != null && prior?.receivablesCr != null && latest?.revenueCr != null && prior?.revenueCr != null) {
    const recvG = pctChange(latest.receivablesCr, prior.receivablesCr);
    const revG = pctChange(latest.revenueCr, prior.revenueCr);
    const status = recvG > revG * 1.5 && recvG > 25 ? "flag" : recvG > revG * 1.2 && recvG > 15 ? "watch" : "clean";
    sig("recv-spike", "Receivables vs revenue growth", 16, status, status === "flag" ? 1 : status === "watch" ? 0.5 : 0,
      `Receivables grew ${recvG}% while revenue grew ${revG}% in ${latest.fy}.`,
      "Receivables outrunning sales suggests channel-stuffing or softer-quality revenue booked before collection.",
      "Disclose any change in credit terms, provide a top-10 debtor ageing, and add a receivables risk factor.");
  } else {
    sig("recv-spike", "Receivables vs revenue growth", 16, "na", 0,
      "Two years of receivables and revenue not both available.",
      "Receivables outrunning sales is a common window-dressing signal.",
      "Provide at least two years of receivables and revenue figures.");
  }

  // 3 ── Sudden EBITDA-margin expansion ─────────────────────────────────────
  if (latest?.ebitdaCr != null && latest?.revenueCr && prior?.ebitdaCr != null && prior?.revenueCr) {
    const m = r1((latest.ebitdaCr / latest.revenueCr) * 100);
    const pm = r1((prior.ebitdaCr / prior.revenueCr) * 100);
    const jump = m - pm;
    const status = jump > 8 ? "flag" : jump > 4 ? "watch" : "clean";
    sig("margin-jump", "Pre-IPO margin expansion", 12, status, status === "flag" ? 1 : status === "watch" ? 0.5 : 0,
      `EBITDA margin moved from ${pm}% to ${m}% (${jump >= 0 ? "+" : ""}${r1(jump)} pts) into ${latest.fy}.`,
      "A margin that expands sharply just before an IPO is a textbook dressing-up pattern reviewers probe.",
      "Explain the cost or pricing changes behind the expansion with evidence (contracts, input costs, mix).");
  } else {
    sig("margin-jump", "Pre-IPO margin expansion", 12, "na", 0,
      "Two years of EBITDA and revenue not both available.",
      "Sharp pre-IPO margin expansion is a common dressing-up pattern.",
      "Provide EBITDA and revenue for at least two years.");
  }

  // 4 ── Related-party concentration ────────────────────────────────────────
  if (ctx.rptRisks.length) {
    const max = Math.max(...ctx.rptRisks.map((r) => r.riskScore));
    const status = max > 60 ? "flag" : max > 30 ? "watch" : "clean";
    const top = ctx.rptRisks.slice().sort((a, b) => b.riskScore - a.riskScore)[0];
    sig("rpt", "Related-party concentration", 20, status, status === "flag" ? 1 : status === "watch" ? 0.5 : 0,
      `${ctx.rptRisks.length} related-party signal(s); highest risk ${max}/100, ${top.entityName} (${top.relationship}).`,
      "Undisclosed or unpriced promoter-group dealings are the costliest SME disclosure defect and the strongest fund-diversion signal.",
      "Disclose each RPT with year-wise amounts, arm's-length pricing basis and audit-committee ratification.");
  } else {
    sig("rpt", "Related-party concentration", 20, "na", 0,
      "No related-party register uploaded, so this cannot be assessed, non-detection is not clearance.",
      "Unpriced promoter-group dealings are the strongest fund-diversion signal.",
      "Upload the related-party transaction register so this can be evaluated.");
  }

  // 5 ── Use-of-proceeds vagueness (GCP share) ──────────────────────────────
  const gcpAmt = objects.filter((o) => /general corporate|gcp/i.test(o.category)).reduce((s, o) => s + o.amountCr, 0);
  if (company.issueSizeCr != null && objects.length) {
    const cap = r1(Math.min(0.15 * company.issueSizeCr, 10));
    const status = gcpAmt > cap ? "flag" : gcpAmt > cap * 0.7 ? "watch" : "clean";
    sig("gcp", "Use-of-proceeds specificity", 10, status, status === "flag" ? 1 : status === "watch" ? 0.5 : 0,
      gcpAmt > 0 ? `General Corporate Purpose object is ₹${r1(gcpAmt)} Cr against the ₹${cap} Cr cap (15% / ₹10 Cr).`
        : `No General Corporate Purpose object defined; the applicable cap is ₹${cap} Cr.`,
      "A large, unspecified 'general corporate purposes' bucket reads as vague deployment and invites diversion questions.",
      "Re-allocate the excess to specific, evidenced objects and keep GCP within the cap.");
  } else {
    sig("gcp", "Use-of-proceeds specificity", 10, "na", 0,
      "Objects plan or issue size not defined yet.",
      "Vague use-of-proceeds invites fund-diversion questions.",
      "Complete the Objects Builder and issue size to test this.");
  }

  // 6 ── Promoter-loan repayment from proceeds ──────────────────────────────
  const promoterLoan = docField<number>(docs, "promoterLoanCr");
  const debtObject = objects.find((o) => /debt|repayment|loan/i.test(o.category));
  if (promoterLoan != null && debtObject) {
    sig("promoter-loan", "Promoter-loan repayment from proceeds", 14, "flag", 1,
      `A debt-repayment object of ₹${debtObject.amountCr} Cr coexists with a promoter/related-party loan of ₹${promoterLoan} Cr on record.`,
      "Using IPO proceeds to repay promoter/related-party loans is prohibited and read as indirect fund diversion.",
      "Exclude any promoter/related-party loan from the debt-repayment object; only third-party lender debt may be repaid.");
  } else if (debtObject || promoterLoan != null || objects.length) {
    sig("promoter-loan", "Promoter-loan repayment from proceeds", 14, "clean", 0,
      "No promoter/related-party loan detected among the borrowings proposed for repayment.",
      "Repaying promoter loans from proceeds is prohibited as indirect diversion.",
      "—");
  } else {
    sig("promoter-loan", "Promoter-loan repayment from proceeds", 14, "na", 0,
      "Objects plan not defined yet.",
      "Repaying promoter loans from proceeds is prohibited as indirect diversion.",
      "Build the fund-utilisation plan in Objects Builder.");
  }

  // 7 ── Cross-document numeric consistency ─────────────────────────────────
  const crossNames = /GST turnover|Interest expense|reserves movement|Working capital object/i;
  const crossChecks = ctx.financialChecks.filter((f) => crossNames.test(f.checkName));
  const crossHigh = crossChecks.filter((f) => f.severity === "High").length;
  const crossMed = crossChecks.filter((f) => f.severity === "Medium").length;
  if (crossChecks.length) {
    const status = crossHigh >= 1 ? "flag" : crossMed >= 1 ? "watch" : "clean";
    sig("cross-doc", "Cross-document consistency", 12, status, status === "flag" ? 1 : status === "watch" ? 0.5 : 0,
      status === "clean" ? "Reported figures reconcile across audited books, GST records and the objects plan."
        : `${crossHigh + crossMed} cross-document check(s) need a reconciliation (${crossChecks.filter((f) => f.severity !== "Low").map((f) => f.checkName).join("; ")}).`,
      "Numbers that differ between the books, GST returns and the objects plan are exactly what reviewers reconcile line by line.",
      "Provide auditor-certified reconciliations for each flagged item (GST-to-books, interest, reserves, working capital).");
  } else {
    sig("cross-doc", "Cross-document consistency", 12, "na", 0,
      "Not enough overlapping sources to cross-check (need audited financials plus GST returns / objects evidence).",
      "Numbers differing across sources are a primary reviewer focus.",
      "Upload GST returns and objects evidence alongside audited financials.");
  }

  // 8 ── Document authenticity (structural tamper forensics) ─────────────────
  const authDocs = docs.filter((d) => d.authenticity?.applicable);
  if (authDocs.length) {
    const flagged = authDocs.filter((d) => d.authenticity!.level === "flag");
    const review = authDocs.filter((d) => d.authenticity!.level === "review");
    const status = flagged.length ? "flag" : review.length ? "watch" : "clean";
    sig("doc-authenticity", "Document authenticity", 18, status, status === "flag" ? 1 : status === "watch" ? 0.5 : 0,
      flagged.length
        ? `${flagged.length} of ${authDocs.length} uploaded PDF(s) show structural signs of post-creation editing (e.g. ${flagged[0].fileName}).`
        : review.length
          ? `${review.length} of ${authDocs.length} uploaded PDF(s) warrant an authenticity review (a scan, or metadata modified after creation).`
          : `All ${authDocs.length} uploaded PDF(s) look like single, unedited originals.`,
      "Doctored financials or forged supporting documents are the costliest SME-IPO fraud; catching tampering at the source is direct investor protection.",
      status === "clean" ? "—" : "Obtain the original signed/audited source files and verify the flagged documents before relying on their figures.");
  } else {
    sig("doc-authenticity", "Document authenticity", 18, "na", 0,
      "No PDF documents have been analysed for authenticity yet.",
      "Doctored or forged supporting documents are a primary SME-IPO fraud vector.",
      "Upload the source PDFs (audited financials, bank statements) to run structural tamper forensics.");
  }

  // ── Benford leading-digit check (indicative, low weight) ──────────────────
  const benford = benfordCheck(company, objects, docs);
  if (benford.checked && benford.madPct != null) {
    const status = benford.madPct >= 4 ? "flag" : benford.madPct >= 2 ? "watch" : "clean";
    sig("benford", "Leading-digit (Benford) pattern", 8, status, status === "flag" ? 1 : status === "watch" ? 0.5 : 0,
      benford.note,
      "Naturally occurring financial figures follow a predictable leading-digit spread; heavy deviation can indicate manually set or over-rounded numbers.",
      status === "clean" ? "—" : "No action needed on its own, this only adds weight when other signals also point the same way.");
  } else {
    sig("benford", "Leading-digit (Benford) pattern", 8, "na", 0,
      benford.note,
      "Naturally occurring figures follow a predictable leading-digit spread.",
      "Upload more financial documents to enable this check.");
  }

  // ── Aggregate ─────────────────────────────────────────────────────────────
  const totalDeduction = signals.reduce((s, x) => s + x.deduction, 0);
  const score = Math.max(0, Math.min(100, Math.round(100 - totalDeduction)));
  const flags = signals.filter((s) => s.status === "flag").length;
  const watches = signals.filter((s) => s.status === "watch").length;
  const naCount = signals.filter((s) => s.status === "na").length;

  const band: IntegrityScore["band"] =
    score >= 85 ? "Strong" : score >= 70 ? "Generally consistent" : score >= 50 ? "Several items to address" : "High scrutiny expected";

  const summary =
    flags === 0 && watches === 0
      ? naCount >= 4
        ? "Too little data to assess earnings quality yet, upload financials, the RPT register and objects evidence to compute a meaningful score."
        : "Your reported numbers hang together well, no earnings-quality signals a reviewer would typically flag."
      : `${flags} item(s) a reviewer will likely question and ${watches} to keep an eye on. Prepare the explanations below before the merchant banker review.`;

  return {
    score, band, summary, signals,
    benford,
    disclaimer:
      "This is an internal-consistency and earnings-quality indicator computed from your own reported figures. It is NOT fraud detection and implies no wrongdoing, it surfaces what an exchange reviewer or merchant banker is most likely to question, so you can prepare in advance.",
  };
}
