import type { Company, FinancialYear } from "../types";

/**
 * Company-profile parser.
 *
 * Reads the promoter's uploaded documents (Certificate of Incorporation, MOA,
 * KYC, board resolution, audited financials, GST summary, licenses, litigation
 * declaration, governance consents…) and fills the Company Profile fields that
 * are otherwise typed by hand in onboarding — including the year-wise financial
 * snapshot.
 *
 * Deterministic and AI-free: everything here is regex + context windows over
 * the document text, so it works without any API key. Every value carries
 * provenance (source file + confidence) so the promoter can review before
 * saving — the parser suggests, the promoter confirms.
 */

// ── public shapes ────────────────────────────────────────────────────────────

export interface ParseSource {
  fileName: string;
  category: string;
  text: string;
}

/** The scalar Company fields this parser can fill (financials handled separately). */
export type ProfileScalarKey =
  | "name" | "cin" | "industry" | "city" | "state" | "yearOfIncorporation"
  | "promoterName" | "promoterExperienceYears"
  | "issueSizeCr" | "freshIssueCr" | "ofsCr" | "proposedListingExchange"
  | "top3CustomerPct" | "independentDirectorsAppointed" | "auditCommitteeConstituted"
  | "pendingLitigationNote";

export interface Provenance {
  sourceFile: string;
  confidence: number; // 0-100
}

export interface ParsedProfile {
  profile: Partial<Pick<Company, ProfileScalarKey>>;
  provenance: Partial<Record<ProfileScalarKey | `fy:${string}`, Provenance>>;
  financials: FinancialYear[];
  documentsParsed: { fileName: string; category: string; readable: boolean; fieldsFound: number }[];
  unreadable: string[];
}

// ── amount parsing (₹ crore, negatives allowed) ──────────────────────────────

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Convert a matched amount + unit to ₹ crore, preserving sign. */
function toCrore(numStr: string, unit: string | undefined): number | null {
  const n = parseFloat(numStr.replace(/,/g, ""));
  if (!isFinite(n)) return null;
  const u = (unit ?? "").toLowerCase();
  if (u.startsWith("cr")) return round2(n);
  if (u.startsWith("lakh") || u.startsWith("lac")) return round2(n / 100);
  if (u.startsWith("mn") || u.startsWith("million")) return round2(n / 10);
  const abs = Math.abs(n);
  if (abs >= 1_00_00_000) return round2(n / 1_00_00_000); // raw rupees → crore
  return round2(n);
}

// leading minus is captured so figures like "Rs. -9 crore" (negative CFO) survive
const AMOUNT = String.raw`(₹|rs\.?|inr)?\s*(-?\d[\d,]*(?:\.\d+)?)\s*(crores?|cr\.?|lakhs?|lacs?|million|mn)?`;

function looksLikeYear(numStr: string, currency: string | undefined, unit: string | undefined): boolean {
  if (currency || unit) return false;
  const n = parseFloat(numStr.replace(/,/g, ""));
  return Number.isInteger(n) && n >= 1900 && n <= 2100;
}

/** First plausible ₹-crore amount on a line mentioning any keyword. */
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
      if (v === null) continue;
      if (m[1] || m[3]) return v; // currency/unit-bearing amount wins
      if (bare === null) bare = v;
    }
    if (bare !== null && /crore|lakh|lacs|₹|\brs\b/i.test(l)) return bare;
  }
  return null;
}

// ── small helpers ────────────────────────────────────────────────────────────

const titleCase = (s: string) =>
  s.trim().replace(/\s+/g, " ").replace(/\b([A-Z])([A-Z]+)\b/g, (_, a, b) => a + b.toLowerCase());

const CIN_RE = /\b[UL]\d{5}[A-Z]{2}\d{4}[A-Z]{3}\d{6}\b/;

// state code (chars 7-8 of a CIN) → state name — fallback when the registered
// office line isn't parseable
const STATE_CODES: Record<string, string> = {
  AP: "Andhra Pradesh", AR: "Arunachal Pradesh", AS: "Assam", BR: "Bihar",
  CH: "Chandigarh", CT: "Chhattisgarh", GA: "Goa", GJ: "Gujarat", HR: "Haryana",
  HP: "Himachal Pradesh", JK: "Jammu & Kashmir", JH: "Jharkhand", KA: "Karnataka",
  KL: "Kerala", MP: "Madhya Pradesh", MH: "Maharashtra", MN: "Manipur",
  ML: "Meghalaya", MZ: "Mizoram", NL: "Nagaland", OR: "Odisha", PB: "Punjab",
  RJ: "Rajasthan", SK: "Sikkim", TN: "Tamil Nadu", TG: "Telangana", TR: "Tripura",
  UP: "Uttar Pradesh", UT: "Uttarakhand", UK: "Uttarakhand", WB: "West Bengal",
  DL: "Delhi", PY: "Puducherry", AN: "Andaman & Nicobar Islands",
};

const ENTITY_RE =
  /([A-Z][A-Za-z0-9.&']*(?:\s+[A-Z][A-Za-z0-9.&']*){0,5}\s+(?:Private\s+Limited|Pvt\.?\s?Ltd\.?|Limited|LLP))/g;

/** Strip the corporate suffix to a comparable core, e.g. "…Private Limited" → "…". */
const coreName = (s: string) =>
  s.replace(/\s+(?:Private\s+Limited|Pvt\.?\s?Ltd\.?|Limited|LLP)\.?$/i, "").trim().toLowerCase().replace(/\s+/g, " ");

// ── financial-year detection ─────────────────────────────────────────────────

function detectFy(text: string): string | null {
  const ended = text.match(/year ended[^\n]*?\b(20\d{2})\b/i);
  if (ended) return `FY${ended[1]}`;
  const fy = text.match(/\bFY\s?-?\s?(20\d{2})\b/i);
  if (fy) return `FY${fy[1]}`;
  const range = text.match(/\b20(\d{2})\s?[-–]\s?(\d{2})\b/);
  if (range) return `FY20${range[2]}`;
  return null;
}

// ── the parser ───────────────────────────────────────────────────────────────

const FINANCIAL_CATEGORIES = new Set([
  "Financial Statements", "Restated Financials", "Audit Report", "Tax Returns",
]);

export function parseCompanyProfile(sources: ParseSource[]): ParsedProfile {
  const readable = sources.filter((s) => s.text.trim().length >= 40);
  const unreadable = sources.filter((s) => s.text.trim().length < 40).map((s) => s.fileName);
  const corpus = readable.map((s) => s.text).join("\n");

  const profile: ParsedProfile["profile"] = {};
  const provenance: ParsedProfile["provenance"] = {};
  const foundPerDoc = new Map<string, number>();

  const set = <K extends ProfileScalarKey>(
    key: K, value: Company[K], sourceFile: string, confidence: number
  ) => {
    // keep the first (highest-priority) hit for a field
    if (profile[key] !== undefined && profile[key] !== null && profile[key] !== "") return;
    profile[key] = value;
    provenance[key] = { sourceFile, confidence };
    foundPerDoc.set(sourceFile, (foundPerDoc.get(sourceFile) ?? 0) + 1);
  };

  // ── CIN (also yields state + incorporation year as fallbacks) ──
  for (const s of readable) {
    const cin = s.text.match(CIN_RE);
    if (cin) {
      set("cin", cin[0], s.fileName, 96);
      const st = STATE_CODES[cin[0].slice(6, 8)];
      if (st) set("state", st, s.fileName, 70);
      const yr = Number(cin[0].slice(8, 12));
      if (yr >= 1900 && yr <= 2100) set("yearOfIncorporation", yr, s.fileName, 72);
      break;
    }
  }

  // ── company name: labelled hits win, else most-frequent "…Limited" across docs ──
  parseCompanyName(readable, set);

  // ── registered office → city, state (overrides CIN-derived state) ──
  for (const s of readable) {
    const m = s.text.match(/Registered office:?\s*([^\n]+)/i);
    if (!m) continue;
    const parts = m[1].split(",").map((p) => p.replace(/\.\s*$/, "").trim()).filter(Boolean);
    if (parts.length >= 2) {
      const stateGuess = parts[parts.length - 1];
      const cityGuess = parts[parts.length - 2];
      if (/^[A-Za-z &]+$/.test(stateGuess)) { provenance.state = { sourceFile: s.fileName, confidence: 85 }; profile.state = stateGuess; }
      if (cityGuess) set("city", cityGuess, s.fileName, 82);
    }
    break;
  }

  // ── incorporation year (explicit "incorporated on … YYYY" beats CIN) ──
  for (const s of readable) {
    const m = s.text.match(/incorporat\w*[^\n]*?\b(19\d{2}|20[0-2]\d)\b/i);
    if (m) { profile.yearOfIncorporation = Number(m[1]); provenance.yearOfIncorporation = { sourceFile: s.fileName, confidence: 90 }; break; }
  }

  // ── industry (MOA main object, else industry overview title) ──
  for (const s of readable) {
    // the main-object clause often wraps across lines, so capture up to the
    // first full stop rather than the first newline
    const m = s.text.match(/Main object:?\s*([^.]+?)\./i) ?? s.text.match(/Main object:?\s*([^.\n]+)/i);
    if (m) { set("industry", trimIndustry(m[1]), s.fileName, 80); break; }
  }
  if (profile.industry === undefined) {
    const ind = readable.find((s) => /Industry\s*\/?\s*Business|Industry Overview/i.test(s.category + " " + s.text));
    if (ind) {
      const t = ind.text.match(/INDUSTRY OVERVIEW\s*[—-]\s*([^\n(]+)/i);
      if (t) set("industry", titleCase(trimIndustry(t[1])), ind.fileName, 60);
    }
  }

  // ── promoter name + experience (KYC, else litigation signatory) ──
  for (const s of readable) {
    const m = s.text.match(/Promoter\s*1?\s*:?\s*([A-Z][A-Za-z.]+(?:\s+[A-Z][A-Za-z.]+){1,3})/);
    if (m) { set("promoterName", m[1].trim(), s.fileName, 88); break; }
  }
  if (profile.promoterName === undefined) {
    for (const s of readable) {
      const m = s.text.match(/Signed:?\s*([A-Z][A-Za-z.]+(?:\s+[A-Z][A-Za-z.]+){1,3})/);
      if (m) { set("promoterName", m[1].trim(), s.fileName, 70); break; }
    }
  }
  for (const s of readable) {
    const m = s.text.match(/Experience:?\s*(?:over\s*)?(\d{1,2})\s*\+?\s*years/i)
      ?? s.text.match(/(\d{1,2})\s*\+?\s*years'?\s*(?:of\s*)?experience/i);
    if (m) { set("promoterExperienceYears", Number(m[1]), s.fileName, 82); break; }
  }

  // ── the issue: size / fresh / OFS / exchange ──
  for (const s of readable) {
    const issue = amountNear(s.text, ["aggregating", "public offering", "public offer", "issue of equity", "issue aggregating", "ipo of"]);
    if (issue != null) {
      set("issueSizeCr", issue, s.fileName, 84);
      const hasFresh = /fresh issue/i.test(s.text);
      const hasOfs = /offer for sale|\bofs\b/i.test(s.text);
      if (hasFresh && !hasOfs) { set("freshIssueCr", issue, s.fileName, 80); set("ofsCr", 0, s.fileName, 70); }
      else {
        if (hasFresh) { const v = amountNear(s.text, ["fresh issue"]); if (v != null) set("freshIssueCr", v, s.fileName, 78); }
        if (hasOfs) { const v = amountNear(s.text, ["offer for sale", "ofs"]); if (v != null) set("ofsCr", v, s.fileName, 78); }
      }
      break;
    }
  }
  const nse = /NSE\s*Emerge|National Stock Exchange/i.test(corpus);
  const bse = /BSE\s*SME|Bombay Stock Exchange/i.test(corpus);
  if (nse && bse) set("proposedListingExchange", "NSE Emerge / BSE SME", exchangeSource(readable), 78);
  else if (nse) set("proposedListingExchange", "NSE Emerge", exchangeSource(readable), 80);
  else if (bse) set("proposedListingExchange", "BSE SME", exchangeSource(readable), 80);

  // ── top-3 customer concentration ──
  for (const s of readable) {
    const m = s.text.match(/top\s*3\s*customers?[^.\n]*?(\d{1,3})\s*%/i)
      ?? s.text.match(/(\d{1,3})\s*%[^.\n]*?top\s*3\s*customers?/i);
    if (m) { set("top3CustomerPct", Number(m[1]), s.fileName, 80); break; }
  }

  // ── governance flags ──
  for (const s of readable) {
    if (/independent director[^\n]*?(appointed|consent)|consent letters?[^\n]*?independent director/i.test(s.text)) {
      set("independentDirectorsAppointed", true, s.fileName, 82); break;
    }
  }
  for (const s of readable) {
    if (/audit committee[^\n]*?constitut/i.test(s.text)) { set("auditCommitteeConstituted", true, s.fileName, 85); break; }
  }

  // ── pending litigation note ──
  parseLitigation(readable, set);

  // ── year-wise financials ──
  const financials = parseFinancials(readable, provenance);

  const documentsParsed = sources.map((s) => ({
    fileName: s.fileName,
    category: s.category,
    readable: s.text.trim().length >= 40,
    fieldsFound: foundPerDoc.get(s.fileName) ?? 0,
  }));

  return { profile, provenance, financials, documentsParsed, unreadable };
}

// ── name parsing ─────────────────────────────────────────────────────────────

function parseCompanyName(
  readable: ParseSource[],
  set: <K extends ProfileScalarKey>(k: K, v: Company[K], f: string, c: number) => void
) {
  // strong labelled patterns first
  const labelled: { re: RegExp; conf: number }[] = [
    { re: /Legal name:?\s*([A-Z][A-Za-z0-9.&' ]+?(?:Private\s+Limited|Limited|LLP))/i, conf: 92 },
    { re: /([A-Z][A-Za-z0-9.&' ]+?(?:Private\s+Limited|Limited))\s+was incorporated/i, conf: 92 },
    { re: /Board of Directors of\s+([A-Z][A-Za-z0-9.&' ]+?(?:Private\s+Limited|Limited))\s+held/i, conf: 88 },
  ];
  for (const s of readable) {
    for (const { re, conf } of labelled) {
      const m = s.text.match(re);
      if (m) { set("name", cleanName(m[1]), s.fileName, conf); return; }
    }
  }

  // otherwise: the issuer is the "…Limited" entity that recurs across documents
  // (vendors / related parties appear once; the issuer appears nearly everywhere)
  const tally = new Map<string, { display: string; hits: number; file: string; hasPublic: boolean }>();
  for (const s of readable) {
    const seen = new Set<string>();
    let m: RegExpExecArray | null;
    const re = new RegExp(ENTITY_RE);
    while ((m = re.exec(s.text)) !== null) {
      const raw = cleanName(m[1]);
      if (/\bLLP$/i.test(raw)) continue; // related parties are usually LLPs, not the issuer
      const key = coreName(raw);
      if (seen.has(key)) continue;
      seen.add(key);
      const entry = tally.get(key) ?? { display: raw, hits: 0, file: s.fileName, hasPublic: false };
      entry.hits += 1;
      // prefer the public "…Limited" variant over "…Private Limited" for the display name
      const isPublic = /\bLimited$/i.test(raw) && !/Private\s+Limited$/i.test(raw);
      if (isPublic && !entry.hasPublic) { entry.display = raw; entry.hasPublic = true; }
      tally.set(key, entry);
    }
  }
  const top = [...tally.values()].sort((a, b) => b.hits - a.hits)[0];
  if (top && top.hits >= 2) set("name", top.display, top.file, 76);
  else if (top) set("name", top.display, top.file, 62);
}

const cleanName = (s: string) => {
  const t = s.replace(/\s+/g, " ").trim();
  // title-case fully-uppercase headers ("SHIVALIC POWER CONTROL LIMITED")
  return /[a-z]/.test(t) ? t : titleCase(t);
};

// ── industry / litigation / exchange helpers ─────────────────────────────────

function trimIndustry(s: string): string {
  let t = s.replace(/\s+/g, " ").trim().replace(/[;:]$/, "");
  if (t.length > 140) t = t.slice(0, 137).replace(/[, ]+\w*$/, "") + "…";
  return t;
}

function exchangeSource(readable: ParseSource[]): string {
  return readable.find((s) => /NSE\s*Emerge|BSE\s*SME|Stock Exchange/i.test(s.text))?.fileName ?? "documents";
}

function parseLitigation(
  readable: ParseSource[],
  set: <K extends ProfileScalarKey>(k: K, v: Company[K], f: string, c: number) => void
) {
  // Prefer surfacing an actual demand/notice from ANY document over a bare NIL:
  // a declaration may say "NIL" while a tax summary discloses a demand — the
  // safer suggestion (and what a promoter must disclose) is the demand itself.
  const rank = (s: ParseSource) => (s.category === "Legal" ? 3 : s.category === "Tax Returns" ? 2 : 0);
  const ranked = [...readable].sort((a, b) => rank(b) - rank(a));

  for (const s of ranked) {
    const matter = s.text.match(
      /((?:GST|income[- ]?tax|service tax|tax|customs|demand|penalty|show cause)[^.\n]*?(?:notice|demand|penalty)[^.\n]*?(?:Rs\.?|₹|inr)\s*[\d.,]+\s*(?:crores?|lakhs?|lacs?|cr)[^.\n]*)/i
    );
    if (matter) {
      let note = matter[1].replace(/\s+/g, " ").trim().replace(/[;,]$/, "");
      if (/reply filed/i.test(s.text) && !/reply filed/i.test(note)) note += "; reply filed";
      if (/disputed/i.test(s.text) && !/disputed/i.test(note)) note += "; disputed";
      set("pendingLitigationNote", note, s.fileName, 80);
      return;
    }
  }

  const nilDoc = ranked.find((s) => /\b(nil|no pending litigation|no litigation)\b/i.test(s.text));
  if (nilDoc)
    set("pendingLitigationNote", "No pending litigation declared (per uploaded declaration).", nilDoc.fileName, 68);
}

// ── year-wise financials ─────────────────────────────────────────────────────

const FIN_METRICS: { key: keyof FinancialYear; keywords: string[] }[] = [
  { key: "revenueCr", keywords: ["revenue from operations", "revenue", "turnover", "total income", "sales"] },
  { key: "ebitdaCr", keywords: ["ebitda"] },
  { key: "patCr", keywords: ["profit after tax", "pat", "net profit", "profit for the year"] },
  { key: "netWorthCr", keywords: ["net worth", "networth", "total equity", "shareholders' funds", "shareholders funds"] },
  { key: "borrowingsCr", keywords: ["total borrowings", "borrowings", "total debt", "term loan"] },
  { key: "receivablesCr", keywords: ["trade receivables", "receivables", "sundry debtors", "debtors"] },
  { key: "cfoCr", keywords: ["cash flow from operations", "cash generated from operations", "net cash from operating"] },
];

function parseFinancials(
  readable: ParseSource[],
  provenance: ParsedProfile["provenance"]
): FinancialYear[] {
  const byFy = new Map<string, FinancialYear>();
  const ranked = [...readable].sort((a, b) =>
    (FINANCIAL_CATEGORIES.has(b.category) ? 1 : 0) - (FINANCIAL_CATEGORIES.has(a.category) ? 1 : 0));

  for (const s of ranked) {
    const isFin = FINANCIAL_CATEGORIES.has(s.category) || /statement of profit|balance sheet|financial statements/i.test(s.text);
    if (!isFin) continue;
    const fy = detectFy(s.text);
    if (!fy) continue;
    const row: FinancialYear = byFy.get(fy) ?? {
      fy, revenueCr: null, patCr: null, ebitdaCr: null, netWorthCr: null,
      borrowingsCr: null, receivablesCr: null, cfoCr: null,
    };
    let hit = false;
    for (const { key, keywords } of FIN_METRICS) {
      if (row[key] != null) continue;
      const v = amountNear(s.text, keywords);
      if (v != null) { (row[key] as number | null) = v; hit = true; }
    }
    if (hit) {
      byFy.set(fy, row);
      provenance[`fy:${fy}`] = { sourceFile: s.fileName, confidence: 80 };
    }
  }

  return [...byFy.values()].sort((a, b) => a.fy.localeCompare(b.fy));
}
