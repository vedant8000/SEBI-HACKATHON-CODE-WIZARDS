import type {
  AnalysisResult, Company, DocumentRecord, DraftSection, ExtractedFact,
  ObjectOfIssue, SourceRef,
} from "../types";
import { uid } from "../store";
import {
  SME_PROSPECTUS_BLUEPRINT, PRIORITY_SECTION_IDS, type BlueprintSection,
} from "../ipo-blueprint/sme-prospectus-blueprint";
import { buildCoverage } from "./coverage";
import { generateSectionDeterministic, type DetCtx } from "./draft-template";
import { aiAvailable, generateSectionAI, paceAI } from "../ai/provider";

/**
 * Blueprint-driven, source-linked draft generator.
 *
 * For each section of the real SME prospectus blueprint:
 *  1. gather the extracted facts (with document + page provenance) that the
 *     blueprint says this section needs,
 *  2. gather open gaps / rule failures affecting the section,
 *  3. send ONLY that context to the AI with strict no-invention rules,
 *  4. omit missing data — never hallucinated text.
 *
 * When no AI provider is configured, or every key is rate-limited (the AI call
 * returns null), the deterministic rule-based generator (lib/engine/draft-template.ts)
 * composes the same sections from the extracted facts — so a draft is always
 * produced. Each section records which engine produced it (generatedBy).
 */

export const DRAFT_SECTION_NAMES = SME_PROSPECTUS_BLUEPRINT.map((s) => s.sectionName);

function sectionFacts(s: BlueprintSection, facts: ExtractedFact[]): ExtractedFact[] {
  const keys = new Set([...s.requiredFacts, ...s.helpfulFacts]);
  return facts.filter(
    (f) =>
      f.status !== "REJECTED" &&
      (keys.has(f.factKey) || f.linkedProspectusSections.includes(s.sectionName))
  );
}

function factsContext(list: ExtractedFact[]): string {
  return list
    .slice(0, 40)
    .map(
      (f) =>
        `- ${f.factLabel}${f.financialYear ? ` (${f.financialYear})` : ""}: ${f.normalizedValue}${f.unit ? ` ${f.unit}` : ""} [source: ${f.sourceFileName}${f.pageStart ? `, p.${f.pageStart}${f.pageEnd && f.pageEnd !== f.pageStart ? `-${f.pageEnd}` : ""}` : ""}; confidence ${f.confidence}%${f.status === "PROMOTER_EDITED" ? "; PROMOTER EDITED — verification required" : ""}]`
    )
    .join("\n");
}

function profileContext(company: Company, objects: ObjectOfIssue[]): string {
  const fin = company.financials.filter((f) => f.revenueCr != null);
  return [
    `Name: ${company.name || "—"} | CIN: ${company.cin || "—"} | Industry: ${company.industry || "—"} | Location: ${[company.city, company.state].filter(Boolean).join(", ") || "—"} | Incorporated: ${company.yearOfIncorporation ?? "—"}`,
    `Promoter: ${company.promoterName || "—"} (${company.promoterExperienceYears ?? "—"} yrs experience)`,
    `Issue: total ₹${company.issueSizeCr ?? "—"} Cr (fresh ₹${company.freshIssueCr ?? "—"} Cr, OFS ₹${company.ofsCr ?? "—"} Cr) on ${company.proposedListingExchange}`,
    fin.length ? `Financials (profile): ${fin.map((f) => `${f.fy} rev ₹${f.revenueCr}Cr PAT ₹${f.patCr ?? "—"}Cr NW ₹${f.netWorthCr ?? "—"}Cr`).join("; ")}` : "Financials: not entered",
    company.top3CustomerPct != null ? `Top-3 customer share: ${company.top3CustomerPct}%` : "",
    objects.length ? `Objects plan: ${objects.map((o) => `${o.category} ₹${o.amountCr}Cr${o.warning ? ` (warning: ${o.warning})` : ""}`).join("; ")}` : "Objects plan: not defined",
  ].filter(Boolean).join("\n");
}

function sourcesFor(list: ExtractedFact[]): SourceRef[] {
  const seen = new Map<string, SourceRef>();
  for (const f of list) {
    const key = `${f.sourceFileName}|${f.pageStart ?? ""}`;
    if (!seen.has(key))
      seen.set(key, {
        document: f.sourceFileName,
        detail: f.pageStart ? `p.${f.pageStart}${f.pageEnd && f.pageEnd !== f.pageStart ? `-${f.pageEnd}` : ""} · ${f.factLabel}` : f.factLabel,
      });
  }
  return [...seen.values()].slice(0, 8);
}

export async function generateBlueprintSection(
  s: BlueprintSection,
  company: Company,
  docs: DocumentRecord[],
  facts: ExtractedFact[],
  objects: ObjectOfIssue[],
  analysis: AnalysisResult | null,
  opts: { preferAi?: boolean } = {}
): Promise<DraftSection> {
  const preferAi = opts.preferAi ?? true;
  const coverage = buildCoverage(company, docs, facts, objects, analysis?.gaps ?? []);
  const row = coverage.find((c) => c.sectionId === s.sectionId)!;
  const sf = sectionFacts(s, facts);
  const gaps = (analysis?.gaps ?? []).filter(
    (g) => g.affectedSection === s.sectionName && g.status !== "Resolved"
  );

  const base: DraftSection = {
    id: uid("s"),
    companyId: company.id,
    sectionName: s.sectionName,
    generatedText: "",
    confidence: 0,
    status: "Not Started",
    sources: sourcesFor(sf),
    missingData: row.missingFacts,
    comments: [],
    updatedAt: new Date().toISOString(),
  };

  const factConf = sf.length ? sf.reduce((x, f) => x + f.confidence, 0) / sf.length : 50;
  const detCtx: DetCtx = { company, docs, facts, objects, analysis, row };

  /** Deterministic rule-based section — the offline / rate-limit fallback. */
  const composeDeterministic = (): DraftSection => {
    const text = generateSectionDeterministic(s, detCtx);
    if (!text) {
      base.generatedText =
        `This section (${s.purpose.toLowerCase()}) needs more source data before it can be drafted.` +
        (row.missingFacts.length ? ` Still needed: ${row.missingFacts.join("; ")}.` : "");
      base.generatedBy = "rule-based";
      return base;
    }
    base.generatedText = text;
    base.status = "AI Drafted";
    base.generatedBy = "rule-based";
    base.confidence = Math.round(0.35 * factConf + 0.65 * row.completionPct);
    return base;
  };

  // Standard-language sections and the no-key case use the deterministic
  // generator directly — AI calls are reserved for company-specific sections.
  if (!preferAi || !aiAvailable()) return composeDeterministic();

  const text = await generateSectionAI({
    sectionName: s.sectionName,
    purpose: s.purpose,
    draftingInstructions: s.draftingInstructions,
    companyProfile: profileContext(company, objects),
    factsContext: factsContext(sf),
    gapsContext: gaps.map((g) => `[${g.severity}] ${g.title}: ${g.explanation}`).join("\n"),
    riskWarnings: s.riskWarnings,
  });

  // AI unavailable at call time (rate-limited / quota exhausted) → deterministic fallback.
  if (!text) return composeDeterministic();

  base.generatedText = text.trim();
  base.status = "AI Drafted";
  base.generatedBy = "ai";
  base.confidence = Math.round(0.5 * factConf + 0.5 * row.completionPct);
  return base;
}

/**
 * Generate the FULL blueprint (all sections) or a named subset.
 *
 * AI calls are spent only on the priority (company-specific) sections; the
 * standard/boilerplate sections are composed deterministically — so a complete
 * offer document is produced in both AI and fallback modes, and generation
 * stays fast and within free-tier limits.
 */
export async function generateDraft(
  company: Company,
  docs: DocumentRecord[],
  facts: ExtractedFact[],
  objects: ObjectOfIssue[],
  analysis: AnalysisResult | null,
  sectionIds?: string[]
): Promise<DraftSection[]> {
  const sections = sectionIds?.length
    ? SME_PROSPECTUS_BLUEPRINT.filter((s) => sectionIds.includes(s.sectionId))
    : SME_PROSPECTUS_BLUEPRINT;
  const out: DraftSection[] = [];
  for (const s of sections) {
    const preferAi = PRIORITY_SECTION_IDS.includes(s.sectionId);
    out.push(await generateBlueprintSection(s, company, docs, facts, objects, analysis, { preferAi }));
    if (preferAi && aiAvailable()) await paceAI(); // pace only real AI calls
  }
  return out;
}

export function blueprintByName(sectionName: string): BlueprintSection | undefined {
  return SME_PROSPECTUS_BLUEPRINT.find((s) => s.sectionName === sectionName);
}
