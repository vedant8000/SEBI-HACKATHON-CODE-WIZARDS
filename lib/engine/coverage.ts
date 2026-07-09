import { SME_PROSPECTUS_BLUEPRINT, type BlueprintSection } from "../ipo-blueprint/sme-prospectus-blueprint";
import type { Company, CoverageRow, DocumentRecord, ExtractedFact, Gap, ObjectOfIssue } from "../types";

/**
 * IPO Coverage Matrix — for every section of the real SME prospectus
 * blueprint, computes what facts/documents are available vs missing.
 * Powers the dashboard, heatmap, draft-readiness and gap prioritisation.
 */

function factSatisfied(
  key: string, company: Company, facts: ExtractedFact[], docs: DocumentRecord[], objects: ObjectOfIssue[]
): boolean {
  if (key.startsWith("profile:")) {
    const f = key.slice(8);
    const v = (company as unknown as Record<string, unknown>)[f];
    return v !== null && v !== undefined && v !== "";
  }
  if (key === "objects:total") return objects.length > 0;
  if (key === "restated:present") return docs.some((d) => d.category === "Restated Financials");
  if (key === "peer:data") return false; // requires uploaded/manual peer data
  return facts.some((f) => f.factKey === key && f.status !== "REJECTED");
}

const label = (key: string) =>
  key.startsWith("profile:") ? `${key.slice(8)} (Company Setup)` :
  key === "objects:total" ? "Objects plan (Objects Builder)" :
  key === "restated:present" ? "Restated financial statements" :
  key === "peer:data" ? "Peer data (upload/manual)" : key;

export function buildCoverage(
  company: Company,
  docs: DocumentRecord[],
  facts: ExtractedFact[],
  objects: ObjectOfIssue[],
  gaps: Gap[]
): CoverageRow[] {
  const live = facts.filter((f) => f.status !== "REJECTED");
  return SME_PROSPECTUS_BLUEPRINT.map((s: BlueprintSection) => {
    const reqHave = s.requiredFacts.filter((k) => factSatisfied(k, company, live, docs, objects));
    const reqMiss = s.requiredFacts.filter((k) => !factSatisfied(k, company, live, docs, objects));
    const helpHave = s.helpfulFacts.filter((k) => factSatisfied(k, company, live, docs, objects));
    const docsHave = s.requiredDocumentTypes.filter((c) => docs.some((d) => d.category === c));
    const docsMiss = s.requiredDocumentTypes.filter((c) => !docs.some((d) => d.category === c));

    const factScore = s.requiredFacts.length
      ? reqHave.length / s.requiredFacts.length
      : 1;
    const helpScore = s.helpfulFacts.length ? helpHave.length / s.helpfulFacts.length : 1;
    const docScore = s.requiredDocumentTypes.length
      ? docsHave.length / s.requiredDocumentTypes.length
      : 1;
    const completionPct = Math.round((0.55 * factScore + 0.15 * helpScore + 0.3 * docScore) * 100);

    const sectionFacts = live.filter((f) =>
      s.requiredFacts.includes(f.factKey) || s.helpfulFacts.includes(f.factKey));
    const avgConfidence = sectionFacts.length
      ? Math.round(sectionFacts.reduce((sum, f) => sum + f.confidence, 0) / sectionFacts.length)
      : 0;
    const sourceDocs = [...new Set(sectionFacts.map((f) => f.sourceFileName))].slice(0, 4);

    const sectionGaps = gaps.filter((g) => g.affectedSection === s.sectionName && g.status !== "Resolved");
    const hasCritical = sectionGaps.some((g) => g.severity === "Critical");

    const canGenerate: CoverageRow["canGenerate"] =
      completionPct >= 70 ? "YES"
        : completionPct >= 30 || s.canGenerateWithPartialData ? "PARTIAL"
          : "NO";

    const riskLevel: CoverageRow["riskLevel"] =
      hasCritical ? "Critical Issue"
        : completionPct < 35 ? "Missing Data"
          : completionPct < 70 || sectionGaps.length ? "Needs Clarification"
            : "Ready";

    return {
      sectionId: s.sectionId,
      sectionName: s.sectionName,
      parentSection: s.parentSection,
      completionPct,
      availableFacts: [...reqHave, ...helpHave].map(label),
      missingFacts: [...reqMiss, ...docsMiss.map((d) => `${d} (document)`)].map(label),
      sourceDocs,
      avgConfidence,
      riskLevel,
      canGenerate,
      professionalReviewRequired: s.professionalReviewRequired,
    };
  });
}

export function coverageSummary(rows: CoverageRow[]) {
  const avg = Math.round(rows.reduce((s, r) => s + r.completionPct, 0) / (rows.length || 1));
  return {
    avgCompletion: avg,
    generatable: rows.filter((r) => r.canGenerate === "YES").length,
    partial: rows.filter((r) => r.canGenerate === "PARTIAL").length,
    blocked: rows.filter((r) => r.canGenerate === "NO").length,
    critical: rows.filter((r) => r.riskLevel === "Critical Issue").length,
  };
}
