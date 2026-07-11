import type { AnalysisResult, Company, DocumentChunk, DraftSection, ExtractedFact } from "../types";

/**
 * AI provider layer — real API-backed.
 *
 * AI_PROVIDER = gemini | anthropic | openai   (keys via env)
 *
 * Division of labour (by design):
 *  - The LLM classifies documents, extracts structured facts from chunks and
 *    drafts prospectus language from those facts.
 *  - The deterministic rule engine (lib/engine) decides scores, gaps,
 *    warnings and red flags from extracted facts — never the LLM.
 *
 * If no API key is configured, extraction falls back to pattern-based only,
 * AI generation is DISABLED with a clear setup message, and the app never
 * fabricates AI output.
 */

export type AiProviderName = "gemini" | "anthropic" | "openai" | "none";

export function activeProvider(): AiProviderName {
  const p = (process.env.AI_PROVIDER ?? "").toLowerCase();
  if (p === "gemini" && geminiKeys().length) return "gemini";
  if (p === "anthropic" && process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (p === "openai" && process.env.OPENAI_API_KEY) return "openai";
  // auto-detect if AI_PROVIDER unset
  if (geminiKeys().length) return "gemini";
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (process.env.OPENAI_API_KEY) return "openai";
  return "none";
}

export const aiAvailable = () => activeProvider() !== "none";

export const AI_SETUP_MESSAGE =
  "AI provider not configured. Set AI_PROVIDER and the matching API key (GEMINI_API_KEY / ANTHROPIC_API_KEY / OPENAI_API_KEY) in .env.local, then restart. Pattern-based extraction still runs, but AI classification, fact extraction and draft generation are disabled — the app will not fabricate AI output.";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Multiple Gemini keys are supported to survive free-tier rate limits:
 *   GEMINI_API_KEY, GEMINI_API_KEY_2, GEMINI_API_KEY_3, …  (or comma-separated
 *   GEMINI_API_KEYS). On a 429 the call rotates to the next key immediately
 *   instead of only waiting out the window.
 */
export function geminiKeys(): string[] {
  const keys: string[] = [];
  if (process.env.GEMINI_API_KEYS)
    keys.push(...process.env.GEMINI_API_KEYS.split(",").map((k) => k.trim()).filter(Boolean));
  if (process.env.GEMINI_API_KEY) keys.push(process.env.GEMINI_API_KEY);
  for (let i = 2; i <= 9; i++) {
    const k = process.env[`GEMINI_API_KEY_${i}`];
    if (k) keys.push(k);
  }
  return [...new Set(keys)];
}

let geminiKeyCursor = 0;

/**
 * Circuit breaker: when every configured key is rate-limited (e.g. daily
 * free-tier quota exhausted), AI calls short-circuit for a cooldown window
 * instead of stalling uploads/pages with long backoffs. The app degrades to
 * pattern extraction and deterministic rules — never hangs.
 */
let aiCooldownUntil = 0;
export const aiCoolingDown = () => Date.now() < aiCooldownUntil;

/** Single completion call. Rotates keys on rate-limit, retries with backoff. Returns null on failure. */
export async function callAI(prompt: string, opts: { json?: boolean; maxTokens?: number } = {}): Promise<string | null> {
  const provider = activeProvider();
  if (provider === "none") return null;
  if (provider === "gemini" && aiCoolingDown()) return null;
  const keys = provider === "gemini" ? geminiKeys() : [];
  const maxAttempts = provider === "gemini" ? Math.max(3, keys.length * 2) : 3;
  let sawRateLimit = false;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const backoff = 8000 * (Math.floor(attempt / Math.max(1, keys.length)) + 1);
    try {
      if (provider === "gemini") {
        const model = process.env.GEMINI_MODEL ?? "gemini-flash-lite-latest";
        const key = keys[geminiKeyCursor % keys.length];
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
          {
            method: "POST",
            headers: { "x-goog-api-key": key, "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                maxOutputTokens: opts.maxTokens ?? 2048,
                temperature: 0.2,
                ...(opts.json ? { responseMimeType: "application/json" } : {}),
              },
            }),
          }
        );
        if (res.status === 429 || res.status === 503) {
          sawRateLimit = true;
          geminiKeyCursor++; // rotate to the next key
          if (keys.length > 1 && (attempt + 1) % keys.length !== 0) {
            console.warn(`[ai] gemini ${res.status} on key #${(geminiKeyCursor - 1) % keys.length + 1}, rotating to next key`);
            continue; // try next key immediately
          }
          if (attempt >= maxAttempts - 1) break; // exhausted — trip the breaker below
          console.warn(`[ai] gemini ${res.status} on all ${keys.length} key(s), backing off ${backoff}ms`);
          await sleep(backoff); continue;
        }
        if (!res.ok) {
          console.error(`[ai] gemini error ${res.status}: ${(await res.text()).slice(0, 300)}`);
          return null;
        }
        const data = await res.json();
        return data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("") ?? null;
      }
      if (provider === "anthropic") {
        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "x-api-key": process.env.ANTHROPIC_API_KEY!, "anthropic-version": "2023-06-01", "content-type": "application/json" },
          body: JSON.stringify({
            model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5",
            max_tokens: opts.maxTokens ?? 2048,
            messages: [{ role: "user", content: prompt }],
          }),
        });
        if (res.status === 429 || res.status === 529) { await sleep(backoff); continue; }
        if (!res.ok) return null;
        const data = await res.json();
        return data?.content?.[0]?.text ?? null;
      }
      if (provider === "openai") {
        const res = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY!}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
            max_tokens: opts.maxTokens ?? 2048,
            messages: [{ role: "user", content: prompt }],
            ...(opts.json ? { response_format: { type: "json_object" } } : {}),
          }),
        });
        if (res.status === 429) { await sleep(backoff); continue; }
        if (!res.ok) return null;
        const data = await res.json();
        return data?.choices?.[0]?.message?.content ?? null;
      }
    } catch (e) {
      console.error(`[ai] request failed (attempt ${attempt + 1}): ${e instanceof Error ? e.message : e}`);
      if (attempt < 2) { await sleep(2000); continue; }
      return null;
    }
  }
  if (provider === "gemini" && sawRateLimit) {
    aiCooldownUntil = Date.now() + 120_000;
    console.warn("[ai] all gemini keys rate-limited — pausing AI calls for 120s (pattern extraction & rule engine continue)");
  }
  return null;
}

/** Pace sequential AI calls to stay under free-tier per-minute limits. */
export const paceAI = () => sleep(1500);

function parseJson<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    const cleaned = raw.replace(/^```(?:json)?/m, "").replace(/```\s*$/m, "").trim();
    return JSON.parse(cleaned) as T;
  } catch {
    return null;
  }
}

// ── Classification ──────────────────────────────────────────────────────────

export const DOCUMENT_CATEGORIES = [
  "Constitutional", "Financial Statements", "Restated Financials", "Audit Report",
  "Tax Returns", "Banking", "Shareholding / Capital Structure", "KYC",
  "Governance", "Corporate Approvals", "Objects Evidence", "Related Party",
  "Legal", "Licenses & Approvals", "Contracts", "Industry / Business Overview",
  "IPO Process", "Unknown",
];

export async function classifyDocumentAI(
  fileName: string, sampleText: string, headings: string[]
): Promise<{ category: string; confidence: number } | null> {
  const out = parseJson<{ category: string; confidence: number }>(await callAI(
    `Classify this document uploaded for Indian SME IPO preparation into exactly one category from this list:\n${DOCUMENT_CATEGORIES.join(" | ")}\n\nFile name: ${fileName}\nDetected headings: ${headings.join("; ") || "none"}\nFirst pages (may be truncated):\n"""${sampleText.slice(0, 4000)}"""\n\nReturn JSON only: {"category": "<one of the list>", "confidence": <0-100>}`,
    { json: true, maxTokens: 100 }
  ));
  if (out && DOCUMENT_CATEGORIES.includes(out.category)) return out;
  return null;
}

// ── Structured fact extraction (chunk-wise) ─────────────────────────────────

export interface AiFact {
  factKey: string;
  factLabel: string;
  factValue: string;
  normalizedValue: string;
  financialYear: string | null;
  unit: string | null;
  confidence: number;
}

const CANONICAL_KEYS =
  "revenueCr, patCr, ebitdaCr, netWorthCr, borrowingsCr, receivablesCr, cfoCr, gstTurnoverCr, cin, gstin, pan, din, litigationDeclared, demandNoticeCr, quotationAmountCr, wcRequirementCr, rptPurchasesCr, promoterLoanCr, authorisedCapitalCr, leaseValidTill, boardResolutionDate, registeredOffice, promoterName, incorporationYear, employeeCount, top3CustomerPct, interestExpenseCr, dividendDeclared";

export async function extractFactsFromChunk(
  chunk: DocumentChunk, fileName: string, category: string
): Promise<AiFact[]> {
  const out = parseJson<{ facts: AiFact[] } | AiFact[]>(await callAI(
    `You extract structured facts from a document chunk for Indian SME IPO offer-document preparation.

Document: "${fileName}" (category: ${category}), pages ${chunk.pageStart}-${chunk.pageEnd}.
Chunk text:
"""${chunk.text.slice(0, 12000)}"""

Extract every clearly stated fact relevant to an IPO prospectus (financial figures, identifiers, dates, litigation/demand amounts, related-party transactions, quotations, approvals, capital details).
Rules:
- NEVER guess or infer numbers that are not explicitly in the text.
- Monetary values: normalizedValue in ₹ crore as a plain number string (convert lakh→/100, raw ₹→/1e7), unit "INR crore".
- Prefer these canonical factKey values when applicable: ${CANONICAL_KEYS}. Otherwise use a short lowerCamelCase key.
- financialYear like "FY2025" when the fact is year-specific, else null.
- confidence 0-100 reflecting how explicit the statement is.

Return JSON only: {"facts": [{"factKey":"","factLabel":"","factValue":"","normalizedValue":"","financialYear":null,"unit":null,"confidence":0}]}`,
    { json: true, maxTokens: 2000 }
  ));
  if (!out) return [];
  const arr = Array.isArray(out) ? out : out.facts;
  return (arr ?? []).filter((f) => f && f.factKey && f.factValue);
}

// ── Draft section generation ────────────────────────────────────────────────

export async function generateSectionAI(input: {
  sectionName: string;
  purpose: string;
  draftingInstructions: string;
  companyProfile: string;
  factsContext: string;
  gapsContext: string;
  riskWarnings: string[];
}): Promise<string | null> {
  return callAI(
    `You are generating ONE section of a draft SME IPO offer document for merchant banker / legal / auditor review.

Section: ${input.sectionName}
Purpose: ${input.purpose}
Drafting instructions: ${input.draftingInstructions}
${input.riskWarnings.length ? `Known risk warnings for this section: ${input.riskWarnings.join("; ")}` : ""}

Company profile (promoter-entered, treat as manual input):
${input.companyProfile}

Extracted facts with sources (the ONLY facts you may state):
${input.factsContext || "(none extracted yet)"}

Open gaps / rule failures affecting this section:
${input.gapsContext || "(none)"}

STRICT RULES:
- Use ONLY the extracted facts and profile provided. Do not invent names, numbers, dates, approvals, litigation, issue terms, financial values or legal conclusions.
- Write a COMPLETE, polished, flowing section from the data that IS available. Do NOT enumerate, flag or apologise for missing data inside the text — simply omit what is unavailable (missing items are tracked separately by the platform). No bracketed placeholders.
- Present year-wise financial figures and multi-item lists as markdown tables (| Column | ... |) — offer documents are table-heavy.
- Use **bold** sparingly for sub-headings within the section. No top-level heading (the platform adds the section title).
- Formal Indian prospectus-style language. 180-500 words.
- This is an AI-assisted draft, not a regulatory filing — do not claim compliance or approval.

Write the section text now:`,
    { maxTokens: 1600 }
  );
}

// ── Promoter assistant ──────────────────────────────────────────────────────

export async function answerPromoterQuestion(
  question: string,
  company: Company,
  analysis: AnalysisResult | null,
  draft: DraftSection[],
  facts: ExtractedFact[]
): Promise<string> {
  const gaps = analysis?.gaps.filter((g) => g.status !== "Resolved") ?? [];
  const suffix = "\n\nNote: answers come only from your uploaded documents and computed analysis — final judgement rests with your merchant banker and legal counsel.";

  if (!aiAvailable()) {
    // deterministic grounded answers (no fabricated AI output)
    const q = question.toLowerCase();
    if (/missing|upload|document/.test(q)) {
      const missing = [...new Set(gaps.filter((g) => g.requiredDocument && g.requiredDocument !== "—").map((g) => `• ${g.requiredDocument} (${g.affectedSection})`))];
      return missing.length ? `Missing documents/data:\n${missing.join("\n")}${suffix}` : `Nothing critical missing in the current uploads.${suffix}`;
    }
    if (/fix|first|priorit/.test(q)) {
      const ordered = gaps.filter((g) => g.severity === "Critical" || g.severity === "High").slice(0, 5);
      return ordered.length ? `Fix in this order:\n${ordered.map((g, i) => `${i + 1}. [${g.severity}] ${g.title} — ${g.suggestedFix}`).join("\n")}${suffix}` : `No open critical/high gaps.${suffix}`;
    }
    return `AI Q&A requires an API key (${AI_SETUP_MESSAGE}) — but I can still answer "what is missing?" and "what should I fix first?" from the rule engine.${suffix}`;
  }

  const factsCtx = facts.filter((f) => f.status !== "REJECTED").slice(0, 80)
    .map((f) => `${f.factLabel}: ${f.normalizedValue}${f.financialYear ? ` (${f.financialYear})` : ""} [${f.sourceFileName}${f.pageStart ? ` p.${f.pageStart}` : ""}]`).join("\n");
  const gapsCtx = gaps.slice(0, 20).map((g) => `[${g.severity}] ${g.title}: ${g.explanation}`).join("\n");
  const draftCtx = draft.slice(0, 30).map((d) => `${d.sectionName}: ${d.status}, confidence ${d.confidence}%`).join("\n");

  const answer = await callAI(
    `You are SIIM's assistant for an Indian SME promoter preparing an IPO draft. Answer simply and practically (use simple Hindi/Hinglish if the user asks in Hindi). Answer ONLY from the context below. If the answer is not in the context, reply exactly: "I could not find this information in uploaded documents. Please upload supporting evidence or enter it manually." Never give definitive regulatory conclusions — defer final judgement to the merchant banker and legal counsel.

COMPANY: ${company.name} (${company.industry}); readiness ${analysis?.scores.overall ?? "n/a"}/100; RPT risk ${analysis?.scores.rptScore ?? "n/a"}/100.
EXTRACTED FACTS:\n${factsCtx || "(none)"}
OPEN GAPS:\n${gapsCtx || "(none)"}
DRAFT SECTIONS:\n${draftCtx || "(none generated)"}

QUESTION: ${question}`,
    { maxTokens: 700 }
  );
  return (answer ?? "The AI provider did not respond (possibly rate-limited). Please try again in a moment.") + suffix;
}
