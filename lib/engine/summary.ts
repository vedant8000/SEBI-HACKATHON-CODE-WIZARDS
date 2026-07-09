import type { AnalysisResult, Company, DraftSection } from "../types";

export type SummaryMode = "promoter" | "investor" | "risk";
export type SummaryLang = "en" | "hi";

/**
 * Plain-language summaries generated from computed analysis — written for an
 * SME promoter first (simple sentences, no jargon), with a Hinglish variant.
 */
export function generateSummary(
  mode: SummaryMode,
  lang: SummaryLang,
  company: Company,
  analysis: AnalysisResult | null,
  draft: DraftSection[]
): string {
  const fin = company.financials.filter((f) => f.revenueCr != null);
  const last = fin[fin.length - 1];
  const score = analysis?.scores.overall ?? 0;
  const critical = analysis?.gaps.filter((g) => g.severity === "Critical" && g.status !== "Resolved") ?? [];
  const high = analysis?.gaps.filter((g) => g.severity === "High" && g.status !== "Resolved") ?? [];
  const topRpt = analysis?.rptRisks?.[0];
  const drafted = draft.filter((d) => d.status !== "Not Started").length;

  if (lang === "hi") {
    if (mode === "promoter")
      return [
        `${company.name || "Aapki company"} ka IPO readiness score abhi ${score}/100 hai.`,
        last ? `Pichle saal ka revenue ₹${last.revenueCr} crore aur profit ₹${last.patCr ?? "—"} crore records me mila.` : "Financial data abhi poori nahi hai — audited statements upload karein ya profile me bharein.",
        critical.length ? `${critical.length} critical issue(s) hain jo sabse pehle theek karne hain: ${critical.map((g) => g.title).join("; ")}.` : "Koi critical blocker nahi mila.",
        high.length ? `${high.length} high-risk item(s) par bhi kaam karna hoga.` : "",
        topRpt ? `Dhyan dein: ${topRpt.entityName} ke saath transaction ko clearly disclose karna zaroori hai.` : "",
        `Draft ke ${drafted} section tayyar hain. Yaad rakhein — yeh sirf ek AI-assisted draft hai; merchant banker aur legal review ke bina file nahi ho sakta.`,
      ].filter(Boolean).join("\n\n");
    if (mode === "investor")
      return [
        `${company.name} ${company.industry ? company.industry.toLowerCase() + " " : ""}business hai${company.city ? ` (${company.city}, ${company.state})` : ""}.`,
        last ? `Latest saal me revenue ₹${last.revenueCr} crore aur PAT ₹${last.patCr ?? "—"} crore raha.` : "",
        company.issueSizeCr ? `Company ₹${company.issueSizeCr} crore ka SME IPO laana chahti hai (${company.proposedListingExchange}).` : "",
        `Investor ko risk factors dhyan se padhne chahiye — khaas kar customer concentration, receivables aur related-party transactions.`,
      ].filter(Boolean).join("\n\n");
    return [
      `Key risks (simple bhasha me):`,
      ...(analysis?.gaps.slice(0, 6).map((g) => `• ${g.title} — ${g.severity}`) ?? []),
      topRpt ? `• Related-party risk: ${topRpt.entityName} (score ${topRpt.riskScore}/100)` : "",
      `In sab par merchant banker/legal review zaroori hai.`,
    ].filter(Boolean).join("\n");
  }

  if (mode === "promoter")
    return [
      `Where you stand: your IPO readiness score is ${score}/100 — ${analysis?.scores.statusLine ?? "run the analysis to see your status"}.`,
      last ? `From your uploads we read: latest-year revenue ₹${last.revenueCr} crore, profit after tax ₹${last.patCr ?? "—"} crore, net worth ₹${last.netWorthCr ?? "—"} crore.` : "We don't yet have enough financial data — upload audited statements or fill the financial profile.",
      critical.length
        ? `Fix these first (${critical.length} critical): ${critical.map((g) => g.title).join("; ")}.`
        : "No critical blockers detected in the data we can see.",
      high.length ? `Then work through ${high.length} high-priority item(s), starting with: ${high.slice(0, 3).map((g) => g.title).join("; ")}.` : "",
      topRpt ? `One thing reviewers will definitely ask about: your transactions with ${topRpt.entityName}. Prepare pricing justification and approvals now.` : "",
      `${drafted} of ${draft.length || 13} draft sections are generated, each linked to your source documents. Remember: this is an AI-assisted draft to prepare you — your merchant banker and legal counsel must review everything before any filing.`,
    ].filter(Boolean).join("\n\n");

  if (mode === "investor")
    return [
      `${company.name || "The company"} is ${company.industry ? `a ${company.industry.toLowerCase()} business` : "an SME"}${company.city ? ` based in ${company.city}, ${company.state}` : ""}${company.yearOfIncorporation ? `, operating since ${company.yearOfIncorporation}` : ""}.`,
      fin.length >= 2 ? `Reported revenue grew from ₹${fin[0].revenueCr} crore to ₹${last?.revenueCr} crore over ${fin.length} years, with latest PAT of ₹${last?.patCr ?? "—"} crore.` : "",
      company.issueSizeCr ? `It proposes to raise ₹${company.issueSizeCr} crore via an SME IPO on ${company.proposedListingExchange}${company.ofsCr ? `, of which ₹${company.ofsCr} crore is an offer for sale by the promoter` : ""}.` : "",
      `Prospective investors should read the risk factors carefully — in particular ${[
        company.top3CustomerPct && company.top3CustomerPct > 40 ? "customer concentration" : null,
        topRpt ? "related-party transactions" : null,
        "receivables and cash-flow quality",
      ].filter(Boolean).join(", ")}.`,
      `This summary is generated from a draft under preparation and is not an offer document.`,
    ].filter(Boolean).join("\n\n");

  // risk mode
  return [
    `Top red flags identified by the engine:`,
    ...(analysis?.gaps
      .filter((g) => g.status !== "Resolved")
      .sort((a, b) => ["Critical", "High", "Medium", "Low"].indexOf(a.severity) - ["Critical", "High", "Medium", "Low"].indexOf(b.severity))
      .slice(0, 8)
      .map((g) => `• [${g.severity}] ${g.title} — ${g.explanation}`) ?? ["Run the analysis first."]),
    ...(analysis?.rptRisks.map((r) => `• [RPT ${r.riskScore}/100] ${r.entityName}: ${r.reason}`) ?? []),
    ...(analysis?.financialChecks.filter((f) => f.severity !== "Low").map((f) => `• [${f.severity}] ${f.checkName}: ${f.explanation}`) ?? []),
    `\nAll items above require merchant banker / legal review — this tool prepares the ground, it does not clear it.`,
  ].join("\n");
}

// ── Savings estimator (illustrative, computed from actual workload) ────────

export function estimateSavings(analysis: AnalysisResult | null, draft: DraftSection[], docCount: number) {
  const gapsFound = analysis?.gaps.length ?? 0;
  const sourceLinked = draft.reduce((s, d) => s + d.sources.length, 0);
  const checksRun = (analysis?.checks.length ?? 0) + (analysis?.financialChecks.length ?? 0);
  return {
    traditionalDays: "90–120 days",
    aiAssistedDays: "25–35 days",
    daysSaved: "≈ 60–85 days",
    gapsFoundEarly: gapsFound,
    sourceLinkedDisclosures: sourceLinked,
    checksAutomated: checksRun,
    documentsProcessed: docCount,
    professionalHoursSaved: `${Math.min(120, 40 + gapsFound * 4)}–${Math.min(160, 80 + gapsFound * 4)} hours`,
    reworkReduction: gapsFound ? "≈ 45%" : "—",
    estimatedCostSaved: `₹${(Math.min(120, 40 + gapsFound * 4) * 5000 / 100000).toFixed(1)}–${(Math.min(160, 80 + gapsFound * 4) * 5000 / 100000).toFixed(1)} lakh`,
    disclaimer: "Estimates are illustrative and depend on company complexity, document quality and intermediary review. They are not guarantees.",
  };
}
