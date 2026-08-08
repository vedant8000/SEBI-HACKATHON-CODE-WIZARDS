"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleDashed,
  FileSearch,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  XCircle,
} from "lucide-react";
import type {
  AnalysisResult, CheckStatus, CoverageRow, FactConflict, FinancialCheck, FinancialYear, Gap, ObjectOfIssue, ReadinessCheck, Severity,
} from "@/lib/types";
import {
  Badge, GlassPanel, GlassStat, HeroBackdrop, ProgressBar, ScoreDonut, SeverityBadge,
} from "@/components/shared/ui";
import { CategoryScoreChart } from "@/components/charts/charts";
import ObjectsForm from "@/components/objects/ObjectsForm";
import { rptBand } from "@/lib/rules/scoring-config";
import { prettyLabel } from "@/lib/utils/labels";
import type { PeerBenchmark } from "@/lib/engine/peers";

const TABS = [
  "Overview", "Disclosure Integrity", "SME Framework", "Gaps & Inconsistencies",
  "RPT & Fund Use Risk", "Objects of Issue", "Valuation & Peers", "Exchange Observations",
] as const;

// Tone + label for a single Disclosure-Integrity signal.
const sigTone: Record<string, { cls: string; label: string }> = {
  flag: { cls: "bg-red-100 text-red-800 border-red-300", label: "Likely to be questioned" },
  watch: { cls: "bg-amber-100 text-amber-800 border-amber-300", label: "Keep an eye on" },
  clean: { cls: "bg-emerald-100 text-emerald-800 border-emerald-300", label: "Consistent" },
  na: { cls: "bg-slate-100 text-slate-400 border-slate-200", label: "Not assessed" },
};

// Likelihood a real NSE Emerge / BSE SME reviewer raises the query, from severity.
const likelihood: Record<string, { label: string; cls: string }> = {
  Critical: { label: "Very likely", cls: "bg-red-100 text-red-800 border-red-300" },
  High: { label: "Likely", cls: "bg-amber-100 text-amber-800 border-amber-300" },
  Medium: { label: "Possible", cls: "bg-blue-50 text-blue-700 border-blue-200" },
  Low: { label: "Low", cls: "bg-slate-100 text-slate-500 border-slate-200" },
};

const obTone: Record<string, string> = {
  Met: "bg-emerald-100 text-emerald-800 border-emerald-300",
  Attention: "bg-red-100 text-red-800 border-red-300",
  Pending: "bg-blue-50 text-blue-700 border-blue-200",
  "N/A": "bg-slate-100 text-slate-400 border-slate-200",
};

const riskTone: Record<string, string> = {
  Ready: "bg-emerald-100 border-emerald-300",
  "Needs Clarification": "bg-amber-100 border-amber-300",
  "Critical Issue": "bg-red-100 border-red-300",
  "Missing Data": "bg-slate-200 border-slate-300",
};

const riskExplain: Record<string, string> = {
  Ready: "Enough sourced facts are available to generate this section in full.",
  "Needs Clarification": "Some facts are missing or low-confidence, review before drafting.",
  "Critical Issue": "Key facts are missing or conflicting, blocking a reliable draft here.",
  "Missing Data": "No extracted facts yet, upload supporting documents for this section.",
};

type RuleView = "attention" | "all" | CheckStatus;
type ObservationView = "all" | "Critical" | "High" | "Medium" | "Low";
type HeatmapView = "All" | CoverageRow["riskLevel"];
type IssueView = "all" | "gaps" | "conflicts" | "financial";
type IssueSeverity = "All" | Severity;

export default function IntelligenceTabs({
  analysis, coverage, conflicts, objects, evidenceDocs, freshIssueCr, benchmark,
}: {
  analysis: AnalysisResult | null;
  coverage: CoverageRow[];
  conflicts: FactConflict[];
  objects: ObjectOfIssue[];
  evidenceDocs: string[];
  freshIssueCr: number | null;
  financials: FinancialYear[];
  benchmark: PeerBenchmark | null;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<(typeof TABS)[number]>("Overview");
  const [running, setRunning] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [ruleView, setRuleView] = useState<RuleView>("attention");
  const [ruleSearch, setRuleSearch] = useState("");
  const [observationView, setObservationView] = useState<ObservationView>("all");
  const [heatmapView, setHeatmapView] = useState<HeatmapView>("All");
  const [selectedHeatmapSection, setSelectedHeatmapSection] = useState<string | null>(null);
  const [issueView, setIssueView] = useState<IssueView>("all");
  const [issueSeverity, setIssueSeverity] = useState<IssueSeverity>("All");

  const rerun = async () => {
    setRunning(true);
    try { await fetch("/api/analysis", { method: "POST" }); router.refresh(); } finally { setRunning(false); }
  };

  const s = analysis?.scores;
  const gaps = (analysis?.gaps ?? []).filter((g) => g.status !== "Resolved");
  const order = { Critical: 0, High: 1, Medium: 2, Low: 3 } as const;
  const sortedGaps = [...gaps].sort((a, b) => order[a.severity] - order[b.severity]);
  const openConflicts = conflicts.filter((c) => c.status === "OPEN");
  const sevOrder = { Critical: 0, High: 1, Medium: 2, Low: 3 } as const;
  const finChecks = [...(analysis?.financialChecks ?? [])].sort(
    (a, b) => sevOrder[a.severity] - sevOrder[b.severity]);
  const finIssues = finChecks.filter((c) => c.severity !== "Low");
  const severityMatches = (severity: Severity) => issueSeverity === "All" || severity === issueSeverity;
  const visibleGaps = sortedGaps.filter((gap) => severityMatches(gap.severity));
  const visibleConflicts = openConflicts.filter((conflict) => severityMatches(conflict.severity));
  const visibleFinancialChecks = finChecks.filter((check) => severityMatches(check.severity));
  const visibleIssueCount = (issueView === "all" || issueView === "gaps" ? visibleGaps.length : 0)
    + (issueView === "all" || issueView === "conflicts" ? visibleConflicts.length : 0)
    + (issueView === "all" || issueView === "financial" ? visibleFinancialChecks.length : 0);
  const criticalIssueCount = sortedGaps.filter((gap) => gap.severity === "Critical").length
    + openConflicts.filter((conflict) => conflict.severity === "Critical").length
    + finIssues.filter((check) => check.severity === "Critical").length;
  const resolvedGapCount = analysis?.gaps.filter((gap) => gap.status === "Resolved").length ?? 0;
  const rpt = analysis?.rptRisks ?? [];
  const observations = analysis?.observations ?? [];
  const observationOrder = { Critical: 0, High: 1, Medium: 2, Low: 3 } as const;
  const visibleObservations = observations
    .filter((observation) => observationView === "all" || observation.severity === observationView)
    .sort((left, right) => observationOrder[left.severity] - observationOrder[right.severity]);
  const obligations = analysis?.complianceObligations ?? [];
  const obAttention = obligations.filter((o) => o.status === "Attention").length;
  const integrity = analysis?.integrity ?? null;
  const integritySignals = integrity?.signals ?? [];
  const integrityFlags = integritySignals.filter((x) => x.status === "flag").length;
  const avgCoverage = coverage.length ? Math.round(coverage.reduce((x, c) => x + c.completionPct, 0) / coverage.length) : 0;
  const ruleCounts = {
    pass: analysis?.checks.filter((check) => check.status === "pass").length ?? 0,
    warning: analysis?.checks.filter((check) => check.status === "warning").length ?? 0,
    fail: analysis?.checks.filter((check) => check.status === "fail").length ?? 0,
    missing: analysis?.checks.filter((check) => check.status === "missing").length ?? 0,
  };

  const selectHeatmapView = (nextView: HeatmapView) => {
    setHeatmapView(nextView);
    const firstMatch = nextView === "All" ? null : coverage.find((row) => row.riskLevel === nextView) ?? null;
    setSelectedHeatmapSection(firstMatch?.sectionId ?? null);
  };
  const attentionRuleCount = ruleCounts.warning + ruleCounts.fail + ruleCounts.missing;
  const visibleCoverage = coverage.filter((row) => heatmapView === "All" || row.riskLevel === heatmapView);
  const selectedCoverage = coverage.find((row) => row.sectionId === selectedHeatmapSection) ?? null;
  const coverageGroups = Array.from(
    visibleCoverage.reduce((groups, row) => {
      const group = groups.get(row.parentSection) ?? [];
      group.push(row);
      groups.set(row.parentSection, group);
      return groups;
    }, new Map<string, CoverageRow[]>()),
  );

  // fund-use warnings derived from the saved objects plan
  const objectsTotal = objects.reduce((x, o) => x + o.amountCr, 0);
  const fundUseWarnings: string[] = [];
  for (const o of objects) if (o.warning) fundUseWarnings.push(`${o.category}: ${o.warning}`);
  if (freshIssueCr != null && objects.length && Math.abs(objectsTotal - freshIssueCr) > 0.01)
    fundUseWarnings.push(`Objects total ₹${objectsTotal.toFixed(1)} Cr does not match the fresh issue of ₹${freshIssueCr} Cr.`);
  const gcp = objects.filter((o) => /general corporate/i.test(o.category)).reduce((x, o) => x + o.amountCr, 0);
  if (objectsTotal > 0 && gcp / objectsTotal > 0.25)
    fundUseWarnings.push(`General corporate purposes is ${Math.round((gcp / objectsTotal) * 100)}% of the plan, above the typical 25% ceiling.`);

  if (!analysis) {
    return (
      <HeroBackdrop className="p-5 md:p-6">
        <GlassPanel className="p-8 text-center">
          <p className="text-sm text-slate-500">The rule engine hasn&apos;t run yet.</p>
          <button onClick={rerun} disabled={running}
            className="mt-4 px-5 py-2 bg-blue-600 text-white text-sm rounded-lg disabled:opacity-50 inline-flex items-center gap-2">
            <RefreshCw size={14} className={running ? "animate-spin" : ""} /> Run IPO Intelligence
          </button>
        </GlassPanel>
      </HeroBackdrop>
    );
  }

  return (
    <HeroBackdrop className="p-5 md:p-6">
    <div className="relative">
      <GlassPanel className="mb-5 p-2.5">
        <div className="flex flex-col gap-2 xl:flex-row xl:items-start">
        <div className="grid min-w-0 flex-1 grid-cols-2 gap-1.5 sm:grid-cols-3 xl:grid-cols-5">
          {TABS.map((t) => {
            const count = t === "Disclosure Integrity" ? integrityFlags
              : t === "SME Framework" ? obAttention
                : t === "Gaps & Inconsistencies" ? gaps.length + finIssues.length + openConflicts.length
                  : t === "Exchange Observations" ? observations.length
                    : 0;
            return (
              <button key={t} onClick={() => setTab(t)}
                className={`inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-center text-xs font-semibold leading-4 transition-all ${tab === t ? "bg-gradient-to-r from-[#174376] to-blue-600 text-white shadow-md shadow-blue-900/20" : "border border-transparent bg-white/45 text-slate-600 hover:border-blue-100 hover:bg-blue-50 hover:text-blue-700"}`}>
                <span>{t}</span>
                {count > 0 && <span className={`rounded-md px-1.5 py-0.5 text-[9px] font-bold ${tab === t ? "bg-white/15 text-white" : "bg-amber-100 text-amber-700"}`}>{count}</span>}
              </button>
            );
          })}
        </div>
        <button onClick={rerun} disabled={running}
          className="inline-flex min-h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-4 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 disabled:opacity-50 xl:w-36">
          <RefreshCw size={13} className={running ? "animate-spin" : ""} /> Re-run analysis
        </button>
        </div>
      </GlassPanel>

      {/* ── Tab 1: Overview ─────────────────────────────────────────────── */}
      {tab === "Overview" && (
        <div className="space-y-5">
          <section className="grid gap-4 xl:grid-cols-[1.25fr_1fr]">
            <GlassPanel className="overflow-hidden p-5 md:p-6">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                <ScoreDonut score={s?.overall ?? 0} size={136} label="READINESS" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-blue-700"><ShieldCheck size={14} /> IPO readiness command centre</span>
                    <Badge tone="blue">{analysis.checks.length} automated checks</Badge>
                  </div>
                  <h2 className="mt-2 text-xl font-semibold text-[#15345b]">{s?.statusLine}</h2>
                  <p className="mt-1.5 text-sm leading-6 text-slate-600">Prioritise failed rules and blocked disclosures first. Every score below is linked to the evidence currently available in the workspace.</p>
                  <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <RuleOutcome label="Passed" value={ruleCounts.pass} tone="green" />
                    <RuleOutcome label="Warnings" value={ruleCounts.warning} tone="amber" />
                    <RuleOutcome label="Failed" value={ruleCounts.fail} tone="red" />
                    <RuleOutcome label="Missing" value={ruleCounts.missing} tone="slate" />
                  </div>
                </div>
              </div>
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                <p className="text-xs text-slate-500"><span className="font-semibold text-slate-700">{attentionRuleCount} rules need attention</span> before merchant banker review.</p>
                <button type="button" onClick={() => setRulesOpen(true)} className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:text-blue-900">
                  Open rule audit <ArrowRight size={13} />
                </button>
              </div>
            </GlassPanel>

            <div className="grid grid-cols-2 gap-3">
              <IntelligenceMetric icon={FileSearch} label="Draft coverage" value={`${avgCoverage}%`} note={`${coverage.filter((c) => c.canGenerate === "YES").length}/${coverage.length} sections ready`} tone={avgCoverage >= 75 ? "green" : "blue"} />
              <IntelligenceMetric icon={AlertTriangle} label="Critical gaps" value={gaps.filter((g) => g.severity === "Critical").length} note={`${gaps.filter((g) => g.severity === "High").length} high priority`} tone={gaps.some((g) => g.severity === "Critical") ? "red" : "green"} />
              <IntelligenceMetric icon={CircleDashed} label="RPT risk" value={`${s?.rptScore ?? 0}/100`} note={`${rptBand(s?.rptScore ?? 0)} risk band`} tone={s && s.rptScore > 60 ? "red" : s && s.rptScore > 30 ? "amber" : "green"} />
              <IntelligenceMetric icon={BarChart3} label="Financial consistency" value={`${s?.finConsistencyScore ?? 0}%`} note={`${finChecks.length} cross-checks run`} tone={s && s.finConsistencyScore < 60 ? "red" : s && s.finConsistencyScore < 85 ? "amber" : "green"} />
            </div>
          </section>

          <GlassPanel className="overflow-hidden">
            <div className="grid divide-y divide-slate-100 md:grid-cols-3 md:divide-x md:divide-y-0">
              <SignalStrip icon={XCircle} label="Evidence conflicts" value={openConflicts.length} note="Values disagree across documents" tone={openConflicts.length ? "red" : "green"} onClick={() => setTab("Gaps & Inconsistencies")} />
              <SignalStrip icon={Sparkles} label="Disclosure integrity" value={integrity ? `${integrity.score}/100` : "Pending"} note={integrity ? `${integrityFlags} signal${integrityFlags === 1 ? "" : "s"} to prepare for` : "Run analysis to calculate"} tone={integrity && integrity.score < 70 ? "amber" : "green"} onClick={() => setTab("Disclosure Integrity")} />
              <SignalStrip icon={FileSearch} label="Predicted observations" value={observations.length} note="Likely exchange reviewer queries" tone={observations.length ? "amber" : "green"} onClick={() => setTab("Exchange Observations")} />
            </div>
          </GlassPanel>

          <div className="grid gap-4 xl:grid-cols-[0.9fr_1.3fr]">
            <GlassPanel className="p-5">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-[#15345b]">Readiness by category</h3>
                  <p className="mt-0.5 text-xs text-slate-500">Weighted contribution to the overall score</p>
                </div>
                <Badge tone="blue">5 dimensions</Badge>
              </div>
              <CategoryScoreChart data={Object.entries(s?.byCategory ?? {}).map(([category, score]) => ({ category, score }))} />
              <div className="mt-2 rounded-xl bg-blue-50/70 px-3 py-2.5 text-[11px] leading-5 text-blue-800">Eligibility 30% · Disclosure 25% · Financial 20% · Governance 15% · Documents 10%</div>
            </GlassPanel>

            <GlassPanel className="overflow-hidden">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
                <div>
                  <h3 className="text-sm font-semibold text-[#15345b]">Prospectus coverage heatmap</h3>
                  <p className="mt-0.5 text-xs text-slate-500">Select a colour to filter sections, then click a section to inspect the points behind its rating.</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <HeatLegend label="All" count={coverage.length} tone="blue" active={heatmapView === "All"} onClick={() => selectHeatmapView("All")} />
                  <HeatLegend label="Ready" count={coverage.filter((c) => c.riskLevel === "Ready").length} tone="green" active={heatmapView === "Ready"} onClick={() => selectHeatmapView("Ready")} />
                  <HeatLegend label="Clarify" count={coverage.filter((c) => c.riskLevel === "Needs Clarification").length} tone="amber" active={heatmapView === "Needs Clarification"} onClick={() => selectHeatmapView("Needs Clarification")} />
                  <HeatLegend label="Critical" count={coverage.filter((c) => c.riskLevel === "Critical Issue").length} tone="red" active={heatmapView === "Critical Issue"} onClick={() => selectHeatmapView("Critical Issue")} />
                  <HeatLegend label="Missing" count={coverage.filter((c) => c.riskLevel === "Missing Data").length} tone="slate" active={heatmapView === "Missing Data"} onClick={() => selectHeatmapView("Missing Data")} />
                </div>
              </div>
              {selectedCoverage && (
                <HeatmapDetail row={selectedCoverage} onClose={() => setSelectedHeatmapSection(null)} />
              )}
              <div className="max-h-[440px] space-y-4 overflow-y-auto bg-slate-50/60 p-4">
                <div className="flex items-center justify-between gap-3 px-1">
                  <p className="text-[10px] font-semibold text-slate-500">Showing {visibleCoverage.length} of {coverage.length} sections</p>
                  {heatmapView !== "All" && <button type="button" onClick={() => selectHeatmapView("All")} className="text-[10px] font-semibold text-blue-700 hover:text-blue-900">Clear colour filter</button>}
                </div>
                {coverageGroups.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-xs text-slate-500">No sections fall in this readiness band.</div>
                ) : coverageGroups.map(([parent, rows]) => (
                  <section key={parent}>
                    <div className="mb-2 flex items-center justify-between gap-3 px-1">
                      <h4 className="truncate text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">{parent}</h4>
                      <span className="shrink-0 text-[10px] text-slate-400">{rows.length} section{rows.length === 1 ? "" : "s"}</span>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {rows.map((row) => (
                        <HeatmapSectionCard
                          key={row.sectionId}
                          row={row}
                          selected={selectedHeatmapSection === row.sectionId}
                          onClick={() => setSelectedHeatmapSection(row.sectionId)}
                        />
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            </GlassPanel>
          </div>

          <GlassPanel className="overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
              <div>
                <h3 className="text-sm font-semibold text-[#15345b]">Priority remediation queue</h3>
                <p className="mt-0.5 text-xs text-slate-500">The five issues with the greatest impact on readiness and draft quality</p>
              </div>
              {sortedGaps.length > 0 && <button type="button" onClick={() => setTab("Gaps & Inconsistencies")} className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-900">View all {sortedGaps.length} gaps <ArrowRight size={13} /></button>}
            </div>
            {sortedGaps.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <CheckCircle2 size={26} className="mx-auto text-emerald-500" />
                <p className="mt-2 text-sm font-semibold text-slate-700">No open blockers</p>
                <p className="mt-1 text-xs text-slate-500">The current evidence set has cleared all generated gaps.</p>
              </div>
            ) : (
              <div className="grid gap-3 bg-slate-50/50 p-4 lg:grid-cols-2">
                {sortedGaps.slice(0, 5).map((gap, index) => (
                  <article key={gap.id} className={`relative overflow-hidden rounded-xl border bg-white p-4 shadow-sm ${gap.severity === "Critical" ? "border-red-200" : gap.severity === "High" ? "border-amber-200" : "border-slate-200"}`}>
                    <span className={`absolute inset-y-0 left-0 w-1 ${gap.severity === "Critical" ? "bg-red-500" : gap.severity === "High" ? "bg-amber-500" : "bg-blue-500"}`} />
                    <div className="flex items-start gap-3 pl-1">
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-slate-100 text-xs font-bold text-slate-600">{index + 1}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2"><h4 className="text-sm font-semibold text-slate-800">{gap.title}</h4><SeverityBadge severity={gap.severity} /></div>
                        <p className="mt-1.5 text-xs leading-5 text-slate-600">{gap.suggestedFix}</p>
                        <div className="mt-3 flex flex-wrap gap-2 text-[10px]"><span className="rounded-md bg-blue-50 px-2 py-1 font-semibold text-blue-700">Owner: {gap.owner}</span><span className="rounded-md bg-slate-100 px-2 py-1 text-slate-500">{gap.affectedSection}</span></div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </GlassPanel>
        </div>
      )}

      {/* ── Tab: Disclosure Integrity (earnings-quality signals) ────────── */}
      {tab === "Disclosure Integrity" && (
        <div className="space-y-4">
          {!integrity ? (
            <GlassPanel className="p-8 text-center text-sm text-slate-400">
              Run the rule engine to compute the Disclosure Integrity Score.
            </GlassPanel>
          ) : (
            <>
              <GlassPanel className="p-5 flex flex-wrap items-center gap-6">
                <ScoreDonut score={integrity.score} label="INTEGRITY" />
                <div className="min-w-[240px] flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h3 className="text-sm font-semibold text-slate-800">Disclosure Integrity: {integrity.band}</h3>
                    <Badge tone="blue">Earnings-quality read</Badge>
                  </div>
                  <p className="text-sm text-slate-600 max-w-2xl">{integrity.summary}</p>
                  <p className="mt-2 text-[11px] text-slate-400 max-w-2xl">{integrity.disclaimer}</p>
                </div>
              </GlassPanel>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <GlassStat label="Likely to be questioned" value={integritySignals.filter((x) => x.status === "flag").length} tone={integrityFlags ? "bad" : "good"} sub="Prepare an explanation" />
                <GlassStat label="Keep an eye on" value={integritySignals.filter((x) => x.status === "watch").length} tone={integritySignals.some((x) => x.status === "watch") ? "warn" : "good"} sub="Minor signals" />
                <GlassStat label="Consistent" value={integritySignals.filter((x) => x.status === "clean").length} tone="good" sub="No concern" />
                <GlassStat label="Not assessed" value={integritySignals.filter((x) => x.status === "na").length} sub="Need more data" />
              </div>

              {integritySignals.map((x) => (
                <GlassPanel key={x.id} className="p-5">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <h3 className="text-sm font-semibold text-slate-800">{x.label}</h3>
                    <span className={`inline-block px-2 py-0.5 text-[11px] font-medium rounded-full border ${sigTone[x.status]?.cls}`}>{sigTone[x.status]?.label}</span>
                    {x.status !== "clean" && x.status !== "na" && (
                      <span className="ml-auto text-[11px] text-slate-400">−{x.deduction} pts</span>
                    )}
                  </div>
                  <p className="text-sm text-slate-700">{x.detail}</p>
                  <div className="grid md:grid-cols-2 gap-3 mt-3 text-[13px]">
                    <div className="bg-slate-50 rounded-lg px-3 py-2"><span className="font-medium text-slate-700">Why a reviewer cares:</span> <span className="text-slate-600">{x.whyItMatters}</span></div>
                    {x.prepare !== "—" && (
                      <div className="bg-blue-50 rounded-lg px-3 py-2"><span className="font-medium text-blue-800">Prepare:</span> <span className="text-blue-900">{x.prepare}</span></div>
                    )}
                  </div>
                </GlassPanel>
              ))}

              <p className="text-[11px] text-slate-400">
                Leading-digit (Benford) check: {integrity.benford.note} Sample size {integrity.benford.sampleSize} reported figures.
              </p>
            </>
          )}
        </div>
      )}

      {/* ── Tab: SME Framework (SEBI ICDR compliance) ───────────────────── */}
      {tab === "SME Framework" && (
        <div className="space-y-4">
          <GlassPanel className="p-5">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h3 className="text-sm font-semibold text-slate-800">SME IPO Framework Compliance</h3>
              <Badge tone="blue">SEBI ICDR · Dec-2024 / Mar-2025</Badge>
            </div>
            <p className="text-xs text-slate-500 mb-4 max-w-3xl">
              Eligibility and structural obligations under the current SME framework, computed from your profile and
              objects where the data allows. <span className="font-medium text-slate-600">Pending</span> items are
              process obligations ensured at the RHP stage with your merchant banker. This is a preparation aid, not
              legal advice, your merchant banker and legal counsel confirm final compliance.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-5">
              <GlassStat label="Met" value={obligations.filter((o) => o.status === "Met").length} tone="good" sub="Data confirms compliance" />
              <GlassStat label="Needs attention" value={obAttention} tone={obAttention ? "bad" : "good"} sub="Likely non-compliant" />
              <GlassStat label="Pending" value={obligations.filter((o) => o.status === "Pending").length} sub="Ensured at RHP stage" />
              <GlassStat label="Not applicable" value={obligations.filter((o) => o.status === "N/A").length} sub="Below thresholds" />
            </div>
            {obligations.length === 0 ? (
              <p className="text-sm text-slate-400">Run the rule engine to compute framework obligations.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-[13px] min-w-[680px]">
                  <thead>
                    <tr className="text-left text-xs text-slate-500 border-b border-slate-200">
                      <th className="py-2 pr-3 w-52">Rule</th>
                      <th className="py-2 pr-3">Requirement</th>
                      <th className="py-2 pr-3 w-28">Status</th>
                      <th className="py-2">Your position</th>
                    </tr>
                  </thead>
                  <tbody>
                    {obligations.map((o) => (
                      <tr key={o.id} className="border-b border-slate-100 align-top">
                        <td className="py-2.5 pr-3 font-medium text-slate-800">{o.rule}</td>
                        <td className="py-2.5 pr-3 text-slate-600">{o.requirement}</td>
                        <td className="py-2.5 pr-3">
                          <span className={`inline-block px-2 py-0.5 text-[11px] font-medium rounded-full border ${obTone[o.status]}`}>{o.status}</span>
                        </td>
                        <td className="py-2.5 text-slate-600">{o.detail}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="mt-4 text-[11px] text-slate-400">
              Basis: {obligations[0]?.basis ?? "SEBI ICDR (SME) framework"}. Verify against the latest SEBI circulars before filing.
            </p>
          </GlassPanel>
        </div>
      )}

      {/* ── Tab: Gaps & Inconsistencies (merged) ────────────────────────── */}
      {tab === "Gaps & Inconsistencies" && (
        <div className="space-y-5">
          <section className="grid gap-4 xl:grid-cols-[1.25fr_1fr]">
            <GlassPanel className="relative overflow-hidden !border-blue-400/40 !bg-gradient-to-br !from-[#102b4d] !via-[#174376] !to-blue-700 p-5 text-white md:p-6">
              <div className="pointer-events-none absolute -right-12 -top-16 h-56 w-56 rounded-full bg-cyan-300/15 blur-3xl" />
              <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
                <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl border border-white/15 bg-white/10 text-cyan-100 shadow-lg"><AlertTriangle size={28} /></span>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-200">Remediation control centre</p>
                  <h2 className="mt-2 text-2xl font-semibold">Resolve the exceptions that weaken your draft</h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-100">Separate missing evidence from conflicting values and financial cross-checks, then route every issue to the person who can close it.</p>
                  <div className="mt-4 flex flex-wrap gap-2 text-[10px] font-semibold">
                    <span className="rounded-lg bg-white/10 px-2.5 py-1.5">{sortedGaps.length + openConflicts.length + finIssues.length} actionable exceptions</span>
                    <span className="rounded-lg bg-white/10 px-2.5 py-1.5">{resolvedGapCount} gaps resolved</span>
                    <span className="rounded-lg bg-white/10 px-2.5 py-1.5">Evidence-linked findings</span>
                  </div>
                </div>
              </div>
            </GlassPanel>

            <div className="grid grid-cols-2 gap-3">
              <IssueMetric icon={XCircle} label="Critical items" value={criticalIssueCount} note="Resolve before draft reliance" tone={criticalIssueCount ? "red" : "green"} />
              <IssueMetric icon={FileSearch} label="Open gaps" value={sortedGaps.length} note={`${sortedGaps.filter((gap) => gap.severity === "High").length} high priority`} tone={sortedGaps.length ? "amber" : "green"} />
              <IssueMetric icon={AlertTriangle} label="Fact conflicts" value={openConflicts.length} note="Values disagree across sources" tone={openConflicts.length ? "red" : "green"} />
              <IssueMetric icon={BarChart3} label="Financial exceptions" value={finIssues.length} note={`${finChecks.length} cross-checks completed`} tone={finIssues.length ? "amber" : "green"} />
            </div>
          </section>

          <GlassPanel className="p-4">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <h3 className="text-sm font-semibold text-[#15345b]">Issue workspace</h3>
                <p className="mt-0.5 text-xs text-slate-500">Choose an issue type and severity to focus the remediation queue.</p>
              </div>
              <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
                <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Issue type filters">
                  <IssueFilter active={issueView === "all"} label="All results" count={sortedGaps.length + openConflicts.length + finChecks.length} onClick={() => setIssueView("all")} />
                  <IssueFilter active={issueView === "gaps"} label="Missing data" count={sortedGaps.length} onClick={() => setIssueView("gaps")} />
                  <IssueFilter active={issueView === "conflicts"} label="Document conflicts" count={openConflicts.length} onClick={() => setIssueView("conflicts")} />
                  <IssueFilter active={issueView === "financial"} label="Financial checks" count={finChecks.length} onClick={() => setIssueView("financial")} />
                </div>
                <span className="hidden h-6 w-px bg-slate-200 lg:block" />
                <div className="flex flex-wrap gap-1" aria-label="Severity filters">
                  {(["All", "Critical", "High", "Medium", "Low"] as IssueSeverity[]).map((severity) => (
                    <button key={severity} type="button" aria-pressed={issueSeverity === severity} onClick={() => setIssueSeverity(severity)} className={`rounded-lg px-2.5 py-1.5 text-[10px] font-semibold transition ${issueSeverity === severity ? "bg-slate-800 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>{severity}</button>
                  ))}
                </div>
              </div>
            </div>
          </GlassPanel>

          {visibleIssueCount === 0 && (
            <GlassPanel className="px-6 py-12 text-center">
              <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-600"><CheckCircle2 size={22} /></span>
              <h3 className="mt-3 text-sm font-semibold text-slate-800">No matching exceptions</h3>
              <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-slate-500">No results match the selected type and severity. Change the filters to inspect the complete audit.</p>
            </GlassPanel>
          )}

          {(issueView === "all" || issueView === "conflicts") && visibleConflicts.length > 0 && (
            <IssueSection
              icon={AlertTriangle}
              title="Cross-document fact conflicts"
              description="The same disclosure appears with different values. Confirm the authoritative source before accepting either value."
              count={visibleConflicts.length}
              tone="red"
            >
              <div className="grid gap-3 lg:grid-cols-2">
                {visibleConflicts.map((conflict) => <ConflictIssueCard key={conflict.id} conflict={conflict} />)}
              </div>
            </IssueSection>
          )}

          {(issueView === "all" || issueView === "gaps") && visibleGaps.length > 0 && (
            <IssueSection
              icon={FileSearch}
              title="Missing data and disclosure gaps"
              description="Collect the required evidence, follow the suggested action and keep ownership explicit."
              count={visibleGaps.length}
              tone="amber"
            >
              <div className="grid gap-3 lg:grid-cols-2">
                {visibleGaps.map((gap) => <GapIssueCard key={gap.id} gap={gap} />)}
              </div>
            </IssueSection>
          )}

          {(issueView === "all" || issueView === "financial") && visibleFinancialChecks.length > 0 && (
            <IssueSection
              icon={BarChart3}
              title="Financial consistency checks"
              description="Compare expected and reported values, then prepare a reconciliation wherever the difference is material."
              count={visibleFinancialChecks.length}
              tone={visibleFinancialChecks.some((check) => check.severity !== "Low") ? "blue" : "green"}
            >
              <div className="grid gap-3 lg:grid-cols-2">
                {visibleFinancialChecks.map((check) => <FinancialIssueCard key={check.id} check={check} />)}
              </div>
            </IssueSection>
          )}
        </div>
      )}

      {/* ── Tab 4: RPT & Fund Use Risk ──────────────────────────────────── */}
      {tab === "RPT & Fund Use Risk" && (
        <div className="space-y-4">
          <GlassPanel className="p-5 flex flex-wrap items-center gap-6">
            <ScoreDonut score={s?.rptScore ?? 0} label="RPT RISK" />
            <div>
              <div className="text-sm font-semibold text-slate-800">
                RPT Risk: {rptBand(s?.rptScore ?? 0)} <span className="text-slate-400 font-normal">(0–30 Low · 31–60 Medium · 61–100 High)</span>
              </div>
              <p className="text-sm text-slate-600 mt-1 max-w-2xl">
                {rpt.length
                  ? `${rpt.length} related-party signal(s) detected in your documents. Undisclosed, these are the costliest IPO mistake, disclose early, evidence thoroughly.`
                  : "No related-party signals detected in current uploads. If your business transacts with promoter-connected entities, upload the RPT register, non-detection is not clearance."}
              </p>
            </div>
          </GlassPanel>

          {rpt.map((r) => (
            <GlassPanel key={r.id} className="p-5">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <SeverityBadge severity={r.severity} />
                <h3 className="text-sm font-semibold text-slate-800">{r.entityName}</h3>
                <span className="text-xs text-slate-500">· {r.relationship}</span>
                <span className="ml-auto text-sm font-semibold text-slate-700">{r.riskScore}/100</span>
              </div>
              <div className="grid md:grid-cols-2 gap-3 text-[13px] mb-2">
                <div className="bg-slate-50 rounded-lg px-3 py-2"><span className="text-slate-500">Amount:</span> <span className="font-medium">{r.amountCr ? `₹${r.amountCr} Cr` : "Not extracted"}</span> <span className="text-slate-400">({r.pctOfBase})</span></div>
                <div className="bg-slate-50 rounded-lg px-3 py-2"><span className="text-slate-500">Why flagged:</span> <span className="text-slate-700">{r.reason}</span></div>
              </div>
              <div className="grid md:grid-cols-2 gap-3 text-[13px]">
                <div className="bg-blue-50 rounded-lg px-3 py-2"><span className="font-medium text-blue-800">Suggested disclosure:</span> <span className="text-blue-900">{r.suggestedDisclosure}</span></div>
                <div className="bg-amber-50 rounded-lg px-3 py-2"><span className="font-medium text-amber-800">Required evidence:</span> <span className="text-amber-900">{r.requiredEvidence}</span></div>
              </div>
            </GlassPanel>
          ))}

          <GlassPanel className="p-5">
            <h3 className="text-sm font-semibold text-slate-800 mb-2">Fund-use warnings (from your Objects plan)</h3>
            {objects.length === 0 ? (
              <p className="text-sm text-slate-400">No objects plan yet, build it in the &ldquo;Objects of Issue&rdquo; tab.</p>
            ) : fundUseWarnings.length === 0 ? (
              <p className="text-sm text-emerald-700">No fund-use warnings, objects reconcile with the fresh issue and carry evidence.</p>
            ) : (
              <ul className="text-[13px] text-amber-900 space-y-1.5">
                {fundUseWarnings.map((w, i) => <li key={i} className="bg-amber-50 border border-amber-200 rounded px-3 py-1.5">⚠ {w}</li>)}
              </ul>
            )}
          </GlassPanel>
        </div>
      )}

      {/* ── Tab 5: Objects of Issue ─────────────────────────────────────── */}
      {tab === "Objects of Issue" && (
        <ObjectsForm existing={objects} freshIssueCr={freshIssueCr} evidenceDocs={evidenceDocs} />
      )}

      {/* ── Tab: Valuation & Peers ──────────────────────────────────────── */}
      {tab === "Valuation & Peers" && (
        <div className="space-y-4">
          <GlassPanel className="p-5">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h3 className="text-sm font-semibold text-slate-800">Peer Benchmarking &amp; Basis for Issue Price</h3>
              <Badge tone="blue">Market-calibrated</Badge>
            </div>
            <p className="text-xs text-slate-500 max-w-3xl">
              Your fundamentals against a sector-matched set of comparable listed SMEs. Divergences are exactly what an
              exchange reviewer probes in the <em>Basis for Issue Price</em>. Peer figures are illustrative reference
              values, your merchant banker substitutes the actual peer set and pricing for the filing.
            </p>
          </GlassPanel>

          {!benchmark ? (
            <GlassPanel className="p-8 text-center text-sm text-slate-400">
              Enter at least one year of financials in Company Profile to benchmark against peers.
            </GlassPanel>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <GlassStat label="Peer sector" value={benchmark.peers.length} sub={benchmark.sector} />
                <GlassStat label="Suggested peer P/E" value={`${benchmark.suggestedPe}×`} sub="Median of the peer set" />
                <GlassStat label="Indicative equity value" value={benchmark.indicativeValuationCr != null ? `₹${benchmark.indicativeValuationCr} Cr` : "—"} sub="Latest PAT × peer median P/E" />
                <GlassStat label="Metrics off peers" value={benchmark.rows.filter((r) => r.verdict === "Above peers" || r.verdict === "Below peers").length} tone={benchmark.rows.some((r) => r.verdict !== "In line" && r.verdict !== "No data") ? "warn" : "good"} sub="Likely reviewer probes" />
              </div>

              <GlassPanel className="p-5">
                <p className="text-sm text-slate-600 mb-3">{benchmark.summary}</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-[13px] min-w-[560px]">
                    <thead>
                      <tr className="text-left text-xs text-slate-500 border-b border-slate-200">
                        <th className="py-2 pr-3">Metric</th>
                        <th className="py-2 pr-3 w-28">Your company</th>
                        <th className="py-2 pr-3 w-28">Peer median</th>
                        <th className="py-2 pr-3 w-28">Read</th>
                        <th className="py-2">Why it matters</th>
                      </tr>
                    </thead>
                    <tbody>
                      {benchmark.rows.map((r) => (
                        <tr key={r.metric} className="border-b border-slate-100 align-top">
                          <td className="py-2.5 pr-3 font-medium text-slate-800">{r.metric}</td>
                          <td className="py-2.5 pr-3 tabular-nums">{r.company != null ? `${r.company}${r.unit === "%" ? "%" : r.unit === "x" ? "×" : ` ${r.unit}`}` : "—"}</td>
                          <td className="py-2.5 pr-3 tabular-nums text-slate-500">{r.peerMedian}{r.unit === "%" ? "%" : r.unit === "x" ? "×" : ` ${r.unit}`}</td>
                          <td className="py-2.5 pr-3">
                            <span className={`inline-block px-2 py-0.5 text-[11px] font-medium rounded-full border ${
                              r.verdict === "In line" ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                                : r.verdict === "No data" ? "bg-slate-100 text-slate-400 border-slate-200"
                                  : "bg-amber-100 text-amber-800 border-amber-300"}`}>{r.verdict}</span>
                          </td>
                          <td className="py-2.5 text-slate-500">{r.note}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </GlassPanel>

              <GlassPanel className="p-5">
                <h4 className="text-sm font-semibold text-slate-800 mb-2">Peer set ({benchmark.sector})</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-[13px] min-w-[520px]">
                    <thead>
                      <tr className="text-left text-xs text-slate-500 border-b border-slate-200">
                        <th className="py-2 pr-3">Peer</th><th className="py-2 pr-3">Platform</th>
                        <th className="py-2 pr-3">Revenue</th><th className="py-2 pr-3">P/E</th>
                        <th className="py-2 pr-3">EV/EBITDA</th><th className="py-2">RoNW</th>
                      </tr>
                    </thead>
                    <tbody>
                      {benchmark.peers.map((p) => (
                        <tr key={p.name} className="border-b border-slate-100">
                          <td className="py-2 pr-3 font-medium text-slate-700">{p.name}</td>
                          <td className="py-2 pr-3 text-slate-500">{p.exchange}</td>
                          <td className="py-2 pr-3 tabular-nums">₹{p.revenueCr} Cr</td>
                          <td className="py-2 pr-3 tabular-nums">{p.pe}×</td>
                          <td className="py-2 pr-3 tabular-nums">{p.evEbitda}×</td>
                          <td className="py-2 tabular-nums">{p.roePct}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-3 text-[11px] text-slate-400">Illustrative reference peers for benchmarking, not live market data and not a valuation opinion. The merchant banker finalises the peer set and issue price.</p>
              </GlassPanel>
            </>
          )}
        </div>
      )}

      {/* ── Tab: Exchange Observation Simulator ─────────────────────────── */}
      {tab === "Exchange Observations" && (
        <div className="space-y-5">
          <section className="grid gap-4 xl:grid-cols-[1.3fr_1fr]">
            <GlassPanel className="relative overflow-hidden !border-blue-400/40 !bg-gradient-to-br !from-[#102b4d] !via-[#174376] !to-blue-700 p-5 text-white md:p-6">
              <div className="pointer-events-none absolute -right-10 -top-16 h-52 w-52 rounded-full bg-cyan-300/15 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-20 left-1/3 h-44 w-44 rounded-full bg-violet-300/15 blur-3xl" />
              <div className="relative">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-200"><FileSearch size={14} /> Pre-filing query room</span>
                  <span className="rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-[10px] font-semibold text-blue-50">NSE Emerge / BSE SME lens</span>
                </div>
                <h2 className="mt-4 max-w-xl text-2xl font-semibold leading-tight">See your draft through an exchange reviewer&apos;s eyes</h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-100">
                  SIIM converts your gaps, RPT signals, financial inconsistencies and framework breaches into the clarifications most likely to be raised, then prepares the response and evidence trail before filing.
                </p>
                <div className="mt-5 flex flex-wrap items-center gap-2 text-[11px]">
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-1.5 text-blue-50"><ShieldCheck size={13} /> Evidence-linked</span>
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-1.5 text-blue-50"><Sparkles size={13} /> Pre-emptive disclosure guidance</span>
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-1.5 text-blue-50"><RefreshCw size={13} /> Recomputed from live analysis</span>
                </div>
              </div>
            </GlassPanel>

            <GlassPanel className="overflow-hidden p-5 md:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Predicted observations</p>
                  <div className="mt-1 flex items-baseline gap-2"><span className="text-4xl font-bold text-[#15345b]">{observations.length}</span><span className="text-xs text-slate-500">queries to pre-empt</span></div>
                </div>
                <span className={`grid h-11 w-11 place-items-center rounded-2xl ${observations.some((observation) => observation.severity === "Critical") ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}><AlertTriangle size={20} /></span>
              </div>
              <p className="mt-3 text-xs leading-5 text-slate-600">
                {observations.some((observation) => observation.severity === "Critical")
                  ? "Immediate response preparation is recommended for the highest-likelihood queries."
                  : "No very-likely query is currently predicted from the available evidence."}
              </p>
              <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100">
                {observations.length > 0 && (
                  <div className="flex h-full w-full">
                    <span className="bg-red-500" style={{ width: `${(observations.filter((o) => o.severity === "Critical").length / observations.length) * 100}%` }} />
                    <span className="bg-amber-500" style={{ width: `${(observations.filter((o) => o.severity === "High").length / observations.length) * 100}%` }} />
                    <span className="bg-blue-500" style={{ width: `${(observations.filter((o) => o.severity === "Medium").length / observations.length) * 100}%` }} />
                    <span className="bg-slate-400" style={{ width: `${(observations.filter((o) => o.severity === "Low").length / observations.length) * 100}%` }} />
                  </div>
                )}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <ObservationMetric label="Very likely" value={observations.filter((o) => o.severity === "Critical").length} tone="red" />
                <ObservationMetric label="Likely" value={observations.filter((o) => o.severity === "High").length} tone="amber" />
                <ObservationMetric label="Possible" value={observations.filter((o) => o.severity === "Medium").length} tone="blue" />
                <ObservationMetric label="Low likelihood" value={observations.filter((o) => o.severity === "Low").length} tone="slate" />
              </div>
            </GlassPanel>
          </section>

          {observations.length === 0 ? (
            <GlassPanel className="px-6 py-12 text-center">
              <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-600"><CheckCircle2 size={22} /></span>
              <h3 className="mt-3 text-sm font-semibold text-slate-800">No predicted observations yet</h3>
              <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-slate-500">Upload additional documents and re-run IPO Intelligence to test the draft against a broader evidence set.</p>
            </GlassPanel>
          ) : (
            <>
              <GlassPanel className="flex flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-[#15345b]">Reviewer observation queue</h3>
                  <p className="mt-0.5 text-xs text-slate-500">Highest-likelihood questions appear first. Filter the queue to prepare response packs by priority.</p>
                </div>
                <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Observation likelihood filters">
                  <ObservationFilter active={observationView === "all"} label="All" count={observations.length} onClick={() => setObservationView("all")} />
                  <ObservationFilter active={observationView === "Critical"} label="Very likely" count={observations.filter((o) => o.severity === "Critical").length} onClick={() => setObservationView("Critical")} />
                  <ObservationFilter active={observationView === "High"} label="Likely" count={observations.filter((o) => o.severity === "High").length} onClick={() => setObservationView("High")} />
                  <ObservationFilter active={observationView === "Medium"} label="Possible" count={observations.filter((o) => o.severity === "Medium").length} onClick={() => setObservationView("Medium")} />
                  <ObservationFilter active={observationView === "Low"} label="Low" count={observations.filter((o) => o.severity === "Low").length} onClick={() => setObservationView("Low")} />
                </div>
              </GlassPanel>

              {visibleObservations.length === 0 ? (
                <GlassPanel className="p-8 text-center text-sm text-slate-500">No observations in this likelihood band.</GlassPanel>
              ) : (
                <div className="space-y-3">
                  {visibleObservations.map((observation, index) => (
                    <ObservationCard key={observation.id} observation={observation} rank={index + 1} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {tab === "Overview" && (
        <RuleAudit
          checks={analysis.checks}
          open={rulesOpen}
          onToggle={() => setRulesOpen((current) => !current)}
          view={ruleView}
          onView={setRuleView}
          search={ruleSearch}
          onSearch={setRuleSearch}
        />
      )}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/60 bg-white/50 px-4 py-3 backdrop-blur-sm">
        <div className="min-w-[220px] flex-1">
          <div className="mb-1.5 flex items-center justify-between text-[11px] text-slate-600"><span>Draft evidence coverage</span><span className="font-bold text-blue-700">{avgCoverage}%</span></div>
          <ProgressBar value={avgCoverage} tone="blue" />
        </div>
        <Link href="/draft" prefetch className="inline-flex items-center gap-2 rounded-xl bg-[#15345b] px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-900">Continue to Draft Offer Document <ArrowRight size={14} /></Link>
      </div>
    </div>
    </HeroBackdrop>
  );
}

function IssueMetric({
  icon: Icon,
  label,
  value,
  note,
  tone,
}: {
  icon: typeof FileSearch;
  label: string;
  value: number;
  note: string;
  tone: "green" | "amber" | "red";
}) {
  const styles = {
    green: { panel: "!border-emerald-200 !bg-gradient-to-br !from-emerald-50 !to-white", icon: "bg-emerald-100 text-emerald-700" },
    amber: { panel: "!border-amber-200 !bg-gradient-to-br !from-amber-50 !to-white", icon: "bg-amber-100 text-amber-700" },
    red: { panel: "!border-red-200 !bg-gradient-to-br !from-red-50 !to-white", icon: "bg-red-100 text-red-700" },
  }[tone];
  return (
    <GlassPanel className={`p-4 ${styles.panel}`}>
      <div className="flex items-start justify-between gap-2">
        <div><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">{label}</p><p className="mt-1 text-2xl font-bold text-[#15345b]">{value}</p></div>
        <span className={`grid h-8 w-8 place-items-center rounded-lg ${styles.icon}`}><Icon size={16} /></span>
      </div>
      <p className="mt-2 truncate text-[11px] text-slate-500" title={note}>{note}</p>
    </GlassPanel>
  );
}

function IssueFilter({ active, label, count, onClick }: { active: boolean; label: string; count: number; onClick: () => void }) {
  return (
    <button type="button" role="tab" aria-selected={active} onClick={onClick} className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[10px] font-semibold transition ${active ? "border-[#15345b] bg-[#15345b] text-white shadow-sm" : "border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-700"}`}>
      {label}<span className={`rounded px-1 py-0.5 text-[9px] ${active ? "bg-white/15" : "bg-slate-100"}`}>{count}</span>
    </button>
  );
}

function IssueSection({
  icon: Icon,
  title,
  description,
  count,
  tone,
  children,
}: {
  icon: typeof FileSearch;
  title: string;
  description: string;
  count: number;
  tone: "red" | "amber" | "blue" | "green";
  children: React.ReactNode;
}) {
  const styles = {
    red: "bg-red-100 text-red-700",
    amber: "bg-amber-100 text-amber-700",
    blue: "bg-blue-100 text-blue-700",
    green: "bg-emerald-100 text-emerald-700",
  }[tone];
  return (
    <GlassPanel className="overflow-hidden">
      <div className="flex items-start gap-3 border-b border-slate-100 bg-white/55 px-5 py-4">
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${styles}`}><Icon size={18} /></span>
        <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-semibold text-[#15345b]">{title}</h3><Badge tone={tone === "red" ? "red" : tone === "amber" ? "yellow" : tone === "green" ? "green" : "blue"}>{count} result{count === 1 ? "" : "s"}</Badge></div><p className="mt-1 text-xs leading-5 text-slate-500">{description}</p></div>
      </div>
      <div className="bg-slate-50/60 p-4">{children}</div>
    </GlassPanel>
  );
}

function ConflictIssueCard({ conflict }: { conflict: FactConflict }) {
  return (
    <article className="relative overflow-hidden rounded-xl border border-red-200 bg-white p-4 shadow-sm">
      <span className="absolute inset-y-0 left-0 w-1 bg-red-500" />
      <div className="flex items-start justify-between gap-3 pl-1">
        <div><p className="text-[9px] font-bold uppercase tracking-[0.13em] text-red-600">Reconciliation required</p><h4 className="mt-1 text-sm font-semibold text-slate-800">{prettyLabel(conflict.factKey)}</h4></div>
        <SeverityBadge severity={conflict.severity} />
      </div>
      <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-stretch gap-2 pl-1">
        <ComparisonValue label="Source A" value={conflict.valueA} source={conflict.sourceA} tone="slate" />
        <span className="self-center text-[9px] font-bold uppercase text-red-400">vs</span>
        <ComparisonValue label="Source B" value={conflict.valueB} source={conflict.sourceB} tone="red" />
      </div>
      <p className="mt-3 pl-1 text-xs leading-5 text-slate-600">{conflict.explanation}</p>
      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 pl-1"><span className="text-[10px] text-slate-400">Confirm the authoritative document</span><Link href="/evidence" className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-700 hover:text-blue-900">Open evidence <ArrowRight size={11} /></Link></div>
    </article>
  );
}

function ComparisonValue({ label, value, source, tone }: { label: string; value: string; source: string; tone: "slate" | "red" }) {
  return (
    <div className={`min-w-0 rounded-lg border p-2.5 ${tone === "red" ? "border-red-100 bg-red-50/70" : "border-slate-200 bg-slate-50"}`}>
      <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1 break-words text-sm font-semibold text-slate-800">{value}</p><p className="mt-1 truncate text-[9px] text-slate-500" title={source}>{source}</p>
    </div>
  );
}

function GapIssueCard({ gap }: { gap: Gap }) {
  const accent = gap.severity === "Critical" ? "bg-red-500" : gap.severity === "High" ? "bg-amber-500" : "bg-blue-500";
  const border = gap.severity === "Critical" ? "border-red-200" : gap.severity === "High" ? "border-amber-200" : "border-blue-100";
  return (
    <article className={`relative overflow-hidden rounded-xl border bg-white p-4 shadow-sm ${border}`}>
      <span className={`absolute inset-y-0 left-0 w-1 ${accent}`} />
      <div className="pl-1">
        <div className="flex flex-wrap items-start gap-2"><SeverityBadge severity={gap.severity} /><Badge tone={gap.status === "In Progress" ? "yellow" : "grey"}>{gap.status}</Badge><Badge tone="blue">Owner: {gap.owner}</Badge></div>
        <h4 className="mt-3 text-sm font-semibold text-slate-800">{gap.title}</h4>
        <p className="mt-0.5 text-[10px] font-medium text-slate-400">Affected section · {gap.affectedSection}</p>
        <p className="mt-2 text-xs leading-5 text-slate-600">{gap.explanation}</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <div className="rounded-lg border border-amber-100 bg-amber-50/70 p-3"><p className="text-[9px] font-bold uppercase tracking-[0.12em] text-amber-700">Evidence needed</p><p className="mt-1 text-xs leading-5 text-amber-950">{gap.requiredDocument}</p></div>
          <div className="rounded-lg border border-blue-100 bg-blue-50/70 p-3"><p className="text-[9px] font-bold uppercase tracking-[0.12em] text-blue-700">Recommended next action</p><p className="mt-1 text-xs leading-5 text-blue-950">{gap.suggestedFix}</p></div>
        </div>
        <div className="mt-3 flex justify-end border-t border-slate-100 pt-3"><Link href="/onboarding" className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-700 hover:text-blue-900">Add supporting evidence <ArrowRight size={11} /></Link></div>
      </div>
    </article>
  );
}

function FinancialIssueCard({ check }: { check: FinancialCheck }) {
  const consistent = check.severity === "Low";
  return (
    <article className={`relative overflow-hidden rounded-xl border bg-white p-4 shadow-sm ${consistent ? "border-emerald-200" : check.severity === "Critical" ? "border-red-200" : "border-amber-200"}`}>
      <span className={`absolute inset-y-0 left-0 w-1 ${consistent ? "bg-emerald-500" : check.severity === "Critical" ? "bg-red-500" : "bg-amber-500"}`} />
      <div className="flex items-start justify-between gap-3 pl-1"><div><p className={`text-[9px] font-bold uppercase tracking-[0.13em] ${consistent ? "text-emerald-600" : "text-amber-600"}`}>{consistent ? "Consistency check passed" : "Reconciliation required"}</p><h4 className="mt-1 text-sm font-semibold text-slate-800">{check.checkName}</h4></div><SeverityBadge severity={check.severity} /></div>
      <div className="mt-3 grid grid-cols-3 gap-2 pl-1">
        <FinancialValue label="Expected" value={check.expectedValue} />
        <FinancialValue label="Found" value={check.foundValue} />
        <FinancialValue label="Difference" value={check.difference} highlight={!consistent} />
      </div>
      <p className="mt-3 pl-1 text-xs leading-5 text-slate-600">{check.explanation}</p>
      {check.suggestedFix !== "—" && <div className="mt-3 rounded-lg border border-blue-100 bg-blue-50/70 p-3 text-xs leading-5 text-blue-900"><span className="font-semibold">Recommended action:</span> {check.suggestedFix}</div>}
    </article>
  );
}

function FinancialValue({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return <div className={`min-w-0 rounded-lg border p-2.5 ${highlight ? "border-red-100 bg-red-50" : "border-slate-100 bg-slate-50"}`}><p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">{label}</p><p className={`mt-1 break-words text-xs font-semibold ${highlight ? "text-red-700" : "text-slate-700"}`}>{value}</p></div>;
}

function RuleOutcome({ label, value, tone }: { label: string; value: number; tone: "green" | "amber" | "red" | "slate" }) {
  const styles = {
    green: "border-emerald-200 bg-emerald-50 text-emerald-700",
    amber: "border-amber-200 bg-amber-50 text-amber-700",
    red: "border-red-200 bg-red-50 text-red-700",
    slate: "border-slate-200 bg-slate-50 text-slate-600",
  }[tone];
  return (
    <div className={`rounded-xl border px-3 py-2 ${styles}`}>
      <div className="text-lg font-bold leading-none">{value}</div>
      <div className="mt-1 text-[10px] font-semibold uppercase tracking-wide">{label}</div>
    </div>
  );
}

function ObservationMetric({ label, value, tone }: { label: string; value: number; tone: "red" | "amber" | "blue" | "slate" }) {
  const styles = {
    red: "border-red-200 bg-red-50 text-red-700",
    amber: "border-amber-200 bg-amber-50 text-amber-700",
    blue: "border-blue-200 bg-blue-50 text-blue-700",
    slate: "border-slate-200 bg-slate-50 text-slate-600",
  }[tone];
  return (
    <div className={`flex items-center justify-between rounded-xl border px-3 py-2 ${styles}`}>
      <span className="text-[10px] font-semibold">{label}</span>
      <span className="text-base font-bold">{value}</span>
    </div>
  );
}

function ObservationFilter({ active, label, count, onClick }: { active: boolean; label: string; count: number; onClick: () => void }) {
  return (
    <button type="button" role="tab" aria-selected={active} onClick={onClick} className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[10px] font-semibold transition ${active ? "border-[#15345b] bg-[#15345b] text-white shadow-sm" : "border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-700"}`}>
      {label}<span className={`rounded px-1 py-0.5 text-[9px] ${active ? "bg-white/15" : "bg-slate-100"}`}>{count}</span>
    </button>
  );
}

function ObservationCard({
  observation,
  rank,
}: {
  observation: AnalysisResult["observations"][number];
  rank: number;
}) {
  const severityStyle = {
    Critical: { border: "!border-red-200", accent: "bg-red-500", rank: "bg-red-600", wash: "bg-red-50 text-red-700" },
    High: { border: "!border-amber-200", accent: "bg-amber-500", rank: "bg-amber-500", wash: "bg-amber-50 text-amber-700" },
    Medium: { border: "!border-blue-200", accent: "bg-blue-500", rank: "bg-blue-600", wash: "bg-blue-50 text-blue-700" },
    Low: { border: "!border-slate-200", accent: "bg-slate-400", rank: "bg-slate-600", wash: "bg-slate-100 text-slate-600" },
  }[observation.severity];

  return (
    <GlassPanel className={`relative overflow-hidden ${severityStyle.border}`}>
      <span className={`absolute inset-y-0 left-0 w-1 ${severityStyle.accent}`} />
      <div className="border-b border-slate-100 bg-white/60 px-5 py-4 md:px-6">
        <div className="flex items-start gap-3">
          <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl text-xs font-bold text-white shadow-sm ${severityStyle.rank}`}>{rank}</span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-bold ${severityStyle.wash}`}><AlertTriangle size={11} /> {likelihood[observation.severity]?.label}</span>
              <span className="rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-500">{observation.affectedSection}</span>
            </div>
            <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Simulated reviewer observation</p>
            <h3 className="mt-1 text-base font-semibold leading-6 text-[#15345b]">{observation.observation}</h3>
          </div>
        </div>
      </div>

      <div className="grid gap-3 bg-slate-50/55 p-4 lg:grid-cols-3 md:p-5">
        <ObservationStep
          number="01"
          icon={AlertTriangle}
          label="Review trigger"
          title="Why this may be asked"
          body={observation.whyItMayBeAsked}
          tone="slate"
        />
        <ObservationStep
          number="02"
          icon={Sparkles}
          label="Pre-emptive disclosure"
          title="Suggested response"
          body={observation.suggestedResponse}
          tone="blue"
        />
        <ObservationStep
          number="03"
          icon={FileSearch}
          label="Response pack"
          title="Required evidence"
          body={observation.requiredEvidence}
          tone="amber"
        />
      </div>
    </GlassPanel>
  );
}

function ObservationStep({
  number,
  icon: Icon,
  label,
  title,
  body,
  tone,
}: {
  number: string;
  icon: typeof FileSearch;
  label: string;
  title: string;
  body: string;
  tone: "slate" | "blue" | "amber";
}) {
  const styles = {
    slate: { card: "border-slate-200 bg-white", icon: "bg-slate-100 text-slate-600", label: "text-slate-500" },
    blue: { card: "border-blue-200 bg-blue-50/70", icon: "bg-blue-100 text-blue-700", label: "text-blue-600" },
    amber: { card: "border-amber-200 bg-amber-50/70", icon: "bg-amber-100 text-amber-700", label: "text-amber-600" },
  }[tone];
  return (
    <div className={`relative rounded-xl border p-4 ${styles.card}`}>
      <span className="absolute right-3 top-2 text-2xl font-bold text-slate-200/70">{number}</span>
      <span className={`grid h-8 w-8 place-items-center rounded-lg ${styles.icon}`}><Icon size={15} /></span>
      <p className={`mt-3 text-[9px] font-bold uppercase tracking-[0.14em] ${styles.label}`}>{label}</p>
      <h4 className="mt-1 text-xs font-semibold text-slate-800">{title}</h4>
      <p className="mt-1.5 text-xs leading-5 text-slate-600">{body}</p>
    </div>
  );
}

function IntelligenceMetric({
  icon: Icon,
  label,
  value,
  note,
  tone,
}: {
  icon: typeof FileSearch;
  label: string;
  value: string | number;
  note: string;
  tone: "blue" | "green" | "amber" | "red";
}) {
  const styles = {
    blue: { panel: "!border-blue-200 !bg-gradient-to-br !from-blue-50 !to-white", icon: "bg-blue-100 text-blue-700" },
    green: { panel: "!border-emerald-200 !bg-gradient-to-br !from-emerald-50 !to-white", icon: "bg-emerald-100 text-emerald-700" },
    amber: { panel: "!border-amber-200 !bg-gradient-to-br !from-amber-50 !to-white", icon: "bg-amber-100 text-amber-700" },
    red: { panel: "!border-red-200 !bg-gradient-to-br !from-red-50 !to-white", icon: "bg-red-100 text-red-700" },
  }[tone];
  return (
    <GlassPanel className={`p-4 ${styles.panel}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">{label}</p>
          <p className="mt-1 text-2xl font-bold text-[#15345b]">{value}</p>
        </div>
        <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${styles.icon}`}><Icon size={16} /></span>
      </div>
      <p className="mt-2 truncate text-[11px] text-slate-500" title={note}>{note}</p>
    </GlassPanel>
  );
}

function SignalStrip({
  icon: Icon,
  label,
  value,
  note,
  tone,
  onClick,
}: {
  icon: typeof FileSearch;
  label: string;
  value: string | number;
  note: string;
  tone: "green" | "amber" | "red";
  onClick: () => void;
}) {
  const styles = {
    green: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    red: "bg-red-50 text-red-700",
  }[tone];
  return (
    <button type="button" onClick={onClick} className="group flex items-center gap-3 px-4 py-4 text-left transition hover:bg-blue-50/60">
      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${styles}`}><Icon size={18} /></span>
      <span className="min-w-0 flex-1">
        <span className="block text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">{label}</span>
        <span className="mt-0.5 block text-lg font-bold text-[#15345b]">{value}</span>
        <span className="block truncate text-[11px] text-slate-500">{note}</span>
      </span>
      <ChevronRight size={15} className="text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-blue-600" />
    </button>
  );
}

function HeatLegend({
  label,
  count,
  tone,
  active,
  onClick,
}: {
  label: string;
  count: number;
  tone: "blue" | "green" | "amber" | "red" | "slate";
  active: boolean;
  onClick: () => void;
}) {
  const styles = {
    blue: "border-blue-200 bg-blue-50 text-blue-700",
    green: "border-emerald-200 bg-emerald-50 text-emerald-700",
    amber: "border-amber-200 bg-amber-50 text-amber-700",
    red: "border-red-200 bg-red-50 text-red-700",
    slate: "border-slate-200 bg-slate-100 text-slate-600",
  }[tone];
  const activeRing = {
    blue: "ring-blue-400",
    green: "ring-emerald-400",
    amber: "ring-amber-400",
    red: "ring-red-400",
    slate: "ring-slate-400",
  }[tone];
  return (
    <button type="button" aria-pressed={active} onClick={onClick} className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1.5 text-[9px] font-semibold transition hover:-translate-y-0.5 hover:shadow-sm ${styles} ${active ? `ring-2 ring-offset-1 ${activeRing}` : ""}`}>
      <b>{count}</b> {label}
    </button>
  );
}

function HeatmapSectionCard({ row, selected, onClick }: { row: CoverageRow; selected: boolean; onClick: () => void }) {
  const accent = {
    Ready: "bg-emerald-500",
    "Needs Clarification": "bg-amber-500",
    "Critical Issue": "bg-red-500",
    "Missing Data": "bg-slate-400",
  }[row.riskLevel];
  const label = {
    Ready: "Ready",
    "Needs Clarification": "Clarify",
    "Critical Issue": "Critical",
    "Missing Data": "Missing",
  }[row.riskLevel];
  const selectedRing = {
    Ready: "ring-2 ring-emerald-400",
    "Needs Clarification": "ring-2 ring-amber-400",
    "Critical Issue": "ring-2 ring-red-400",
    "Missing Data": "ring-2 ring-slate-400",
  }[row.riskLevel];

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`group relative w-full overflow-hidden rounded-xl border bg-white p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${riskTone[row.riskLevel]} ${selected ? selectedRing : ""}`}
      title={`${row.sectionName}, ${row.completionPct}%\n${riskExplain[row.riskLevel]}`}
    >
      <span className={`absolute inset-y-0 left-0 w-1 ${accent}`} />
      <div className="flex items-start justify-between gap-2 pl-1">
        <div className="min-w-0">
          <h5 className="truncate text-xs font-semibold text-slate-800" title={row.sectionName}>{row.sectionName}</h5>
          <p className="mt-0.5 text-[10px] text-slate-500">{row.sourceDocs.length} source{row.sourceDocs.length === 1 ? "" : "s"} · {row.avgConfidence}% confidence</p>
        </div>
        <span className="shrink-0 text-sm font-bold text-[#15345b]">{row.completionPct}%</span>
      </div>
      <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-white/80">
        <div className={`h-full rounded-full ${accent}`} style={{ width: `${row.completionPct}%` }} />
      </div>
      <div className="mt-2 flex items-center justify-between gap-2 pl-1 text-[9px]">
        <span className="font-semibold text-slate-600">{label}</span>
        <span className="truncate text-slate-500">{row.missingFacts.length > 0 ? `${row.missingFacts.length} input${row.missingFacts.length === 1 ? "" : "s"} missing` : "Click to inspect"}</span>
      </div>
    </button>
  );
}

function HeatmapDetail({ row, onClose }: { row: CoverageRow; onClose: () => void }) {
  const theme = {
    Ready: {
      shell: "border-emerald-200 bg-gradient-to-r from-emerald-50 to-white",
      icon: "bg-emerald-100 text-emerald-700",
      text: "text-emerald-800",
      chip: "border-emerald-200 bg-emerald-100 text-emerald-800",
      label: "Evidence points supporting this ready rating",
    },
    "Needs Clarification": {
      shell: "border-amber-200 bg-gradient-to-r from-amber-50 to-white",
      icon: "bg-amber-100 text-amber-700",
      text: "text-amber-800",
      chip: "border-amber-200 bg-amber-100 text-amber-800",
      label: "Points requiring clarification",
    },
    "Critical Issue": {
      shell: "border-red-200 bg-gradient-to-r from-red-50 to-white",
      icon: "bg-red-100 text-red-700",
      text: "text-red-800",
      chip: "border-red-200 bg-red-100 text-red-800",
      label: "Critical points blocking this section",
    },
    "Missing Data": {
      shell: "border-slate-300 bg-gradient-to-r from-slate-100 to-white",
      icon: "bg-slate-200 text-slate-700",
      text: "text-slate-700",
      chip: "border-slate-300 bg-slate-200 text-slate-700",
      label: "Inputs still missing for this section",
    },
  }[row.riskLevel];
  const points = row.riskLevel === "Ready" ? row.availableFacts : row.missingFacts;

  return (
    <div className={`border-b px-4 py-4 md:px-5 ${theme.shell}`}>
      <div className="flex items-start gap-3">
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${theme.icon}`}>
          {row.riskLevel === "Ready" ? <CheckCircle2 size={19} /> : row.riskLevel === "Critical Issue" ? <XCircle size={19} /> : <AlertTriangle size={19} />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-sm font-semibold text-slate-800">{row.sectionName}</h4>
            <span className={`rounded-lg px-2 py-1 text-[10px] font-bold ${theme.icon}`}>{row.riskLevel} · {row.completionPct}%</span>
          </div>
          <p className="mt-1 text-xs leading-5 text-slate-600">{riskExplain[row.riskLevel]}</p>
          <p className={`mt-3 text-[10px] font-bold uppercase tracking-[0.12em] ${theme.text}`}>{theme.label}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {points.length > 0 ? points.map((point) => (
              <span key={point} className={`rounded-lg border px-2 py-1 text-[10px] font-semibold ${theme.chip}`}>{prettyLabel(point)}</span>
            )) : (
              <span className="text-[11px] text-slate-500">No individual input keys were recorded for this section.</span>
            )}
          </div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-slate-500">
            <span><b className="text-slate-700">{row.availableFacts.length}</b> sourced facts</span>
            <span><b className="text-slate-700">{row.missingFacts.length}</b> missing inputs</span>
            <span><b className="text-slate-700">{row.avgConfidence}%</b> average confidence</span>
            <span><b className="text-slate-700">{row.canGenerate}</b> draft generation</span>
          </div>
        </div>
        <button type="button" onClick={onClose} title="Close section details" className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/70 text-slate-400 transition hover:bg-white hover:text-slate-700"><XCircle size={16} /></button>
      </div>
    </div>
  );
}

function RuleAudit({
  checks,
  open,
  onToggle,
  view,
  onView,
  search,
  onSearch,
}: {
  checks: ReadinessCheck[];
  open: boolean;
  onToggle: () => void;
  view: RuleView;
  onView: (view: RuleView) => void;
  search: string;
  onSearch: (value: string) => void;
}) {
  const counts = {
    pass: checks.filter((check) => check.status === "pass").length,
    warning: checks.filter((check) => check.status === "warning").length,
    fail: checks.filter((check) => check.status === "fail").length,
    missing: checks.filter((check) => check.status === "missing").length,
  };
  const attention = counts.warning + counts.fail + counts.missing;
  const query = search.trim().toLowerCase();
  const filtered = checks
    .filter((check) => view === "all" || (view === "attention" ? check.status !== "pass" : check.status === view))
    .filter((check) => !query || [check.category, check.ruleName, check.explanation, check.suggestedFix].some((value) => value.toLowerCase().includes(query)))
    .sort((left, right) => {
      const priority: Record<CheckStatus, number> = { fail: 0, missing: 1, warning: 2, pass: 3 };
      return priority[left.status] - priority[right.status];
    });
  const groups = Array.from(filtered.reduce((map, check) => {
    const group = map.get(check.category) ?? [];
    group.push(check);
    map.set(check.category, group);
    return map;
  }, new Map<ReadinessCheck["category"], ReadinessCheck[]>()));

  return (
    <GlassPanel className="mt-5 overflow-hidden">
      <div className="flex flex-col gap-4 px-5 py-4 lg:flex-row lg:items-center">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#174376] to-blue-600 text-white shadow-md shadow-blue-900/20"><ShieldCheck size={20} /></span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-semibold text-[#15345b]">Rule-by-rule readiness audit</h3><Badge tone="blue">{checks.length} deterministic checks</Badge></div>
          <p className="mt-1 text-xs text-slate-500">Inspect the exact rule, outcome, evidence-based explanation and recommended remediation.</p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <AuditTotal label="Pass" value={counts.pass} tone="green" />
          <AuditTotal label="Warn" value={counts.warning} tone="amber" />
          <AuditTotal label="Fail" value={counts.fail} tone="red" />
          <AuditTotal label="Missing" value={counts.missing} tone="slate" />
        </div>
        <button type="button" onClick={onToggle} className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 text-xs font-semibold text-blue-700 hover:bg-blue-100">
          {open ? "Hide audit" : `Review ${attention} exceptions`} {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
      </div>

      {open && (
        <div className="border-t border-slate-100 bg-slate-50/65">
          <div className="flex flex-col gap-3 border-b border-slate-200/70 bg-white/60 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Rule result filters">
              <RuleFilter active={view === "attention"} label="Needs attention" count={attention} onClick={() => onView("attention")} />
              <RuleFilter active={view === "fail"} label="Failed" count={counts.fail} onClick={() => onView("fail")} />
              <RuleFilter active={view === "missing"} label="Missing" count={counts.missing} onClick={() => onView("missing")} />
              <RuleFilter active={view === "warning"} label="Warnings" count={counts.warning} onClick={() => onView("warning")} />
              <RuleFilter active={view === "pass"} label="Passed" count={counts.pass} onClick={() => onView("pass")} />
              <RuleFilter active={view === "all"} label="All rules" count={checks.length} onClick={() => onView("all")} />
            </div>
            <div className="relative min-w-[220px] lg:w-72">
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={(event) => onSearch(event.target.value)} placeholder="Search rule or explanation" className="h-9 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-xs text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
            </div>
          </div>

          <div className="max-h-[620px] space-y-4 overflow-y-auto p-4">
            {groups.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white px-5 py-10 text-center"><Search size={20} className="mx-auto text-slate-400" /><p className="mt-2 text-sm font-semibold text-slate-700">No matching rules</p><p className="mt-1 text-xs text-slate-500">Change the status filter or search term.</p></div>
            ) : groups.map(([category, categoryChecks]) => (
              <section key={category}>
                <div className="mb-2 flex items-center justify-between gap-3 px-1"><h4 className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">{category}</h4><span className="text-[10px] text-slate-400">{categoryChecks.length} result{categoryChecks.length === 1 ? "" : "s"}</span></div>
                <div className="space-y-2">
                  {categoryChecks.map((check) => <RuleResultCard key={check.id} check={check} />)}
                </div>
              </section>
            ))}
          </div>
        </div>
      )}
    </GlassPanel>
  );
}

function AuditTotal({ label, value, tone }: { label: string; value: number; tone: "green" | "amber" | "red" | "slate" }) {
  const style = {
    green: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    red: "bg-red-50 text-red-700",
    slate: "bg-slate-100 text-slate-600",
  }[tone];
  return <span className={`rounded-lg px-2 py-1 text-[10px] font-semibold ${style}`}><b>{value}</b> {label}</span>;
}

function RuleFilter({ active, label, count, onClick }: { active: boolean; label: string; count: number; onClick: () => void }) {
  return (
    <button type="button" role="tab" aria-selected={active} onClick={onClick} className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[10px] font-semibold transition ${active ? "border-[#15345b] bg-[#15345b] text-white" : "border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-700"}`}>
      {label}<span className={`rounded px-1 py-0.5 text-[9px] ${active ? "bg-white/15" : "bg-slate-100"}`}>{count}</span>
    </button>
  );
}

function RuleResultCard({ check }: { check: ReadinessCheck }) {
  const styles: Record<CheckStatus, { accent: string; wash: string; icon: typeof CheckCircle2; label: string }> = {
    pass: { accent: "bg-emerald-500", wash: "border-emerald-200", icon: CheckCircle2, label: "Pass" },
    warning: { accent: "bg-amber-500", wash: "border-amber-200", icon: AlertTriangle, label: "Warning" },
    fail: { accent: "bg-red-500", wash: "border-red-200", icon: XCircle, label: "Fail" },
    missing: { accent: "bg-slate-400", wash: "border-slate-200", icon: CircleDashed, label: "Missing data" },
  };
  const style = styles[check.status];
  const Icon = style.icon;
  return (
    <article className={`relative overflow-hidden rounded-xl border bg-white p-4 shadow-sm ${style.wash}`}>
      <span className={`absolute inset-y-0 left-0 w-1 ${style.accent}`} />
      <div className="flex items-start gap-3 pl-1">
        <span className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg ${check.status === "pass" ? "bg-emerald-50 text-emerald-700" : check.status === "warning" ? "bg-amber-50 text-amber-700" : check.status === "fail" ? "bg-red-50 text-red-700" : "bg-slate-100 text-slate-600"}`}><Icon size={16} /></span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2"><h5 className="text-sm font-semibold text-slate-800">{check.ruleName}</h5><span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[9px] font-semibold text-slate-500">{check.severity}</span></div>
          <p className="mt-1 text-xs leading-5 text-slate-600">{check.explanation}</p>
          {check.status !== "pass" && check.suggestedFix && check.suggestedFix !== "—" && (
            <div className="mt-2 rounded-lg bg-blue-50 px-3 py-2 text-[11px] leading-5 text-blue-800"><span className="font-semibold">Recommended action:</span> {check.suggestedFix}</div>
          )}
        </div>
        <span className={`shrink-0 rounded-lg px-2 py-1 text-[10px] font-bold ${check.status === "pass" ? "bg-emerald-100 text-emerald-700" : check.status === "warning" ? "bg-amber-100 text-amber-700" : check.status === "fail" ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-600"}`}>{style.label}</span>
      </div>
    </article>
  );
}
