import type { DocStatus, ExtractedFields } from "../types";

/**
 * Deterministic document intelligence.
 *
 * Works without any AI key: classifies documents from filename + content
 * keywords, and extracts structured fields (CIN, GSTIN, revenue, PAT,
 * receivables, demand notices, quotations…) with regex + context windows.
 * When an AI provider key is configured, lib/ai/provider.ts can enrich these
 * results — but the platform never depends on it.
 *
 * SME reality check: many uploads are scans with no text layer. Every result
 * carries a confidence score, and the promoter can review & correct extracted
 * values manually from the Data Room.
 */

export interface Classification {
  category: string;
  linkedSection: string;
}

const CATEGORY_RULES: { category: string; linkedSection: string; keywords: string[] }[] = [
  { category: "Restated Financials", linkedSection: "Restated Financial Statements", keywords: ["restated"] },
  { category: "Financial Statements", linkedSection: "Restated Financial Statements", keywords: ["audited", "financial statement", "balance sheet", "profit and loss", "statement of profit", "annual accounts", "financials"] },
  { category: "Tax Returns", linkedSection: "Financial Information", keywords: ["gst", "gstr", "income tax return", "itr", "form 26as", "tax return"] },
  { category: "Banking", linkedSection: "Financial Information", keywords: ["bank statement", "account statement", "sanction letter", "cc limit", "cash credit"] },
  { category: "Corporate Approvals", linkedSection: "General Information", keywords: ["board resolution", "shareholders resolution", "egm", "agm resolution"] },
  { category: "KYC", linkedSection: "Promoters and Promoter Group", keywords: ["kyc", "pan card", "aadhaar", "din", "passport", "address proof"] },
  { category: "Legal", linkedSection: "Outstanding Litigation and Material Developments", keywords: ["litigation", "legal notice", "demand notice", "court", "tribunal", "show cause", "declaration"] },
  { category: "Related Party", linkedSection: "Related Party Transactions", keywords: ["related party", "rpt", "related-party"] },
  { category: "Objects Evidence", linkedSection: "Objects of the Issue", keywords: ["quotation", "proforma invoice", "working capital", "capex", "machinery", "project report"] },
  { category: "Contracts", linkedSection: "Material Contracts and Documents for Inspection", keywords: ["agreement", "contract", "lease", "mou", "purchase order", "supply"] },
  { category: "Constitutional", linkedSection: "History and Corporate Structure", keywords: ["memorandum of association", "articles of association", "moa", "aoa", "incorporation", "certificate of incorporation"] },
  { category: "Governance", linkedSection: "Management", keywords: ["independent director", "audit committee", "corporate governance", "committee", "consent letter"] },
  { category: "Licenses & Approvals", linkedSection: "Government and Other Approvals", keywords: ["license", "licence", "consent to operate", "pollution", "factory act", "udyam", "approval"] },
  { category: "Audit Report", linkedSection: "Restated Financial Statements", keywords: ["auditor's report", "audit report", "independent auditor"] },
  { category: "Shareholding / Capital Structure", linkedSection: "Capital Structure", keywords: ["shareholding pattern", "share capital", "capital structure", "allotment history"] },
  { category: "Industry / Business Overview", linkedSection: "Business Overview", keywords: ["industry report", "market overview", "industry overview", "company profile", "business overview"] },
  { category: "IPO Process", linkedSection: "General Information", keywords: ["draft prospectus", "due diligence", "merchant banker", "issue agreement", "drhp"] },
];

export function classifyDocument(fileName: string, text: string): Classification {
  const hay = (fileName + " " + text.slice(0, 6000)).toLowerCase();
  let best: Classification = { category: "General", linkedSection: "Business Overview" };
  let bestScore = 0;
  for (const rule of CATEGORY_RULES) {
    let score = 0;
    for (const kw of rule.keywords) {
      if (fileName.toLowerCase().includes(kw)) score += 3; // filename is a strong signal
      if (hay.includes(kw)) score += 1;
    }
    if (score > bestScore) {
      bestScore = score;
      best = { category: rule.category, linkedSection: rule.linkedSection };
    }
  }
  return best;
}

// ── Amount parsing ──────────────────────────────────────────────────────────

/** Convert a matched amount to ₹ crore. */
function toCrore(numStr: string, unit: string | undefined): number | null {
  const n = parseFloat(numStr.replace(/,/g, ""));
  if (!isFinite(n)) return null;
  const u = (unit ?? "").toLowerCase();
  if (u.startsWith("cr")) return round2(n);
  if (u.startsWith("lakh") || u.startsWith("lac")) return round2(n / 100);
  if (u.startsWith("mn") || u.startsWith("million")) return round2(n / 10);
  // no unit: guess from magnitude (raw rupees)
  if (n >= 1_00_00_000) return round2(n / 1_00_00_000);
  return round2(n);
}
const round2 = (n: number) => Math.round(n * 100) / 100;

const AMOUNT = String.raw`(₹|rs\.?|inr)?\s*([\d,]+(?:\.\d+)?)\s*(crores?|cr\.?|lakhs?|lacs?|million|mn)?`;

/** Reject bare numbers that are almost certainly years/dates, not amounts. */
function looksLikeYear(numStr: string, currency: string | undefined, unit: string | undefined): boolean {
  if (currency || unit) return false;
  const n = parseFloat(numStr.replace(/,/g, ""));
  return Number.isInteger(n) && n >= 1900 && n <= 2100;
}

/**
 * Find an amount for the given keywords. Line-based first (financial
 * statements are line-oriented: "Revenue from operations: Rs. 61.2 crore"),
 * falling back to a context window. Returns the FIRST plausible amount on a
 * keyword line, never a bare year.
 */
function amountNear(text: string, keywords: string[]): number | null {
  for (const line of text.split(/\r?\n/)) {
    const l = line.toLowerCase();
    if (!keywords.some((k) => l.includes(k))) continue;
    const re = new RegExp(AMOUNT, "gi");
    let m: RegExpExecArray | null;
    let bare: number | null = null;
    while ((m = re.exec(line)) !== null) {
      if (!m[2] || looksLikeYear(m[2], m[1], m[3])) continue;
      const v = toCrore(m[2], m[3]);
      if (v === null || v <= 0) continue;
      if (m[1] || m[3]) return v; // currency/unit-bearing amount wins ("Rs. 6.5 crore" over "6 machines")
      if (bare === null) bare = v;
    }
    // bare numbers ("Top 3 customers…") are only trusted on lines that talk money
    if (bare !== null && /crore|lakh|lacs|₹|\brs\b/i.test(l)) return bare;
  }
  // fallback: window scan for keyword shortly BEFORE the amount
  const re = new RegExp(AMOUNT, "gi");
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (!m[2] || looksLikeYear(m[2], m[1], m[3])) continue;
    const start = Math.max(0, m.index - 80);
    const ctx = text.slice(start, m.index).toLowerCase();
    if (keywords.some((k) => ctx.includes(k))) {
      const v = toCrore(m[2], m[3]);
      if (v !== null && v > 0) return v;
    }
  }
  return null;
}

// ── Structured field extraction ─────────────────────────────────────────────

export function extractFields(fileName: string, text: string, category: string): ExtractedFields {
  const f: ExtractedFields = {};
  const t = text;

  const cin = t.match(/\b[UL]\d{5}[A-Z]{2}\d{4}[A-Z]{3}\d{6}\b/);
  if (cin) f.cin = cin[0];
  const gstin = t.match(/\b\d{2}[A-Z]{5}\d{4}[A-Z][0-9A-Z]Z[0-9A-Z]\b/);
  if (gstin) f.gstin = gstin[0];
  const pan = t.match(/\b[A-Z]{5}\d{4}[A-Z]\b/);
  if (pan) f.pan = pan[0];
  const din = t.match(/DIN[\s:.-]*(\d{8})/i);
  if (din) f.din = din[1];

  const fy = t.match(/\bFY\s?-?\s?(20\d{2})\b/i) ?? t.match(/\b20(\d{2})\s?[-–]\s?(\d{2})\b/);
  if (fy) f.fy = fy[0].replace(/\s/g, "").toUpperCase().startsWith("FY")
    ? "FY" + fy[1]
    : "FY20" + (fy as RegExpMatchArray)[2];

  const revenue = amountNear(t, ["revenue from operations", "revenue", "turnover", "total income", "sales"]);
  if (revenue) f.revenueCr = revenue;
  const pat = amountNear(t, ["profit after tax", "pat", "net profit", "profit for the year"]);
  if (pat) f.patCr = pat;
  const ebitda = amountNear(t, ["ebitda"]);
  if (ebitda) f.ebitdaCr = ebitda;
  const nw = amountNear(t, ["net worth", "networth", "total equity", "shareholders' funds", "shareholders funds"]);
  if (nw) f.netWorthCr = nw;
  const debt = amountNear(t, ["borrowings", "total debt", "loan outstanding", "term loan"]);
  if (debt) f.borrowingsCr = debt;
  const recv = amountNear(t, ["trade receivables", "receivables", "sundry debtors", "debtors"]);
  if (recv) f.receivablesCr = recv;
  const cfo = amountNear(t, ["cash flow from operations", "cash generated from operations", "net cash from operating"]);
  if (cfo) f.cfoCr = cfo;

  if (category === "Tax Returns") {
    const gstTurnover = amountNear(t, ["taxable turnover", "gst turnover", "aggregate turnover", "outward supplies"]);
    if (gstTurnover) f.gstTurnoverCr = gstTurnover;
  }
  const demand = amountNear(t, ["demand notice", "demand of", "tax demand", "penalty", "show cause"]);
  if (demand) f.demandNoticeCr = demand;

  if (category === "Objects Evidence") {
    const q = amountNear(t, ["quotation", "total amount", "grand total", "proforma", "basic price"]);
    if (q) f.quotationAmountCr = q;
    f.quotationHasGstin = !!gstin;
    const wc = amountNear(t, ["working capital requirement", "incremental working capital", "working capital"]);
    if (wc) f.wcRequirementCr = wc;
  }

  if (category === "Related Party" || /related part/i.test(t)) {
    const rpt = amountNear(t, ["purchases from", "related party", "purchase of goods", "transactions with"]);
    if (rpt) f.rptPurchasesCr = rpt;
    const loan = amountNear(t, ["unsecured loan from", "loan from promoter", "loan from director", "loan from related"]);
    if (loan) f.promoterLoanCr = loan;
  }

  if (category === "Legal") {
    if (/\b(nil|no pending litigation|no litigation)\b/i.test(t)) f.litigationDeclared = "NIL";
    else if (/litigation|demand|notice|case/i.test(t)) f.litigationDeclared = "DISCLOSED";
  }

  const lease = t.match(/lease[^.]{0,80}?(?:valid|expir\w+|till|until)[^.]{0,30}?(20\d{2})/i);
  if (lease) f.leaseValidTill = lease[1];
  const authCap = amountNear(t, ["authorised capital", "authorized capital", "authorised share capital"]);
  if (authCap) f.authorisedCapitalCr = authCap;

  // Entity names: LLPs / companies mentioned in the text
  const entityRe = /([A-Z][A-Za-z&.]+(?:\s+[A-Z][A-Za-z&.]+){0,4}\s+(?:LLP|Private Limited|Pvt\.?\s?Ltd\.?|Limited))/g;
  const entities = new Set<string>();
  let em: RegExpExecArray | null;
  while ((em = entityRe.exec(t)) !== null && entities.size < 12) entities.add(em[1].trim());
  if (entities.size) f.rptEntityNames = [...entities];

  return f;
}

// ── Summary, confidence & status ────────────────────────────────────────────

export function summarize(fileName: string, text: string, category: string, f: ExtractedFields): string {
  const bits: string[] = [];
  if (f.fy) bits.push(`Period ${f.fy}`);
  if (f.revenueCr) bits.push(`revenue ₹${f.revenueCr} Cr`);
  if (f.patCr) bits.push(`PAT ₹${f.patCr} Cr`);
  if (f.gstTurnoverCr) bits.push(`GST turnover ₹${f.gstTurnoverCr} Cr`);
  if (f.quotationAmountCr) bits.push(`quotation value ₹${f.quotationAmountCr} Cr`);
  if (f.demandNoticeCr) bits.push(`demand/penalty ₹${f.demandNoticeCr} Cr found`);
  if (f.litigationDeclared) bits.push(`litigation declared: ${f.litigationDeclared}`);
  if (f.cin) bits.push(`CIN ${f.cin}`);
  if (bits.length) return `Classified as ${category}. Detected: ${bits.join(", ")}.`;
  if (text.trim().length < 100)
    return `Classified as ${category} from the file name. We could not read text from this file (it may be a scan) — please review and enter key details manually.`;
  return `Classified as ${category}. No structured financial fields detected — please verify.`;
}

export function keyNumberBadges(f: ExtractedFields): string[] {
  const out: string[] = [];
  if (f.revenueCr) out.push(`Revenue ₹${f.revenueCr} Cr`);
  if (f.patCr) out.push(`PAT ₹${f.patCr} Cr`);
  if (f.netWorthCr) out.push(`Net Worth ₹${f.netWorthCr} Cr`);
  if (f.borrowingsCr) out.push(`Borrowings ₹${f.borrowingsCr} Cr`);
  if (f.receivablesCr) out.push(`Receivables ₹${f.receivablesCr} Cr`);
  if (f.gstTurnoverCr) out.push(`GST Turnover ₹${f.gstTurnoverCr} Cr`);
  if (f.quotationAmountCr) out.push(`Quotation ₹${f.quotationAmountCr} Cr`);
  if (f.wcRequirementCr) out.push(`WC Need ₹${f.wcRequirementCr} Cr`);
  if (f.demandNoticeCr) out.push(`Demand ₹${f.demandNoticeCr} Cr`);
  if (f.rptPurchasesCr) out.push(`RPT Purchases ₹${f.rptPurchasesCr} Cr`);
  if (f.authorisedCapitalCr) out.push(`Authorised Capital ₹${f.authorisedCapitalCr} Cr`);
  return out;
}

export function extractionConfidence(text: string, f: ExtractedFields): number {
  if (text.trim().length < 100) return 25; // likely a scan with no text layer
  const fieldCount = Object.keys(f).length;
  const lengthScore = Math.min(30, Math.floor(text.length / 400));
  return Math.min(97, 40 + lengthScore + fieldCount * 4);
}

export function initialStatus(confidence: number, issues: string[]): DocStatus {
  if (issues.length) return issues.some((i) => /inconsisten/i.test(i)) ? "Inconsistent" : "Needs Review";
  if (confidence < 45) return "Needs Review";
  return "Complete";
}
