import type {
  AnalysisResult, Company, DocumentRecord, DraftSection, ExtractedFact,
  ObjectOfIssue, SourceRef,
} from "../types";
import { uid } from "../store";
import {
  SME_PROSPECTUS_BLUEPRINT, PRIORITY_SECTION_IDS, type BlueprintSection,
} from "../ipo-blueprint/sme-prospectus-blueprint";
import { buildCoverage } from "./coverage";
import { aiAvailable, generateSectionAI, paceAI } from "../ai/provider";

/**
 * Blueprint-driven, source-linked draft generator.
 *
 * For each section of the real SME prospectus blueprint:
 *  1. gather the extracted facts (with document + page provenance) that the
 *     blueprint says this section needs,
 *  2. gather open gaps / rule failures affecting the section,
 *  3. send ONLY that context to the AI with strict no-invention rules,
 *  4. insert [Promoter confirmation required] placeholders where data is
 *     missing — never hallucinated text.
 *
 * Requires a configured AI provider. Without one, sections are created as
 * placeholders that list exactly what is needed — no fake AI output.
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
  analysis: AnalysisResult | null
): Promise<DraftSection> {
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

  if (!aiAvailable()) {
    base.generatedText =
      `[Not generated — AI provider not configured.]\n\nThis section (${s.purpose.toLowerCase()}) will be generated from your uploaded documents once an AI API key is set.` +
      (row.missingFacts.length ? `\n\nData still needed: ${row.missingFacts.join("; ")}.` : "");
    return base;
  }

  if (row.canGenerate === "NO") {
    base.generatedText =
      `[Cannot generate yet — insufficient data (coverage ${row.completionPct}%).]\n\nRequired before drafting: ${row.missingFacts.join("; ") || "core inputs"}.\n\nUpload the documents above or enter the facts manually in Extraction & Evidence.`;
    return base;
  }

  const text = await generateSectionAI({
    sectionName: s.sectionName,
    purpose: s.purpose,
    draftingInstructions: s.draftingInstructions,
    companyProfile: profileContext(company, objects),
    factsContext: factsContext(sf),
    gapsContext: gaps.map((g) => `[${g.severity}] ${g.title}: ${g.explanation}`).join("\n"),
    riskWarnings: s.riskWarnings,
  });

  if (!text) {
    base.generatedText = `[Generation failed — the AI provider did not respond (possibly rate-limited). Use "Regenerate section" to retry.]`;
    return base;
  }

  base.generatedText = text.trim();
  base.status = "AI Drafted";
  const factConf = sf.length ? sf.reduce((x, f) => x + f.confidence, 0) / sf.length : 50;
  base.confidence = Math.round(0.5 * factConf + 0.5 * row.completionPct);
  return base;
}

/** Generate the priority sections (substantive content) or a named subset. */
export async function generateDraft(
  company: Company,
  docs: DocumentRecord[],
  facts: ExtractedFact[],
  objects: ObjectOfIssue[],
  analysis: AnalysisResult | null,
  sectionIds?: string[]
): Promise<DraftSection[]> {
  const ids = sectionIds?.length ? sectionIds : PRIORITY_SECTION_IDS;
  const sections = SME_PROSPECTUS_BLUEPRINT.filter((s) => ids.includes(s.sectionId));
  const out: DraftSection[] = [];
  for (const s of sections) {
    out.push(await generateBlueprintSection(s, company, docs, facts, objects, analysis));
    await paceAI(); // stay under free-tier per-minute limits
  }
  return out;
}

export function blueprintByName(sectionName: string): BlueprintSection | undefined {
  return SME_PROSPECTUS_BLUEPRINT.find((s) => s.sectionName === sectionName);
}
