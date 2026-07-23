import type { DocumentChunk, DocumentRecord, ExtractedFact, FactConflict } from "../types";
import { uid } from "../store";
import { extractFactsFromChunk, paceAI, type AiFact } from "../ai/provider";

/**
 * Fact layer: every value the platform uses carries provenance
 * (document, pages, extraction method, confidence, review status).
 */

// canonical fact → human label + prospectus sections it feeds
export const FACT_META: Record<string, { label: string; sections: string[] }> = {
  revenueCr: { label: "Revenue from operations", sections: ["Summary of Financial Information", "Restated Financial Statements", "Management's Discussion and Analysis"] },
  patCr: { label: "Profit after tax", sections: ["Summary of Financial Information", "Other Financial Information", "Basis for Issue Price"] },
  ebitdaCr: { label: "EBITDA", sections: ["Summary of Financial Information", "Accounting Ratios and KPIs"] },
  netWorthCr: { label: "Net worth", sections: ["Other Financial Information", "Capitalisation Statement"] },
  borrowingsCr: { label: "Total borrowings", sections: ["Statement of Financial Indebtedness", "Capitalisation Statement"] },
  receivablesCr: { label: "Trade receivables", sections: ["Management's Discussion and Analysis", "Accounting Ratios and KPIs"] },
  cfoCr: { label: "Cash flow from operations", sections: ["Management's Discussion and Analysis"] },
  gstTurnoverCr: { label: "GST turnover", sections: ["Management's Discussion and Analysis"] },
  cin: { label: "CIN", sections: ["General Information", "History and Certain Corporate Matters"] },
  gstin: { label: "GSTIN", sections: ["Government and Other Statutory Approvals"] },
  pan: { label: "PAN", sections: ["Our Promoters and Promoter Group"] },
  din: { label: "DIN", sections: ["Our Management", "Our Promoters and Promoter Group"] },
  litigationDeclared: { label: "Litigation declaration", sections: ["Outstanding Litigation and Material Developments", "Summary of Outstanding Litigation"] },
  demandNoticeCr: { label: "Tax/regulatory demand", sections: ["Outstanding Litigation and Material Developments"] },
  quotationAmountCr: { label: "Capex quotation amount", sections: ["Objects of the Issue"] },
  wcRequirementCr: { label: "Working capital requirement", sections: ["Objects of the Issue"] },
  rptPurchasesCr: { label: "Related-party purchases", sections: ["Related Party Transactions"] },
  promoterLoanCr: { label: "Promoter-group loan", sections: ["Related Party Transactions", "Statement of Financial Indebtedness"] },
  authorisedCapitalCr: { label: "Authorised share capital", sections: ["Capital Structure"] },
  leaseValidTill: { label: "Facility lease valid till", sections: ["Our Business", "Material Contracts and Documents for Inspection"] },
  boardResolutionDate: { label: "Board resolution (IPO) date", sections: ["General Information", "Other Regulatory and Statutory Disclosures"] },
};

/** "aggregateTaxableTurnoverCr" → "Aggregate Taxable Turnover (₹ Cr)" */
export function humanizeLabel(s: string): string {
  if (!s) return s;
  if (/\s/.test(s) && !/[a-z][A-Z]/.test(s)) return s; // already human text
  let t = s.replace(/Cr$/, "").replace(/[_-]+/g, " ")
    .replace(/([a-z\d])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .trim();
  t = t.charAt(0).toUpperCase() + t.slice(1);
  // keep well-known acronyms upper-case
  t = t.replace(/\b(cin|gst|gstin|pan|din|ipo|rpt|ebitda|pat|cfo|fy|moa|aoa|kyc)\b/gi, (m) => m.toUpperCase());
  return /Cr$/.test(s) ? `${t} (₹ Cr)` : t;
}

const factLabel = (key: string) => FACT_META[key]?.label ?? humanizeLabel(key);
const factSections = (key: string) => FACT_META[key]?.sections ?? [];

// ── Chunking ────────────────────────────────────────────────────────────────

const estTokens = (s: string) => Math.ceil(s.length / 4);

export function buildChunks(doc: DocumentRecord, pages: string[]): DocumentChunk[] {
  const chunks: DocumentChunk[] = [];
  let start = 0;
  while (start < pages.length) {
    let end = start;
    let text = pages[start];
    // up to 3 pages per chunk, capped ~4000 tokens
    while (end + 1 < pages.length && end - start < 2 && estTokens(text + pages[end + 1]) < 4000) {
      end++;
      text += "\n" + pages[end];
    }
    const headings = (text.match(/^[A-Z][A-Z &/,-]{6,60}$/gm) ?? []).slice(0, 6);
    chunks.push({
      id: uid("ch"),
      documentId: doc.id,
      companyId: doc.companyId,
      pageStart: start + 1,
      pageEnd: end + 1,
      text: text.slice(0, 12000),
      detectedHeadings: headings,
      tokenEstimate: estTokens(text),
      processingStatus: "pending",
    });
    start = end + 1;
  }
  return chunks;
}

// ── Pattern-based facts (from regex fields, with page location) ─────────────

function findPage(pages: string[], needle: string): number | null {
  if (!needle) return null;
  for (let i = 0; i < pages.length; i++) {
    if (pages[i].includes(needle)) return i + 1;
  }
  return null;
}

export function factsFromFields(doc: DocumentRecord, pages: string[]): ExtractedFact[] {
  const now = new Date().toISOString();
  const out: ExtractedFact[] = [];
  for (const [key, value] of Object.entries(doc.fields)) {
    if (value === undefined || value === null || key === "rptEntityNames" || key === "quotationHasGstin" || key === "fy") continue;
    const valueStr = String(value);
    const page = typeof value === "string" ? findPage(pages, valueStr) : null;
    out.push({
      id: uid("fact"),
      companyId: doc.companyId,
      documentId: doc.id,
      chunkId: null,
      factKey: key,
      factLabel: factLabel(key),
      factValue: valueStr,
      normalizedValue: valueStr,
      financialYear: (doc.fields.fy as string) ?? null,
      unit: /Cr$/.test(key) ? "INR crore" : null,
      confidence: Math.min(90, doc.confidence + 5),
      sourceFileName: doc.fileName,
      pageStart: page,
      pageEnd: page,
      linkedProspectusSections: factSections(key),
      status: doc.confidence >= 60 ? "ACCEPTED" : "NEEDS_REVIEW",
      extractionMethod: "pattern",
      createdAt: now,
      updatedAt: now,
    });
  }
  return out;
}

// ── AI facts (chunk-wise) ───────────────────────────────────────────────────

const MAX_AI_CHUNKS_PER_DOC = 12;

export async function aiFactsForDocument(
  doc: DocumentRecord, chunks: DocumentChunk[]
): Promise<ExtractedFact[]> {
  const now = new Date().toISOString();
  const out: ExtractedFact[] = [];
  const batch = chunks.slice(0, MAX_AI_CHUNKS_PER_DOC);
  for (const chunk of batch) {
    try {
      const aiFacts: AiFact[] = await extractFactsFromChunk(chunk, doc.fileName, doc.category);
      chunk.processingStatus = "processed";
      for (const f of aiFacts) {
        out.push({
          id: uid("fact"),
          companyId: doc.companyId,
          documentId: doc.id,
          chunkId: chunk.id,
          factKey: f.factKey,
          factLabel: FACT_META[f.factKey]?.label ?? humanizeLabel(f.factLabel || f.factKey),
          factValue: f.factValue,
          normalizedValue: f.normalizedValue || f.factValue,
          financialYear: f.financialYear ?? null,
          unit: f.unit ?? null,
          confidence: Math.max(0, Math.min(100, Math.round(f.confidence ?? 60))),
          sourceFileName: doc.fileName,
          pageStart: chunk.pageStart,
          pageEnd: chunk.pageEnd,
          linkedProspectusSections: factSections(f.factKey),
          status: (f.confidence ?? 60) >= 70 ? "ACCEPTED" : "NEEDS_REVIEW",
          extractionMethod: "ai",
          createdAt: now,
          updatedAt: now,
        });
      }
    } catch {
      chunk.processingStatus = "failed";
    }
    await paceAI(); // stay under free-tier per-minute limits
  }
  for (const c of chunks.slice(MAX_AI_CHUNKS_PER_DOC)) c.processingStatus = "skipped";
  return out;
}

// ── Merge & conflicts ───────────────────────────────────────────────────────

/** Dedupe facts within a document: same key+FY keeps the highest-confidence one. */
export function mergeFacts(facts: ExtractedFact[]): ExtractedFact[] {
  const byKey = new Map<string, ExtractedFact>();
  for (const f of facts) {
    const k = `${f.documentId}|${f.factKey}|${f.financialYear ?? ""}`;
    const existing = byKey.get(k);
    if (!existing || f.confidence > existing.confidence) byKey.set(k, f);
  }
  return [...byKey.values()];
}

/**
 * Same fact key + FY reported differently by different documents → conflict.
 * Only keys with exactly ONE true value per company/year are compared —
 * identifiers that legitimately repeat across people/entities (DIN, PAN,
 * entity names, dates) would produce false conflicts and are excluded.
 */
const CONFLICTABLE = (key: string) =>
  /Cr$/.test(key) || ["cin", "gstin", "authorisedCapital", "top3CustomerPct", "employeeCount"].includes(key);

export function detectConflicts(companyId: string, facts: ExtractedFact[]): FactConflict[] {
  const conflicts: FactConflict[] = [];
  const groups = new Map<string, ExtractedFact[]>();
  for (const f of facts) {
    if (f.status === "REJECTED" || !CONFLICTABLE(f.factKey)) continue;
    const k = `${f.factKey}|${f.financialYear ?? ""}`;
    groups.set(k, [...(groups.get(k) ?? []), f]);
  }
  for (const [, group] of groups) {
    const byDoc = new Map<string, ExtractedFact>();
    for (const f of group) if (!byDoc.has(f.documentId)) byDoc.set(f.documentId, f);
    const arr = [...byDoc.values()];
    for (let i = 0; i < arr.length; i++) {
      for (let j = i + 1; j < arr.length; j++) {
        const a = parseFloat(arr[i].normalizedValue);
        const b = parseFloat(arr[j].normalizedValue);
        const bothNumeric = isFinite(a) && isFinite(b);
        const differs = bothNumeric
          ? Math.abs(a - b) > Math.max(0.02 * Math.max(Math.abs(a), Math.abs(b)), 0.01)
          : arr[i].normalizedValue.trim().toLowerCase() !== arr[j].normalizedValue.trim().toLowerCase();
        if (differs) {
          conflicts.push({
            id: uid("cf"),
            companyId,
            factKey: arr[i].factKey,
            valueA: arr[i].normalizedValue,
            valueB: arr[j].normalizedValue,
            sourceA: `${arr[i].sourceFileName}${arr[i].pageStart ? ` p.${arr[i].pageStart}` : ""}`,
            sourceB: `${arr[j].sourceFileName}${arr[j].pageStart ? ` p.${arr[j].pageStart}` : ""}`,
            severity: bothNumeric && Math.abs(a - b) / Math.max(Math.abs(a), Math.abs(b), 0.01) > 0.1 ? "High" : "Medium",
            explanation: `${arr[i].factLabel}${arr[i].financialYear ? ` (${arr[i].financialYear})` : ""} is reported as ${arr[i].normalizedValue} in one document and ${arr[j].normalizedValue} in another. Reconcile before drafting.`,
            status: "OPEN",
          });
        }
      }
    }
  }
  return conflicts;
}

/**
 * Sync accepted facts back into doc.fields (canonical keys) so the
 * deterministic rule engine sees AI-extracted and promoter-corrected values.
 */
export function syncFieldsFromFacts(doc: DocumentRecord, facts: ExtractedFact[]) {
  const docFacts = facts.filter((f) => f.documentId === doc.id && f.status !== "REJECTED");
  for (const f of docFacts) {
    if (!(f.factKey in FACT_META)) continue;
    const isNum = /Cr$/.test(f.factKey);
    const v = isNum ? parseFloat(f.normalizedValue) : f.normalizedValue;
    if (isNum && !isFinite(v as number)) continue;
    if (doc.fields[f.factKey] === undefined || f.status === "PROMOTER_EDITED") {
      doc.fields[f.factKey] = v;
    }
  }
}
