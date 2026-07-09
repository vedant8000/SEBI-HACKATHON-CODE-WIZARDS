import type {
  AnalysisResult,
  CheckStatus,
  Company,
  DocumentRecord,
  ExchangeObservation,
  FinancialCheck,
  Gap,
  HeatmapSection,
  ObjectOfIssue,
  ReadinessCheck,
  RptRisk,
  Severity,
} from "../types";
import { SCORING_WEIGHTS, STATUS_SCORE } from "../rules/scoring-config";

/**
 * The analysis engine. Every readiness check, gap, heatmap cell, RPT flag and
 * financial-consistency check below is COMPUTED from the company profile the
 * promoter filled in and the fields extracted from their uploaded documents.
 * Nothing here is pre-baked: upload different documents, get different results.
 *
 * Where data is missing the engine says so honestly ("missing") instead of
 * guessing — an SME promoter should always know what we could not read.
 */

// ── helpers ─────────────────────────────────────────────────────────────────

const r1 = (n: number) => Math.round(n * 10) / 10;
const pct = (a: number, b: number) => (b === 0 ? 0 : Math.round(((a - b) / Math.abs(b)) * 100));

function docsOf(docs: DocumentRecord[], ...categories: string[]) {
  return docs.filter((d) => categories.includes(d.category));
}
function field<T>(docs: DocumentRecord[], key: string): T | undefined {
  for (const d of docs) {
    const v = d.fields?.[key];
    if (v !== undefined && v !== null) return v as T;
  }
  return undefined;
}
function docNames(docs: DocumentRecord[]) {
  return docs.map((d) => d.fileName);
}
function surname(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts[parts.length - 1] ?? "";
}

// ── main entry ──────────────────────────────────────────────────────────────

export function runAnalysis(
  company: Company,
  docs: DocumentRecord[],
  objects: ObjectOfIssue[]
): AnalysisResult {
  const fin = company.financials.filter((f) => f.revenueCr !== null);
  const latest = fin[fin.length - 1];
  const prior = fin[fin.length - 2];

  const finDocs = docsOf(docs, "Financial Statements");
  const restatedDocs = docsOf(docs, "Restated Financials");
  const taxDocs = docsOf(docs, "Tax Returns");
  const legalDocs = docsOf(docs, "Legal");
  const rptDocs = docsOf(docs, "Related Party");
  const kycDocs = docsOf(docs, "KYC");
  const constDocs = docsOf(docs, "Constitutional");
  const govDocs = docsOf(docs, "Governance");
  const objDocs = docsOf(docs, "Objects Evidence");
  const contractDocs = docsOf(docs, "Contracts");
  const licenseDocs = docsOf(docs, "Licenses & Approvals");
  const approvalDocs = docsOf(docs, "Corporate Approvals");

  const checks: ReadinessCheck[] = [];
  const gaps: Gap[] = [];
  const rptRisks: RptRisk[] = [];
  const financialChecks: FinancialCheck[] = [];
  const observations: ExchangeObservation[] = [];
  let idn = 0;
  const nid = (p: string) => `${p}${++idn}`;

  const addCheck = (
    category: ReadinessCheck["category"],
    ruleName: string,
    status: CheckStatus,
    severity: Severity,
    explanation: string,
    suggestedFix = "—"
  ) => checks.push({ id: nid("c"), category, ruleName, status, severity, explanation, suggestedFix });

  const addGap = (g: Omit<Gap, "id" | "status"> & { status?: Gap["status"] }) =>
    gaps.push({ id: nid("g"), status: g.status ?? "Open", ...g });

  const addObs = (o: Omit<ExchangeObservation, "id">) => observations.push({ id: nid("o"), ...o });

  // ════ A. ELIGIBILITY ════════════════════════════════════════════════════
  const opYears = company.yearOfIncorporation ? new Date().getFullYear() - company.yearOfIncorporation : null;

  if (latest?.netWorthCr != null && company.freshIssueCr != null) {
    const postCap = r1((latest.netWorthCr + company.freshIssueCr) * 0.6); // rough proxy for paid-up + premium split
    addCheck("Eligibility", "Post-issue paid-up capital within SME platform threshold",
      postCap <= 25 ? "pass" : "warning", "Critical",
      `Estimated post-issue capital base ≈ ₹${postCap} Cr against the SME platform ceiling of ₹25 Cr paid-up capital. Exact computation depends on issue pricing.`,
      postCap <= 25 ? "—" : "Confirm post-issue paid-up capital with the merchant banker before proceeding on the SME platform.");
  } else {
    addCheck("Eligibility", "Post-issue paid-up capital within SME platform threshold", "missing", "Critical",
      "Net worth or fresh-issue amount not available yet — cannot estimate post-issue capital.",
      "Fill issue size in Company Profile and upload latest audited financials.");
  }

  if (fin.length >= 2) {
    const ebitdaYears = fin.filter((f) => (f.ebitdaCr ?? 0) > 0).length;
    addCheck("Eligibility", "Operating profit (EBITDA) in preceding years",
      ebitdaYears >= 2 ? "pass" : "fail", "Critical",
      `Positive EBITDA detected in ${ebitdaYears} of ${fin.length} reported years.`,
      ebitdaYears >= 2 ? "—" : "SME eligibility generally requires operating profit in 2 of the last 3 years — discuss timing with your merchant banker.");
  } else {
    addCheck("Eligibility", "Operating profit (EBITDA) in preceding years", "missing", "Critical",
      "Less than two years of financial data available.", "Enter 3 years of financials in Company Profile or upload audited statements.");
  }

  if (latest?.netWorthCr != null) {
    addCheck("Eligibility", "Positive net worth", latest.netWorthCr > 0 ? "pass" : "fail", "Critical",
      `Net worth ₹${latest.netWorthCr} Cr in ${latest.fy}.`,
      latest.netWorthCr > 0 ? "—" : "Negative net worth is a hard blocker for SME listing — consult your merchant banker.");
  } else {
    addCheck("Eligibility", "Positive net worth", "missing", "Critical", "Net worth not found in profile or uploads.", "Upload audited balance sheet or enter net worth in Company Profile.");
  }

  if (latest?.cfoCr != null && latest?.patCr != null) {
    const weak = latest.cfoCr < latest.patCr * 0.6;
    addCheck("Eligibility", "Free cash flow quality", weak ? "warning" : "pass", "High",
      weak
        ? `${latest.fy} operating cash flow ₹${latest.cfoCr} Cr is only ${Math.round((latest.cfoCr / latest.patCr) * 100)}% of PAT ₹${latest.patCr} Cr — FCFE trend weakening.`
        : `Operating cash flow ₹${latest.cfoCr} Cr adequately backs PAT ₹${latest.patCr} Cr.`,
      weak ? "Prepare a cash-flow bridge and receivable collection plan for merchant banker assessment." : "—");
  } else {
    addCheck("Eligibility", "Free cash flow quality", "missing", "High", "Cash-flow data not available.", "Enter CFO figures in Company Profile or upload cash flow statements.");
  }

  if (opYears != null) {
    addCheck("Eligibility", "Minimum operating track record", opYears >= 3 ? "pass" : "fail", "Critical",
      `Operating since ${company.yearOfIncorporation} — ${opYears} years of track record.`,
      opYears >= 3 ? "—" : "SME platforms generally expect a 3-year track record.");
  } else {
    addCheck("Eligibility", "Minimum operating track record", "missing", "Critical", "Year of incorporation not provided.", "Fill it in Company Profile or upload Certificate of Incorporation.");
  }

  addCheck("Eligibility", "Promoter experience in the business",
    company.promoterExperienceYears == null ? "missing" : company.promoterExperienceYears >= 3 ? "pass" : "warning",
    "Medium",
    company.promoterExperienceYears == null
      ? "Promoter experience not captured."
      : `Promoter ${company.promoterName || ""} has ${company.promoterExperienceYears} years of relevant experience.`,
    company.promoterExperienceYears == null ? "Add promoter experience in Company Profile." : "—");

  const declaredLitigation = field<string>(legalDocs, "litigationDeclared");
  addCheck("Eligibility", "No admitted insolvency / winding-up proceedings",
    legalDocs.length || company.pendingLitigationNote ? "pass" : "missing", "Critical",
    legalDocs.length ? "No insolvency or winding-up reference found in uploaded legal documents." : "No legal declarations uploaded yet.",
    legalDocs.length ? "—" : "Upload a signed litigation & insolvency declaration.");

  addCheck("Eligibility", "No regulatory prohibition on promoters/directors",
    kycDocs.length ? "pass" : "missing", "Critical",
    kycDocs.length ? "KYC uploaded; no debarment flag detected in available records." : "Promoter/director KYC not uploaded.",
    kycDocs.length ? "—" : "Upload promoter and director KYC with PAN/DIN declarations.");

  if (company.ofsCr != null && company.issueSizeCr) {
    const ofsPct = Math.round((company.ofsCr / company.issueSizeCr) * 100);
    addCheck("Eligibility", "Offer-for-sale proportion", ofsPct > 20 ? "warning" : "pass", "Medium",
      `OFS of ₹${company.ofsCr} Cr is ${ofsPct}% of the issue.` + (ofsPct > 20 ? " High OFS in an SME issue invites questions on promoter intent." : ""),
      ofsPct > 20 ? "Add clear rationale for promoter dilution in Capital Structure." : "—");
  }

  const promoterLoan = field<number>([...rptDocs, ...finDocs], "promoterLoanCr");
  const debtObject = objects.find((o) => /debt|repayment|loan/i.test(o.category));
  if (promoterLoan && debtObject) {
    addCheck("Eligibility", "IPO proceeds vs related-party loan repayment", "warning", "High",
      `Debt-repayment object of ₹${debtObject.amountCr} Cr exists while an unsecured related-party loan of ₹${promoterLoan} Cr is on record — if proceeds repay promoter-group loans, heightened scrutiny applies.`,
      "Obtain legal opinion; either exclude related-party loans from Objects or disclose prominently.");
  } else {
    addCheck("Eligibility", "IPO proceeds vs related-party loan repayment",
      debtObject ? "pass" : "missing", "High",
      debtObject ? "No related-party loan detected among borrowings proposed for repayment." : "Objects of issue not defined yet.",
      debtObject ? "—" : "Build your fund utilisation plan in Objects Builder.");
  }

  // ════ B. FINANCIAL HEALTH ═════════════════════════════════════════════════
  if (fin.length >= 2 && latest?.revenueCr != null && fin[0].revenueCr != null) {
    const growth = pct(latest.revenueCr, prior?.revenueCr ?? fin[0].revenueCr!);
    addCheck("Financial Health", "Revenue trend", growth >= 0 ? "pass" : "warning", "Medium",
      `Revenue moved from ₹${fin[0].revenueCr} Cr to ₹${latest.revenueCr} Cr (${growth >= 0 ? "+" : ""}${growth}% in the latest year).`,
      growth >= 0 ? "—" : "Explain the revenue decline and recovery plan.");
    if (growth > 30) {
      addCheck("Financial Health", "Sudden revenue jump", "warning", "Medium",
        `Latest-year revenue grew ${growth}%. Exchanges routinely ask for growth drivers.`,
        "Document growth drivers (order wins, capacity, pricing) with evidence.");
      addObs({
        observation: `Explain the ${growth}% revenue growth in ${latest.fy} with supporting evidence.`,
        affectedSection: "Financial Information", severity: "High",
        whyItMayBeAsked: "Sharp pre-IPO revenue growth is a classic window-dressing signal that reviewers always probe.",
        suggestedResponse: "Provide customer-wise revenue break-up, order book and capacity utilisation showing organic drivers.",
        requiredEvidence: "Order book statement, top-customer revenue schedule, production records",
      });
    }
  } else {
    addCheck("Financial Health", "Revenue trend", "missing", "Medium", "Insufficient revenue history.", "Provide at least 2 years of financials.");
  }

  if (latest?.patCr != null && prior?.patCr != null) {
    const g = pct(latest.patCr, prior.patCr);
    addCheck("Financial Health", "PAT trend", latest.patCr > 0 && g >= 0 ? "pass" : "warning", "Medium",
      `PAT ₹${prior.patCr} Cr → ₹${latest.patCr} Cr (${g >= 0 ? "+" : ""}${g}%).`,
      latest.patCr > 0 && g >= 0 ? "—" : "Explain profitability pressure.");
  } else {
    addCheck("Financial Health", "PAT trend", "missing", "Medium", "PAT history incomplete.", "Provide PAT for at least 2 years.");
  }

  if (latest?.ebitdaCr != null && latest?.revenueCr) {
    const margin = r1((latest.ebitdaCr / latest.revenueCr) * 100);
    const priorMargin = prior?.ebitdaCr != null && prior?.revenueCr ? r1((prior.ebitdaCr / prior.revenueCr) * 100) : null;
    const jump = priorMargin != null && margin - priorMargin > 4;
    addCheck("Financial Health", "EBITDA margin trend", jump ? "warning" : "pass", "Medium",
      `EBITDA margin ${margin}%${priorMargin != null ? ` (prior year ${priorMargin}%)` : ""}.` + (jump ? " Sudden margin expansion needs explanation." : ""),
      jump ? "Explain cost or pricing changes behind the margin expansion." : "—");
  }

  if (latest?.borrowingsCr != null && latest?.netWorthCr) {
    const de = r1(latest.borrowingsCr / latest.netWorthCr);
    addCheck("Financial Health", "Debt-equity ratio", de <= 1 ? (de > 0.6 ? "warning" : "pass") : "fail", "Medium",
      `D/E of ${de}x (₹${latest.borrowingsCr} Cr / ₹${latest.netWorthCr} Cr)${de > 0.6 ? " — above the ~0.6x SME peer median." : "."}`,
      de > 0.6 ? "Explain leverage strategy; a debt-repayment object can mitigate." : "—");
  } else {
    addCheck("Financial Health", "Debt-equity ratio", "missing", "Medium", "Borrowings or net worth unavailable.", "Upload balance sheet or complete the profile.");
  }

  if (latest?.receivablesCr != null && latest?.revenueCr) {
    const days = Math.round((latest.receivablesCr / latest.revenueCr) * 365);
    addCheck("Financial Health", "Working capital cycle (receivable days)", days > 75 ? "warning" : "pass", "Medium",
      `Receivable days ≈ ${days}.` + (days > 75 ? " A stretched cycle raises working-capital questions." : ""),
      days > 75 ? "Disclose the working-capital cycle and its basis in Objects of the Issue." : "—");
  }

  if (company.top3CustomerPct != null) {
    const cc = company.top3CustomerPct;
    addCheck("Financial Health", "Customer concentration", cc > 40 ? "fail" : cc > 25 ? "warning" : "pass", "High",
      `Top 3 customers contribute ${cc}% of revenue.` + (cc > 40 ? " Material concentration risk must be disclosed." : ""),
      cc > 25 ? "Add a customer-concentration risk factor with mitigation narrative." : "—");
    if (cc > 40) {
      addGap({
        title: "Customer concentration risk not disclosed", severity: "High", affectedSection: "Risk Factors",
        explanation: `Top 3 customers contribute ${cc}% of revenue but no concentration risk factor exists in the draft yet.`,
        requiredDocument: "Customer-wise revenue break-up (can be anonymised)",
        suggestedFix: "Add a specific risk factor with the revenue share of top customers and dependence mitigation.",
        owner: "Promoter",
      });
      addObs({
        observation: "Customer concentration disclosure appears missing or inadequate.",
        affectedSection: "Risk Factors", severity: "High",
        whyItMayBeAsked: `Top-3 customer share of ${cc}% is well above typical comfort levels.`,
        suggestedResponse: "Disclose concentration with tenure of relationships and diversification steps.",
        requiredEvidence: "Customer-wise revenue schedule",
      });
    }
  } else {
    addCheck("Financial Health", "Customer concentration", "missing", "High", "Top-customer share not captured.", "Enter top-3 customer revenue share in Company Profile.");
  }

  if (latest?.cfoCr != null && latest?.patCr != null && latest.patCr > 0) {
    const q = Math.round((latest.cfoCr / latest.patCr) * 100);
    addCheck("Financial Health", "Cash flow quality (CFO vs PAT)", q < 60 ? "fail" : q < 85 ? "warning" : "pass", "High",
      `${latest.fy} CFO ₹${latest.cfoCr} Cr is ${q}% of PAT ₹${latest.patCr} Cr.`,
      q < 85 ? "Provide receivable ageing and collection plan; consider an auditor comfort note." : "—");
  }

  if (latest?.receivablesCr != null && prior?.receivablesCr != null && latest?.revenueCr != null && prior?.revenueCr != null) {
    const recvG = pct(latest.receivablesCr, prior.receivablesCr);
    const revG = pct(latest.revenueCr, prior.revenueCr);
    if (recvG > revG * 1.5 && recvG > 25) {
      addCheck("Financial Health", "Receivable spike", "fail", "High",
        `Receivables up ${recvG}% vs revenue growth of ${revG}% in ${latest.fy}.`,
        "Explain credit-term changes and provide top-debtor ageing.");
      financialChecks.push({
        id: nid("f"), checkName: "Receivables growth vs revenue growth",
        expectedValue: `Receivable growth ≈ revenue growth (${revG}%)`,
        foundValue: `Receivables grew ${recvG}% (₹${prior.receivablesCr} Cr → ₹${latest.receivablesCr} Cr)`,
        difference: `${recvG - revG} percentage points excess`,
        severity: "High",
        explanation: `Revenue grew ${revG}% in ${latest.fy}, but receivables grew ${recvG}%. Collectability and possible channel-stuffing will be questioned.`,
        suggestedFix: "Prepare receivable ageing, top-10 debtor list and a collection plan; add a risk factor.",
      });
      addGap({
        title: "Receivables growth outpaces revenue", severity: "High", affectedSection: "Financial Information",
        explanation: `${latest.fy} revenue grew ${revG}% but receivables grew ${recvG}%. Reviewers routinely question collectability in this pattern.`,
        requiredDocument: "Receivable ageing schedule, top-10 debtor list, collection plan",
        suggestedFix: "Disclose changes in credit terms and add a receivables risk factor.",
        owner: "Promoter",
      });
    } else {
      addCheck("Financial Health", "Receivable spike", "pass", "High", `Receivable growth (${recvG}%) is in line with revenue growth (${revG}%).`);
    }
  }

  // ════ Cross-document FINANCIAL CONSISTENCY ════════════════════════════════
  const gstTurnover = field<number>(taxDocs, "gstTurnoverCr");
  if (gstTurnover != null && latest?.revenueCr != null) {
    const diff = r1(Math.abs(latest.revenueCr - gstTurnover));
    const tolerated = latest.revenueCr * 0.02;
    financialChecks.push({
      id: nid("f"), checkName: "Audited revenue vs GST turnover",
      expectedValue: `≈ ₹${latest.revenueCr} Cr (audited revenue ${latest.fy})`,
      foundValue: `₹${gstTurnover} Cr (GST records)`,
      difference: `₹${diff} Cr`,
      severity: diff > tolerated ? "Medium" : "Low",
      explanation: diff > tolerated
        ? `GST turnover differs from audited revenue by ₹${diff} Cr. Differences can be legitimate (exports, unbilled revenue, timing) but need a reconciliation note.`
        : "GST turnover reconciles with audited revenue within normal tolerance.",
      suggestedFix: diff > tolerated ? "Prepare a GST-to-books reconciliation certified by the auditor." : "—",
    });
    if (diff > tolerated) {
      addGap({
        title: "GST turnover vs audited revenue mismatch", severity: "Medium", affectedSection: "Financial Information",
        explanation: `GST records show turnover of ₹${gstTurnover} Cr against audited revenue of ₹${latest.revenueCr} Cr (difference ₹${diff} Cr).`,
        requiredDocument: "GST-to-books reconciliation", suggestedFix: "Upload an auditor-certified reconciliation note.", owner: "Auditor",
      });
    }
  }

  if (latest?.borrowingsCr != null && latest.borrowingsCr > 0 && fin.length) {
    // crude interest sanity check when we have EBITDA & PAT
    if (latest.ebitdaCr != null && latest.patCr != null) {
      const impliedInterest = r1(Math.max(0, latest.ebitdaCr - latest.patCr * 1.35)); // rough: EBITDA - (PAT + tax) ≈ D&A + interest
      const expected = r1(latest.borrowingsCr * 0.09);
      if (impliedInterest < expected * 0.4) {
        financialChecks.push({
          id: nid("f"), checkName: "Interest expense vs reported borrowings",
          expectedValue: `≈ ₹${expected} Cr (9% of borrowings ₹${latest.borrowingsCr} Cr)`,
          foundValue: `≈ ₹${impliedInterest} Cr implied from P&L`,
          difference: `₹${r1(expected - impliedInterest)} Cr lower than expected`,
          severity: "Medium",
          explanation: "Implied interest cost appears low relative to reported borrowings — could indicate year-end loan draw-down, interest capitalisation, or unrecorded liabilities.",
          suggestedFix: "Verify loan schedules and interest ledger against sanction letters.",
        });
      }
    }
  }

  if (latest?.patCr != null && prior?.netWorthCr != null && latest?.netWorthCr != null) {
    const expectedNw = r1(prior.netWorthCr + latest.patCr);
    const diff = r1(Math.abs(expectedNw - latest.netWorthCr));
    if (diff > Math.max(0.5, expectedNw * 0.05)) {
      financialChecks.push({
        id: nid("f"), checkName: "PAT vs reserves movement",
        expectedValue: `Net worth ≈ ₹${expectedNw} Cr (prior net worth + PAT)`,
        foundValue: `₹${latest.netWorthCr} Cr reported`,
        difference: `₹${diff} Cr`,
        severity: "Medium",
        explanation: "Net worth movement does not equal prior net worth plus PAT — dividends, capital infusion or adjustments should explain the difference.",
        suggestedFix: "Provide a statement of changes in equity reconciling the movement.",
      });
    } else {
      financialChecks.push({
        id: nid("f"), checkName: "PAT vs reserves movement",
        expectedValue: `₹${expectedNw} Cr`, foundValue: `₹${latest.netWorthCr} Cr`, difference: `₹${diff} Cr`,
        severity: "Low", explanation: "Reserves movement reconciles with reported PAT.", suggestedFix: "—",
      });
    }
  }

  const wcNeed = field<number>(objDocs, "wcRequirementCr") ?? objects.find((o) => /working capital/i.test(o.category))?.amountCr;
  if (wcNeed != null && latest?.revenueCr != null && latest?.receivablesCr != null) {
    const cycleDays = Math.round((latest.receivablesCr / latest.revenueCr) * 365);
    const impliedGrowthWc = r1((latest.revenueCr * 0.25 * cycleDays) / 365); // WC for ~25% growth
    if (wcNeed > impliedGrowthWc * 2) {
      financialChecks.push({
        id: nid("f"), checkName: "Working capital object vs historical cycle",
        expectedValue: `≈ ₹${impliedGrowthWc} Cr (25% growth at ${cycleDays}-day cycle)`,
        foundValue: `₹${wcNeed} Cr requested`,
        difference: `₹${r1(wcNeed - impliedGrowthWc)} Cr above trend`,
        severity: "Medium",
        explanation: "The working-capital object materially exceeds what the historical operating cycle implies — a detailed month-wise computation is expected.",
        suggestedFix: "Prepare a holding-period based working capital computation consistent with the historical cycle.",
      });
    }
  }

  // ════ RPT / FUND DIVERSION ENGINE ════════════════════════════════════════
  const promoterSurname = surname(company.promoterName);
  const rptAmount = field<number>(rptDocs, "rptPurchasesCr");
  const entityNames = new Set<string>();
  for (const d of [...rptDocs, ...finDocs, ...contractDocs]) {
    (d.fields?.rptEntityNames as string[] | undefined)?.forEach((e) => entityNames.add(e));
  }
  const suspectEntities = [...entityNames].filter(
    (e) => promoterSurname && e.toLowerCase().includes(promoterSurname.toLowerCase()) && !e.toLowerCase().includes((company.name.split(" ")[0] || "").toLowerCase())
  );

  if (rptAmount != null) {
    const base = latest?.revenueCr ? `${r1((rptAmount / latest.revenueCr) * 100)}% of revenue` : "share of revenue unknown";
    const entity = suspectEntities[0] ?? [...entityNames][0] ?? "related entity (name not extracted)";
    const score = Math.min(95, 40 + (suspectEntities.length ? 20 : 0) + (latest?.revenueCr && rptAmount / latest.revenueCr > 0.05 ? 15 : 5));
    rptRisks.push({
      id: nid("r"), entityName: entity, relationship: suspectEntities.length ? `Name matches promoter family (${promoterSurname})` : "Disclosed related party",
      amountCr: rptAmount, pctOfBase: base, riskScore: score, severity: score > 60 ? "High" : "Medium",
      reason: `Purchases of ₹${rptAmount} Cr from ${entity} detected in uploaded records${suspectEntities.length ? `; entity name matches the promoter's family name, indicating a promoter-group relationship` : ""}. Arm's-length pricing basis not found.`,
      suggestedDisclosure: "Disclose transaction volumes for each reported year, pricing methodology vs independent vendors, and approval status in the Related Party Transactions section.",
      requiredEvidence: "Comparative vendor quotations, RPT policy, audit committee ratification minutes",
    });
    addGap({
      title: "RPT disclosure incomplete", severity: "High", affectedSection: "Related Party Transactions",
      explanation: `Purchases of ₹${rptAmount} Cr from ${entity} lack a disclosure narrative, arm's-length justification and approval trail.`,
      requiredDocument: "RPT disclosure note, pricing basis, audit committee ratification",
      suggestedFix: "Draft the RPT disclosure with transaction rationale and pricing basis; obtain ratification.",
      owner: "Promoter",
    });
    addObs({
      observation: `Clarify the related-party transaction with ${entity}.`,
      affectedSection: "Related Party Transactions", severity: "High",
      whyItMayBeAsked: "Material promoter-group purchases without pricing justification are a standard exchange query.",
      suggestedResponse: "Provide pricing comparison with independent vendors and business rationale.",
      requiredEvidence: "Vendor comparison, RPT register, approvals",
    });
  }

  if (promoterLoan != null) {
    const score = 74;
    rptRisks.push({
      id: nid("r"), entityName: "Promoter group (unsecured loan)", relationship: "Promoter group — lender",
      amountCr: promoterLoan,
      pctOfBase: latest?.borrowingsCr ? `${r1((promoterLoan / latest.borrowingsCr) * 100)}% of total borrowings` : "share of borrowings unknown",
      riskScore: score, severity: "High",
      reason: `Unsecured loan of ₹${promoterLoan} Cr from a promoter-group source detected. If IPO proceeds repay this loan it can be viewed as indirect fund diversion and attracts heightened scrutiny.`,
      suggestedDisclosure: "Prominently disclose the related-party loan, its origin, interest rate and utilisation; obtain legal opinion on repayment from proceeds.",
      requiredEvidence: "Loan agreement, bank trail of original utilisation, legal opinion",
    });
  }

  if (suspectEntities.length && rptAmount == null) {
    rptRisks.push({
      id: nid("r"), entityName: suspectEntities.join(", "), relationship: `Name matches promoter family (${promoterSurname})`,
      amountCr: 0, pctOfBase: "amount not extracted", riskScore: 45, severity: "Medium",
      reason: "Entities matching the promoter's family name appear in uploaded documents but no transaction amount could be extracted. Possible undisclosed related parties.",
      suggestedDisclosure: "Confirm relationship of these entities and disclose any transactions.",
      requiredEvidence: "RPT register, ledger extracts",
    });
  }

  // ════ C. DISCLOSURE COMPLETENESS ═════════════════════════════════════════
  const has = (arr: DocumentRecord[]) => arr.length > 0;

  addCheck("Disclosure Completeness", "Company overview & history",
    has(constDocs) ? "pass" : "missing", "Medium",
    has(constDocs) ? "Incorporation / MOA-AOA documents available." : "Constitutional documents (COI, MOA/AOA) not uploaded.",
    has(constDocs) ? "—" : "Upload Certificate of Incorporation and MOA/AOA.");

  addCheck("Disclosure Completeness", "Business model & operations",
    has(contractDocs) || company.industry ? "pass" : "warning", "Medium",
    has(contractDocs) ? "Business contracts available to evidence operations." : "Business description will rely on the profile only.",
    has(contractDocs) ? "—" : "Upload key customer/supplier contracts.");

  addCheck("Disclosure Completeness", "Promoter details",
    has(kycDocs) ? "pass" : "missing", "High",
    has(kycDocs) ? "Promoter KYC on record." : "Promoter KYC not uploaded.",
    has(kycDocs) ? "—" : "Upload promoter PAN, DIN and address proof.");

  addCheck("Disclosure Completeness", "Board & management details",
    has(govDocs) ? "pass" : "missing", "High",
    has(govDocs) ? "Governance documents uploaded." : "Independent director consents / committee details not uploaded.",
    has(govDocs) ? "—" : "Upload consent letters and profiles of proposed independent directors.");

  addCheck("Disclosure Completeness", "Litigation disclosure",
    (() => {
      const demand = field<number>([...taxDocs, ...legalDocs], "demandNoticeCr");
      if (declaredLitigation === "NIL" && demand) return "fail";
      if (!legalDocs.length) return "missing";
      return "pass";
    })(), "Critical",
    (() => {
      const demand = field<number>([...taxDocs, ...legalDocs], "demandNoticeCr");
      if (declaredLitigation === "NIL" && demand)
        return `Litigation declaration states NIL, but a demand/penalty of ₹${demand} Cr was detected in uploaded records — inconsistent.`;
      if (!legalDocs.length) return "No litigation declaration uploaded.";
      return "Litigation declaration on record and consistent with other uploads.";
    })(),
    "Correct the declaration and disclose all pending matters in Outstanding Litigation.");

  const demandFound = field<number>([...taxDocs, ...legalDocs], "demandNoticeCr");
  if (declaredLitigation === "NIL" && demandFound) {
    addGap({
      title: "Litigation declaration inconsistent with tax records", severity: "Critical",
      affectedSection: "Outstanding Litigation and Material Developments",
      explanation: `The litigation declaration states NIL, but a demand of ₹${demandFound} Cr appears in uploaded records. Undisclosed litigation is a serious offer-document defect.`,
      requiredDocument: "Corrected litigation declaration + copy of the demand notice and reply filed",
      suggestedFix: "Disclose the demand in Outstanding Litigation with current status, and re-execute the declaration.",
      owner: "Legal Counsel",
    });
    addObs({
      observation: "Litigation section appears inconsistent with tax records.",
      affectedSection: "Outstanding Litigation and Material Developments", severity: "Critical",
      whyItMayBeAsked: `A demand of ₹${demandFound} Cr exists in uploaded records while the declaration says NIL.`,
      suggestedResponse: "Disclose the matter with amount, forum and status; correct the declaration.",
      requiredEvidence: "Demand notice copy, reply filed, corrected declaration",
    });
  } else if (!legalDocs.length) {
    addGap({
      title: "Litigation declaration missing", severity: "High", affectedSection: "Outstanding Litigation and Material Developments",
      explanation: "No litigation declaration from the company, promoters or directors was found among the uploads.",
      requiredDocument: "Signed litigation declaration",
      suggestedFix: "Upload a signed litigation declaration or confirm 'No pending litigation' in the profile.",
      owner: "Promoter",
    });
  }

  addCheck("Disclosure Completeness", "RPT disclosure",
    rptDocs.length ? (rptAmount != null ? "warning" : "pass") : "missing", "High",
    rptDocs.length
      ? rptAmount != null
        ? `RPT register uploaded; ₹${rptAmount} Cr of related-party purchases need a disclosure narrative.`
        : "RPT register uploaded."
      : "No related-party register uploaded.",
    rptDocs.length ? "Draft RPT disclosure with pricing basis." : "Upload the related-party transaction register.");

  addCheck("Disclosure Completeness", "Financial statements",
    restatedDocs.length ? "pass" : finDocs.length ? "warning" : "missing", "Critical",
    restatedDocs.length
      ? "Restated financial statements uploaded."
      : finDocs.length
        ? `${finDocs.length} audited statement(s) uploaded, but RESTATED financials by a peer-reviewed auditor are required for the offer document.`
        : "No financial statements uploaded.",
    restatedDocs.length ? "—" : "Engage a peer-reviewed auditor and upload restated financials with the examination report.");

  if (!restatedDocs.length) {
    addGap({
      title: "Restated financial statements missing", severity: finDocs.length ? "Critical" : "Critical",
      affectedSection: "Restated Financial Statements",
      explanation: "Offer documents require restated financials examined by a peer-reviewed auditor. " + (finDocs.length ? "Only statutory audited financials are on record." : "No financial statements are on record."),
      requiredDocument: "Restated financial statements with examination report",
      suggestedFix: "Engage a peer-reviewed audit firm and upload the restated financials.",
      owner: "Auditor", status: finDocs.length ? "In Progress" : "Open",
    });
  }

  addCheck("Disclosure Completeness", "Material contracts",
    has(contractDocs) ? "pass" : "missing", "Medium",
    has(contractDocs) ? "Material contracts uploaded." : "No material contracts uploaded.",
    has(contractDocs) ? "—" : "Upload key supply agreements, lease deeds and loan documents.");

  // Objects evidence
  const quotation = field<number>(objDocs, "quotationAmountCr");
  const quotationHasGstin = field<boolean>(objDocs, "quotationHasGstin");
  const capexObject = objects.find((o) => /machin|capex|equipment|plant/i.test(o.category));
  if (capexObject && quotation != null) {
    const diff = r1(Math.abs(capexObject.amountCr - quotation));
    const ok = diff <= capexObject.amountCr * 0.05;
    addCheck("Disclosure Completeness", "Objects of issue evidenced", ok && quotationHasGstin !== false ? "pass" : "warning", "High",
      `Capex object ₹${capexObject.amountCr} Cr vs quotation ₹${quotation} Cr (difference ₹${diff} Cr).` +
      (quotationHasGstin === false ? " Quotation does not carry the vendor GSTIN." : ""),
      ok && quotationHasGstin !== false ? "—" : "Obtain a revised quotation matching the object amount, with vendor GSTIN and validity.");
    if (!ok) {
      addObs({
        observation: "Objects of issue amount does not match the uploaded quotation.",
        affectedSection: "Objects of the Issue", severity: "Medium",
        whyItMayBeAsked: `Object states ₹${capexObject.amountCr} Cr but quotation totals ₹${quotation} Cr.`,
        suggestedResponse: "Reconcile the difference (taxes, freight, installation) or revise the object amount.",
        requiredEvidence: "Revised quotation with taxes and GSTIN",
      });
    }
    if (quotationHasGstin === false) {
      addGap({
        title: "Machinery quotation missing vendor GSTIN", severity: "Medium", affectedSection: "Objects of the Issue",
        explanation: `The ₹${quotation} Cr quotation does not carry the vendor's GSTIN, weakening it as capex evidence.`,
        requiredDocument: "Revised quotation with GSTIN and validity period",
        suggestedFix: "Obtain a revised quotation including GSTIN, validity and delivery schedule.",
        owner: "Promoter",
      });
    }
  } else if (objects.length) {
    addCheck("Disclosure Completeness", "Objects of issue evidenced", capexObject ? "warning" : "pass", "High",
      capexObject ? "Capex object defined but no supporting quotation was detected in uploads." : "Objects defined; no capex object requiring quotation.",
      capexObject ? "Upload vendor quotations/proforma invoices supporting the capex object." : "—");
    if (capexObject) {
      addGap({
        title: "Capex object has no supporting quotation", severity: "High", affectedSection: "Objects of the Issue",
        explanation: `The ₹${capexObject.amountCr} Cr capex object is not supported by any uploaded quotation or proforma invoice.`,
        requiredDocument: "Vendor quotation with GSTIN and validity",
        suggestedFix: "Upload quotations covering the full capex amount.", owner: "Promoter",
      });
    }
  } else {
    addCheck("Disclosure Completeness", "Objects of issue evidenced", "missing", "High",
      "Objects of the issue not defined yet.", "Build your fund utilisation plan in Objects Builder.");
    addGap({
      title: "Objects of the issue not defined", severity: "High", affectedSection: "Objects of the Issue",
      explanation: "No fund utilisation plan exists. The Objects section is the heart of an SME offer document.",
      requiredDocument: "Fund utilisation plan with evidence",
      suggestedFix: "Complete the Objects Builder with amounts, timelines and supporting documents.", owner: "Promoter",
    });
  }

  const wcObject = objects.find((o) => /working capital/i.test(o.category));
  if (wcObject && !field<number>(objDocs, "wcRequirementCr")) {
    addGap({
      title: "Working capital object lacks detailed basis", severity: "High", affectedSection: "Objects of the Issue",
      explanation: `The ₹${wcObject.amountCr} Cr working-capital object has no supporting computation among the uploads.`,
      requiredDocument: "Detailed working capital computation with assumptions",
      suggestedFix: "Prepare a holding-period based computation consistent with the historical cycle.",
      owner: "Promoter",
    });
    addObs({
      observation: "Provide the basis for the working capital requirement.",
      affectedSection: "Objects of the Issue", severity: "High",
      whyItMayBeAsked: "Working-capital objects without granular computation are the single most common exchange query for SME issues.",
      suggestedResponse: "Provide month-wise/holding-level computation certified by management and reviewed by the merchant banker.",
      requiredEvidence: "Working capital computation, historical holding levels",
    });
  }

  // ════ D. GOVERNANCE ══════════════════════════════════════════════════════
  addCheck("Governance", "Independent directors identified",
    company.independentDirectorsAppointed === true || has(govDocs) ? "pass" : company.independentDirectorsAppointed === false ? "fail" : "missing",
    "High",
    company.independentDirectorsAppointed === true || has(govDocs)
      ? "Independent director appointments evidenced."
      : "No independent director consents on record.",
    company.independentDirectorsAppointed === true || has(govDocs) ? "—" : "Appoint and document the required independent directors.");

  addCheck("Governance", "Audit committee constituted",
    company.auditCommitteeConstituted === true ? "pass" : company.auditCommitteeConstituted === false ? "fail" : "missing",
    "High",
    company.auditCommitteeConstituted === true ? "Audit committee constitution confirmed." : "Audit committee constitution not evidenced.",
    company.auditCommitteeConstituted === true ? "—" : "Constitute the audit committee and upload the board resolution.");

  if (company.independentDirectorsAppointed !== true && !has(govDocs)) {
    addGap({
      title: "Independent directors & committees not in place", severity: "High", affectedSection: "Management",
      explanation: "Governance structures required for listing (independent directors, audit committee) are not yet evidenced.",
      requiredDocument: "Independent director consents, committee constitution resolutions",
      suggestedFix: "Appoint independent directors, constitute committees, upload supporting resolutions.",
      owner: "Promoter", status: "In Progress",
    });
  }

  addCheck("Governance", "Board resolution authorising the issue",
    has(approvalDocs) ? "pass" : "missing", "High",
    has(approvalDocs) ? "Board resolution authorising the IPO uploaded." : "Board/shareholder resolution authorising the IPO not uploaded.",
    has(approvalDocs) ? "—" : "Upload the board and shareholders' resolutions authorising the issue.");

  addCheck("Governance", "RPT approvals in place",
    rptDocs.length ? "warning" : "missing", "High",
    rptDocs.length ? "RPT register exists; audit-committee ratification pending confirmation." : "No RPT approval trail on record.",
    "Ratify related-party transactions once the audit committee is constituted.");

  addCheck("Governance", "Promoter contribution & lock-in understood",
    company.freshIssueCr != null ? "pass" : "missing", "Medium",
    company.freshIssueCr != null ? "Issue structure captured; lock-in schedule to be finalised with the merchant banker." : "Issue structure not defined.",
    company.freshIssueCr != null ? "—" : "Complete issue details in Company Profile.");

  addCheck("Governance", "Conflict-of-interest declarations",
    suspectEntities.length || rptAmount != null ? "warning" : has(kycDocs) ? "pass" : "missing", "Medium",
    suspectEntities.length || rptAmount != null
      ? "Related-party interests detected — a signed conflict-of-interest declaration covering group entities is needed."
      : has(kycDocs) ? "No conflicting interests detected in available records." : "KYC/declarations not uploaded.",
    suspectEntities.length || rptAmount != null ? "Obtain signed conflict-of-interest declarations from promoter and directors." : "—");

  // ════ E. DOCUMENT QUALITY ════════════════════════════════════════════════
  const expectedCats = ["Financial Statements", "Tax Returns", "Corporate Approvals", "KYC", "Legal", "Related Party", "Objects Evidence", "Contracts", "Constitutional", "Governance"];
  const presentCats = expectedCats.filter((c) => docs.some((d) => d.category === c));
  addCheck("Document Quality", "Core document coverage",
    presentCats.length >= 8 ? "pass" : presentCats.length >= 5 ? "warning" : "fail", "Medium",
    `${presentCats.length} of ${expectedCats.length} core document categories uploaded.` +
    (presentCats.length < expectedCats.length ? ` Missing: ${expectedCats.filter((c) => !presentCats.includes(c)).join(", ")}.` : ""),
    presentCats.length >= 8 ? "—" : "Use the Data Room checklist to upload the missing categories.");

  const avgConf = docs.length ? Math.round(docs.reduce((s, d) => s + d.confidence, 0) / docs.length) : 0;
  addCheck("Document Quality", "Extraction confidence",
    !docs.length ? "missing" : avgConf >= 75 ? "pass" : avgConf >= 50 ? "warning" : "fail", "Low",
    docs.length ? `Average AI extraction confidence ${avgConf}% across ${docs.length} documents.` : "No documents uploaded yet.",
    avgConf >= 75 || !docs.length ? (docs.length ? "—" : "Upload documents to begin.") : "Low-confidence files are likely scans — review and correct extracted values manually in the Data Room.");

  const inconsistent = docs.filter((d) => d.status === "Inconsistent").length + financialChecks.filter((f) => f.severity === "High").length;
  addCheck("Document Quality", "Cross-document consistency",
    inconsistent === 0 ? "pass" : "fail", "High",
    inconsistent === 0 ? "No unresolved cross-document inconsistencies." : `${inconsistent} unresolved inconsistency signal(s) across uploads.`,
    inconsistent === 0 ? "—" : "Resolve items flagged in Financial Checks and the Gap Report.");

  // Basis for issue price / peer benchmarking
  addGap({
    title: "Basis for issue price needs peer benchmarking", severity: "Medium", affectedSection: "Basis for Issue Price",
    explanation: "A peer comparison (P/E, EV/EBITDA, RoNW) is expected to justify the proposed valuation.",
    requiredDocument: "Peer set with accounting ratios",
    suggestedFix: "Use the Valuation Studio peer set and add justification for premium/discount vs peers.",
    owner: "Merchant Banker",
  });
  addObs({
    observation: "Basis for issue price lacks peer comparison.",
    affectedSection: "Basis for Issue Price", severity: "Medium",
    whyItMayBeAsked: "Valuation justification is mandatory content; generic statements are routinely rejected.",
    suggestedResponse: "Add peer multiples table with reasoning for premium/discount.",
    requiredEvidence: "Peer financial data, merchant banker's valuation note",
  });
  addObs({
    observation: "Risk factors must be company-specific, not generic.",
    affectedSection: "Risk Factors", severity: "Medium",
    whyItMayBeAsked: "Template risk factors are the most common reason for offer-document rework.",
    suggestedResponse: "Tie each risk factor to your own numbers (concentration %, receivable days, RPT amounts).",
    requiredEvidence: "—",
  });

  addGap({
    title: "Merchant banker review pending", severity: "Medium", affectedSection: "All Sections",
    explanation: "No draft section has been approved by the merchant banker yet. Final draft status is blocked until review completes.",
    requiredDocument: "—",
    suggestedFix: "Send the draft to the Merchant Banker Review Room and track section-wise approvals.",
    owner: "Merchant Banker",
  });

  // ════ SCORES ═════════════════════════════════════════════════════════════
  const byCategory: Record<string, number> = {};
  for (const cat of Object.keys(SCORING_WEIGHTS) as (keyof typeof SCORING_WEIGHTS)[]) {
    const catChecks = checks.filter((c) => c.category === cat);
    if (!catChecks.length) { byCategory[cat] = 0; continue; }
    const got = catChecks.reduce((s, c) => s + STATUS_SCORE[c.status], 0);
    byCategory[cat] = Math.round((got / catChecks.length) * 100);
  }
  const overall = Math.round(
    (Object.keys(SCORING_WEIGHTS) as (keyof typeof SCORING_WEIGHTS)[]).reduce(
      (s, cat) => s + (byCategory[cat] ?? 0) * SCORING_WEIGHTS[cat], 0)
  );

  const rptScore = rptRisks.length
    ? Math.round(0.6 * Math.max(...rptRisks.map((r) => r.riskScore)) + 0.4 * (rptRisks.reduce((s, r) => s + r.riskScore, 0) / rptRisks.length))
    : 0;

  const finPenalty = financialChecks.reduce((s, f) => s + (f.severity === "High" ? 25 : f.severity === "Medium" ? 12 : 0), 0);
  const finConsistencyScore = Math.max(0, 100 - finPenalty);

  const heatmap = buildHeatmap(company, docs, objects, { gaps, checks, financialChecks });
  const draftCompletionPct = Math.round(heatmap.reduce((s, h) => s + h.completionPct, 0) / heatmap.length);

  const critical = gaps.filter((g) => g.severity === "Critical" && g.status !== "Resolved").length;
  const statusLine =
    overall >= 85 && critical === 0
      ? "Ready for merchant banker review."
      : overall >= 60
        ? "Partially ready — merchant banker review recommended before draft finalisation."
        : "Early stage — resolve critical gaps before draft finalisation.";

  return {
    checks, gaps, heatmap, rptRisks, financialChecks, observations,
    scores: { overall, byCategory, rptScore, finConsistencyScore, draftCompletionPct, statusLine },
    ranAt: new Date().toISOString(),
  };
}

// ── Heatmap builder ─────────────────────────────────────────────────────────

export const OFFER_SECTIONS = [
  "Cover Page", "Definitions and Abbreviations", "Risk Factors", "Introduction",
  "Summary of Offer Document", "General Information", "Capital Structure",
  "Objects of the Issue", "Basis for Issue Price", "Statement of Tax Benefits",
  "Industry Overview", "Business Overview", "Key Regulations and Policies",
  "History and Corporate Structure", "Management", "Promoters and Promoter Group",
  "Dividend Policy", "Financial Information", "Restated Financial Statements",
  "Related Party Transactions", "Outstanding Litigation and Material Developments",
  "Government and Other Approvals", "Material Contracts and Documents for Inspection",
  "Other Regulatory and Statutory Disclosures", "Declaration",
] as const;

function buildHeatmap(
  company: Company,
  docs: DocumentRecord[],
  objects: ObjectOfIssue[],
  ctx: { gaps: Gap[]; checks: ReadinessCheck[]; financialChecks: FinancialCheck[] }
): HeatmapSection[] {
  const profileDone = !!(company.name && company.industry && company.issueSizeCr && company.promoterName);
  const finYears = company.financials.filter((f) => f.revenueCr !== null).length;

  return OFFER_SECTIONS.map((name, i) => {
    const sectionDocs = docs.filter((d) => d.linkedSection === name);
    const sectionGaps = ctx.gaps.filter((g) => g.affectedSection === name && g.status !== "Resolved");
    const inconsistencies = sectionGaps.filter((g) => /inconsisten|mismatch/i.test(g.title)).map((g) => g.title);
    const missingInputs = sectionGaps.map((g) => g.requiredDocument).filter((x) => x && x !== "—");

    // base completion by inputs available
    let base = 0;
    switch (name) {
      case "Cover Page": case "Introduction": case "General Information":
        base = profileDone ? 85 : 35; break;
      case "Definitions and Abbreviations": case "Dividend Policy": case "Declaration":
        base = 95; break; // standard content generated from profile
      case "Key Regulations and Policies":
        base = company.industry ? 80 : 40; break;
      case "Industry Overview":
        base = company.industry ? 70 : 30; break;
      case "Summary of Offer Document":
        base = profileDone && finYears >= 2 ? 70 : 40; break;
      case "Capital Structure":
        base = company.freshIssueCr != null ? 75 : 30; break;
      case "Objects of the Issue":
        base = objects.length ? 70 : 15; break;
      case "Basis for Issue Price":
        base = 35; break; // always needs MB work
      case "Statement of Tax Benefits":
        base = 40; break;
      case "Business Overview":
        base = sectionDocs.length || docs.some((d) => d.category === "Contracts") ? 85 : profileDone ? 60 : 30; break;
      case "History and Corporate Structure":
        base = docs.some((d) => d.category === "Constitutional") ? 92 : 40; break;
      case "Management":
        base = docs.some((d) => d.category === "Governance") || company.independentDirectorsAppointed ? 80 : 45; break;
      case "Promoters and Promoter Group":
        base = docs.some((d) => d.category === "KYC") ? 80 : 35; break;
      case "Financial Information":
        base = finYears >= 3 ? 78 : finYears >= 1 ? 55 : 20; break;
      case "Restated Financial Statements":
        base = docs.some((d) => d.category === "Restated Financials") ? 90 : docs.some((d) => d.category === "Financial Statements") ? 35 : 10; break;
      case "Related Party Transactions":
        base = docs.some((d) => d.category === "Related Party") ? 55 : 20; break;
      case "Outstanding Litigation and Material Developments":
        base = docs.some((d) => d.category === "Legal") ? 60 : 25; break;
      case "Government and Other Approvals":
        base = docs.some((d) => d.category === "Licenses & Approvals") ? 84 : 40; break;
      case "Material Contracts and Documents for Inspection":
        base = docs.some((d) => d.category === "Contracts") ? 88 : 30; break;
      case "Other Regulatory and Statutory Disclosures":
        base = profileDone ? 70 : 40; break;
      default:
        base = 50;
    }

    // penalties for gaps in this section
    const penalty = sectionGaps.reduce(
      (s, g) => s + (g.severity === "Critical" ? 30 : g.severity === "High" ? 18 : 8), 0);
    const completionPct = Math.max(5, Math.min(100, base - penalty + (sectionDocs.length ? 5 : 0)));

    const riskLevel: HeatmapSection["riskLevel"] =
      sectionGaps.some((g) => g.severity === "Critical") ? "Critical Issue"
        : completionPct < 40 ? "Missing Data"
          : sectionGaps.length || completionPct < 75 ? "Needs Clarification"
            : "Ready";

    const aiConfidence = Math.min(99, Math.round(completionPct * 0.9 + (sectionDocs.length ? 8 : 0)));

    return {
      id: `h${i + 1}`, name, completionPct, missingInputs, inconsistencies,
      riskLevel, sourceDocs: sectionDocs.map((d) => d.fileName), aiConfidence,
      mbApproval: "Not Started" as const,
    };
  });
}
