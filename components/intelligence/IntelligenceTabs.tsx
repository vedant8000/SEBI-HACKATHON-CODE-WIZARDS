"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { RefreshCw, ChevronDown } from "lucide-react";
import type {
  AnalysisResult, CoverageRow, FactConflict, FinancialYear, ObjectOfIssue,
} from "@/lib/types";
import {
  Badge, CheckStatusBadge, GlassPanel, GlassStat, HeroBackdrop, ProgressBar, ScoreDonut, SeverityBadge,
} from "@/components/shared/ui";
import { CategoryScoreChart } from "@/components/charts/charts";
import ObjectsForm from "@/components/objects/ObjectsForm";
import { rptBand } from "@/lib/rules/scoring-config";
import { useT } from "@/components/i18n/LanguageProvider";

// Stable English identifiers double as tab state; display labels are translated.
const TABS = [
  "Overview", "Missing Data", "Inconsistencies", "RPT & Fund Use Risk",
  "Objects of Issue", "Likely Reviewer Questions",
] as const;

const TAB_LABEL_KEYS: Record<string, string> = {
  "Overview": "in.tabOverview", "Missing Data": "in.tabMissing", "Inconsistencies": "in.tabInconsistencies",
  "RPT & Fund Use Risk": "in.tabRpt", "Objects of Issue": "in.tabObjects", "Likely Reviewer Questions": "in.tabQuestions",
};

const riskTone: Record<string, string> = {
  Ready: "bg-emerald-100 border-emerald-300",
  "Needs Clarification": "bg-amber-100 border-amber-300",
  "Critical Issue": "bg-red-100 border-red-300",
  "Missing Data": "bg-slate-200 border-slate-300",
};

// Translation keys for the per-risk explanation and popup accent labels.
const riskExplainKey: Record<string, string> = {
  Ready: "in.riskReady", "Needs Clarification": "in.riskNeeds",
  "Critical Issue": "in.riskCritical", "Missing Data": "in.riskMissing",
};
const accentLabelKey: Record<string, string> = {
  Ready: "in.accentReady", "Needs Clarification": "in.accentNeeds",
  "Critical Issue": "in.accentCritical", "Missing Data": "in.accentMissing",
};

// accent colours for the iOS-style section popup
const riskAccent: Record<string, { ring: string; text: string; chip: string }> = {
  Ready: { ring: "#10b981", text: "text-emerald-600", chip: "bg-emerald-100 text-emerald-700" },
  "Needs Clarification": { ring: "#f59e0b", text: "text-amber-600", chip: "bg-amber-100 text-amber-700" },
  "Critical Issue": { ring: "#ef4444", text: "text-red-600", chip: "bg-red-100 text-red-700" },
  "Missing Data": { ring: "#94a3b8", text: "text-slate-500", chip: "bg-slate-200 text-slate-600" },
};

export default function IntelligenceTabs({
  analysis, coverage, conflicts, objects, evidenceDocs, freshIssueCr,
}: {
  analysis: AnalysisResult | null;
  coverage: CoverageRow[];
  conflicts: FactConflict[];
  objects: ObjectOfIssue[];
  evidenceDocs: string[];
  freshIssueCr: number | null;
  financials: FinancialYear[];
}) {
  const router = useRouter();
  const tr = useT();
  const [tab, setTab] = useState<(typeof TABS)[number]>("Overview");
  const [running, setRunning] = useState(false);
  const [activeSection, setActiveSection] = useState<CoverageRow | null>(null);

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
  const rpt = analysis?.rptRisks ?? [];
  const observations = analysis?.observations ?? [];
  const avgCoverage = coverage.length ? Math.round(coverage.reduce((x, c) => x + c.completionPct, 0) / coverage.length) : 0;

  // fund-use warnings derived from the saved objects plan
  const objectsTotal = objects.reduce((x, o) => x + o.amountCr, 0);
  const fundUseWarnings: string[] = [];
  for (const o of objects) if (o.warning) fundUseWarnings.push(`${o.category}: ${o.warning}`);
  if (freshIssueCr != null && objects.length && Math.abs(objectsTotal - freshIssueCr) > 0.01)
    fundUseWarnings.push(tr("in.objectsMismatch", { total: objectsTotal.toFixed(1), fresh: freshIssueCr }));
  const gcp = objects.filter((o) => /general corporate/i.test(o.category)).reduce((x, o) => x + o.amountCr, 0);
  if (objectsTotal > 0 && gcp / objectsTotal > 0.25)
    fundUseWarnings.push(tr("in.gcpWarn", { pct: Math.round((gcp / objectsTotal) * 100) }));

  if (!analysis) {
    return (
      <HeroBackdrop className="p-5 md:p-6">
        <GlassPanel className="p-8 text-center">
          <p className="text-sm text-slate-500">{tr("in.notRunYet")}</p>
          <button onClick={rerun} disabled={running}
            className="mt-4 px-5 py-2 bg-blue-600 text-white text-sm rounded-lg disabled:opacity-50 inline-flex items-center gap-2">
            <RefreshCw size={14} className={running ? "animate-spin" : ""} /> {tr("ri.run")}
          </button>
        </GlassPanel>
      </HeroBackdrop>
    );
  }

  return (
    <HeroBackdrop className="p-5 md:p-6">
    <div className="relative">
      <div className="flex flex-wrap items-center gap-1.5 mb-5 border-b border-white/60 pb-3">
        {TABS.map((tabId) => (
          <button key={tabId} onClick={() => setTab(tabId)}
            className={`px-3.5 py-1.5 text-[13px] font-medium rounded-full transition-all ${tab === tabId ? "bg-gradient-to-r from-blue-600 to-sky-500 text-white shadow-sm shadow-blue-600/30" : "text-slate-600 hover:bg-white/60"}`}>
            {tr(TAB_LABEL_KEYS[tabId])}
            {tabId === "Missing Data" && gaps.length > 0 && <span className="ml-1.5 text-[10px] bg-white/20 px-1.5 rounded-full">{gaps.length}</span>}
            {tabId === "Inconsistencies" && (finIssues.length + openConflicts.length) > 0 && <span className="ml-1.5 text-[10px] bg-white/20 px-1.5 rounded-full">{finIssues.length + openConflicts.length}</span>}
            {tabId === "Likely Reviewer Questions" && observations.length > 0 && <span className="ml-1.5 text-[10px] bg-white/20 px-1.5 rounded-full">{observations.length}</span>}
          </button>
        ))}
        <button onClick={rerun} disabled={running}
          className="ml-auto px-3 py-1.5 text-xs font-medium border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 inline-flex items-center gap-1.5">
          <RefreshCw size={12} className={running ? "animate-spin" : ""} /> {tr("in.reRun")}
        </button>
      </div>

      {/* ── Tab 1: Overview ─────────────────────────────────────────────── */}
      {tab === "Overview" && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <GlassPanel className="p-4 flex items-center gap-4 col-span-2">
              <ScoreDonut score={s?.overall ?? 0} />
              <div>
                <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">{tr("in.readinessScore")}</div>
                <div className="text-sm text-slate-700 mt-1 max-w-[240px]">{s?.statusLine}</div>
              </div>
            </GlassPanel>
            <GlassStat label={tr("in.draftCoverage")} value={`${avgCoverage}%`} sub={tr("in.sectionsGeneratable", { gen: coverage.filter((c) => c.canGenerate === "YES").length, total: coverage.length })} />
            <GlassStat label={tr("in.criticalGaps")} value={gaps.filter((g) => g.severity === "Critical").length} tone={gaps.some((g) => g.severity === "Critical") ? "bad" : "good"} sub={tr("in.highPriorityItems", { n: gaps.filter((g) => g.severity === "High").length })} />
            <GlassStat label={tr("in.factConflicts")} value={openConflicts.length} tone={openConflicts.length ? "bad" : "good"} sub={tr("ft.conflictsSub")} />
            <GlassStat label={tr("in.rptRisk")} value={`${s?.rptScore ?? 0}/100`} tone={s && s.rptScore > 60 ? "bad" : s && s.rptScore > 30 ? "warn" : "good"} sub={tr("in.rptBandSub", { band: rptBand(s?.rptScore ?? 0) })} />
            <GlassStat label={tr("in.finConsistency")} value={`${s?.finConsistencyScore ?? 0}/100`} tone={s && s.finConsistencyScore < 60 ? "bad" : s && s.finConsistencyScore < 85 ? "warn" : "good"} sub={tr("in.crossChecks", { n: finChecks.length })} />
            <GlassStat label={tr("in.reviewerQuestions")} value={observations.length} sub={tr("in.simulatedQueries")} />
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            <GlassPanel className="p-5">
              <h3 className="text-sm font-semibold text-slate-800 mb-1">{tr("in.readinessByCategory")}</h3>
              <p className="text-xs text-slate-500 mb-2">{tr("in.categoryWeights")}</p>
              <CategoryScoreChart data={Object.entries(s?.byCategory ?? {}).map(([category, score]) => ({ category, score }))} />
            </GlassPanel>
            <GlassPanel className="p-5">
              <h3 className="text-sm font-semibold text-slate-800 mb-1">{tr("in.heatmap")}</h3>
              <p className="text-xs text-slate-500 mb-3">{tr("in.allSections", { n: coverage.length })}</p>
              <div className="flex flex-wrap gap-1.5">
                {coverage.map((c) => (
                  <button key={c.sectionId} type="button" onClick={() => setActiveSection(c)}
                    title={`${c.sectionName} — ${c.completionPct}% (${c.riskLevel})\n${tr(riskExplainKey[c.riskLevel] ?? "in.riskMissing")}`}
                    aria-label={`${c.sectionName}, ${c.completionPct}% coverage, ${c.riskLevel}`}
                    className={`w-9 h-9 rounded border flex items-center justify-center text-[9px] font-semibold text-slate-700 transition-transform hover:scale-110 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 cursor-pointer ${riskTone[c.riskLevel]}`}>
                    {c.completionPct}
                  </button>
                ))}
              </div>
              <div className="flex gap-3 mt-3 text-[11px] text-slate-500 flex-wrap">
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-emerald-100 border border-emerald-300" />{tr("in.legendReady")}</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-amber-100 border border-amber-300" />{tr("in.legendNeeds")}</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-red-100 border border-red-300" />{tr("in.legendCritical")}</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-slate-200 border border-slate-300" />{tr("in.legendMissing")}</span>
              </div>
            </GlassPanel>
          </div>

          <GlassPanel className="p-5">
            <h3 className="text-sm font-semibold text-slate-800 mb-3">{tr("in.top5Blockers")}</h3>
            {sortedGaps.length === 0 ? (
              <p className="text-sm text-slate-400">{tr("in.noBlockers")}</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {sortedGaps.slice(0, 5).map((g) => (
                  <li key={g.id} className="py-2.5 flex items-start gap-3">
                    <SeverityBadge severity={g.severity} />
                    <div>
                      <div className="text-sm font-medium text-slate-800">{g.title}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{g.suggestedFix} · {tr("in.owner")} {g.owner}</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </GlassPanel>
        </div>
      )}

      {/* ── Tab 2: Missing Data ─────────────────────────────────────────── */}
      {tab === "Missing Data" && (
        <div className="space-y-3">
          {sortedGaps.length === 0 && <GlassPanel className="p-8 text-center text-sm text-slate-400">{tr("in.noMissing")}</GlassPanel>}
          {sortedGaps.map((g) => (
            <GlassPanel key={g.id} className="p-5">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <SeverityBadge severity={g.severity} />
                <h3 className="text-sm font-semibold text-slate-800">{g.title}</h3>
                <span className="text-xs text-slate-400">· {g.affectedSection}</span>
                <span className="ml-auto flex items-center gap-2">
                  <Badge tone="blue">{tr("in.owner")} {g.owner}</Badge>
                  <Badge tone={g.status === "In Progress" ? "yellow" : "grey"}>{g.status}</Badge>
                </span>
              </div>
              <p className="text-sm text-slate-600">{g.explanation}</p>
              <div className="grid md:grid-cols-2 gap-3 mt-3 text-[13px]">
                <div className="bg-slate-50 rounded-lg px-3 py-2"><span className="font-medium text-slate-700">{tr("in.missingFactDoc")}</span> <span className="text-slate-600">{g.requiredDocument}</span></div>
                <div className="bg-blue-50 rounded-lg px-3 py-2"><span className="font-medium text-blue-800">{tr("in.suggestedFix")}</span> <span className="text-blue-900">{g.suggestedFix}</span></div>
              </div>
            </GlassPanel>
          ))}
        </div>
      )}

      {/* ── Tab 3: Inconsistencies ──────────────────────────────────────── */}
      {tab === "Inconsistencies" && (
        <div className="space-y-3">
          {openConflicts.length > 0 && (
            <GlassPanel className="p-4 !border-red-300/80 !bg-red-100/80">
              <h3 className="text-sm font-semibold text-red-800 mb-2">{tr("in.factConflictsAcross")}</h3>
              <ul className="space-y-1.5 text-[13px] text-red-900">
                {openConflicts.map((c) => (
                  <li key={c.id}>⚠ <strong>{c.factKey}</strong>: {c.valueA} ({c.sourceA}) vs {c.valueB} ({c.sourceB})</li>
                ))}
              </ul>
            </GlassPanel>
          )}
          {finChecks.length === 0 && openConflicts.length === 0 && (
            <GlassPanel className="p-8 text-center text-sm text-slate-400">
              {tr("in.noInconsistencies")}
            </GlassPanel>
          )}
          {finChecks.map((c) => (
            <GlassPanel key={c.id} className="p-5">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <SeverityBadge severity={c.severity} />
                <h3 className="text-sm font-semibold text-slate-800">{c.checkName}</h3>
              </div>
              <div className="grid md:grid-cols-3 gap-3 text-[13px] mb-2">
                <div className="bg-slate-50 rounded-lg px-3 py-2"><div className="text-slate-400 text-xs">{tr("in.expected")}</div><div className="font-medium text-slate-700">{c.expectedValue}</div></div>
                <div className="bg-slate-50 rounded-lg px-3 py-2"><div className="text-slate-400 text-xs">{tr("in.found")}</div><div className="font-medium text-slate-700">{c.foundValue}</div></div>
                <div className={`rounded-lg px-3 py-2 ${c.severity === "Low" ? "bg-emerald-50" : "bg-red-50"}`}><div className="text-slate-400 text-xs">{tr("in.difference")}</div><div className={`font-medium ${c.severity === "Low" ? "text-emerald-700" : "text-red-700"}`}>{c.difference}</div></div>
              </div>
              <p className="text-sm text-slate-600">{c.explanation}</p>
              {c.suggestedFix !== "—" && <p className="text-[13px] text-blue-800 bg-blue-50 rounded-lg px-3 py-2 mt-2"><span className="font-medium">{tr("in.suggestedFix")}</span> {c.suggestedFix}</p>}
            </GlassPanel>
          ))}
        </div>
      )}

      {/* ── Tab 4: RPT & Fund Use Risk ──────────────────────────────────── */}
      {tab === "RPT & Fund Use Risk" && (
        <div className="space-y-4">
          <GlassPanel className="p-5 flex flex-wrap items-center gap-6">
            <ScoreDonut score={s?.rptScore ?? 0} label={tr("in.rptRiskLabel")} />
            <div>
              <div className="text-sm font-semibold text-slate-800">
                {tr("in.rptRiskColon")} {rptBand(s?.rptScore ?? 0)} <span className="text-slate-400 font-normal">{tr("in.rptBands")}</span>
              </div>
              <p className="text-sm text-slate-600 mt-1 max-w-2xl">
                {rpt.length
                  ? tr("in.rptDetected", { n: rpt.length })
                  : tr("in.rptNone")}
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
                <div className="bg-slate-50 rounded-lg px-3 py-2"><span className="text-slate-500">{tr("in.amount")}</span> <span className="font-medium">{r.amountCr ? `₹${r.amountCr} Cr` : tr("in.notExtracted")}</span> <span className="text-slate-400">({r.pctOfBase})</span></div>
                <div className="bg-slate-50 rounded-lg px-3 py-2"><span className="text-slate-500">{tr("in.whyFlagged")}</span> <span className="text-slate-700">{r.reason}</span></div>
              </div>
              <div className="grid md:grid-cols-2 gap-3 text-[13px]">
                <div className="bg-blue-50 rounded-lg px-3 py-2"><span className="font-medium text-blue-800">{tr("in.suggestedDisclosure")}</span> <span className="text-blue-900">{r.suggestedDisclosure}</span></div>
                <div className="bg-amber-50 rounded-lg px-3 py-2"><span className="font-medium text-amber-800">{tr("in.requiredEvidence")}</span> <span className="text-amber-900">{r.requiredEvidence}</span></div>
              </div>
            </GlassPanel>
          ))}

          <GlassPanel className="p-5">
            <h3 className="text-sm font-semibold text-slate-800 mb-2">{tr("in.fundUseWarnings")}</h3>
            {objects.length === 0 ? (
              <p className="text-sm text-slate-400">{tr("in.noObjectsPlan")}</p>
            ) : fundUseWarnings.length === 0 ? (
              <p className="text-sm text-emerald-700">{tr("in.noFundWarnings")}</p>
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

      {/* ── Tab 6: Likely Reviewer Questions ────────────────────────────── */}
      {tab === "Likely Reviewer Questions" && (
        <div className="space-y-3">
          <p className="text-xs text-slate-500">
            {tr("in.questionsIntro")}
          </p>
          {observations.length === 0 && <GlassPanel className="p-8 text-center text-sm text-slate-400">{tr("in.noQuestions")}</GlassPanel>}
          {observations.map((o, i) => (
            <GlassPanel key={o.id} className="p-5">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="w-6 h-6 rounded-full bg-slate-800 text-white text-xs flex items-center justify-center font-semibold shrink-0">{i + 1}</span>
                <h3 className="text-sm font-semibold text-slate-800">{o.observation}</h3>
                <SeverityBadge severity={o.severity} />
                <span className="text-xs text-slate-400">· {o.affectedSection}</span>
              </div>
              <div className="grid md:grid-cols-3 gap-3 text-[13px]">
                <div className="bg-slate-50 rounded-lg px-3 py-2"><div className="text-xs font-medium text-slate-500 mb-0.5">{tr("in.whyAsked")}</div>{o.whyItMayBeAsked}</div>
                <div className="bg-blue-50 rounded-lg px-3 py-2"><div className="text-xs font-medium text-blue-700 mb-0.5">{tr("in.suggestedResponse")}</div>{o.suggestedResponse}</div>
                <div className="bg-amber-50 rounded-lg px-3 py-2"><div className="text-xs font-medium text-amber-700 mb-0.5">{tr("in.requiredEvidenceH")}</div>{o.requiredEvidence}</div>
              </div>
            </GlassPanel>
          ))}
        </div>
      )}

      {/* rule detail table lives under Overview for completeness */}
      {tab === "Overview" && (
        <details className="mt-5">
          <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-700">{tr("in.showRules", { n: analysis.checks.length })}</summary>
          <GlassPanel className="mt-3 overflow-hidden">
            <table className="w-full text-[13px]">
              <tbody>
                {analysis.checks.map((c) => (
                  <tr key={c.id} className="border-t border-slate-100 align-top">
                    <td className="px-4 py-2 w-40 text-xs text-slate-400">{c.category}</td>
                    <td className="px-2 py-2 w-56 font-medium text-slate-700">{c.ruleName}</td>
                    <td className="px-2 py-2 w-24"><CheckStatusBadge status={c.status} /></td>
                    <td className="px-2 py-2 text-slate-600">{c.explanation}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </GlassPanel>
        </details>
      )}

      {/* progress hint */}
      <div className="mt-6 text-right">
        <a href="/draft" className="text-sm text-blue-600 hover:underline">{tr("in.nextDraft")}</a>
      </div>
      <div className="mt-2"><ProgressBar value={avgCoverage} tone="blue" /></div>
    </div>

      <SectionPopup section={activeSection} onClose={() => setActiveSection(null)} />
    </HeroBackdrop>
  );
}

/* ── iOS-style section detail popup ──────────────────────────────────────── */
function SectionPopup({ section, onClose }: { section: CoverageRow | null; onClose: () => void }) {
  const tr = useT();
  const [showWhy, setShowWhy] = useState(false);

  useEffect(() => {
    if (!section) return;
    setShowWhy(false); // reset the "why" panel each time a new section opens
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [section, onClose]);

  if (!section) return null;
  const accent = riskAccent[section.riskLevel] ?? riskAccent["Missing Data"];
  const pct = Math.max(0, Math.min(100, section.completionPct));
  const R = 34, C = 2 * Math.PI * R;

  return (
    <div onClick={onClose}
      className="siim-ios-backdrop fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md"
      role="dialog" aria-modal="true" aria-label={`${section.sectionName} coverage detail`}>
      <div onClick={(e) => e.stopPropagation()}
        className="siim-ios-card w-full max-w-[660px] rounded-[36px] bg-white/85 backdrop-blur-2xl shadow-2xl shadow-slate-900/25 ring-1 ring-white/60 overflow-hidden">
        <div className="px-9 pt-9 pb-7">
          {/* header: score ring beside the section identity */}
          <div className="flex items-center gap-6">
            <div className="relative shrink-0 w-28 h-28">
              <svg viewBox="0 0 88 88" className="w-full h-full -rotate-90">
                <circle cx="44" cy="44" r={R} fill="none" stroke="#e2e8f0" strokeWidth="7" />
                <circle cx="44" cy="44" r={R} fill="none" stroke={accent.ring} strokeWidth="7" strokeLinecap="round"
                  strokeDasharray={C} strokeDashoffset={C - (pct / 100) * C}
                  style={{ transition: "stroke-dashoffset 0.5s cubic-bezier(0.2,0.8,0.2,1)" }} />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-3xl font-bold leading-none ${accent.text}`}>{pct}</span>
                <span className="text-[11px] font-medium text-slate-400 mt-1">/ 100</span>
              </div>
            </div>
            <div className="min-w-0">
              <span className={`inline-block px-3 py-1 rounded-full text-[13px] font-semibold ${accent.chip}`}>{tr(accentLabelKey[section.riskLevel] ?? "in.accentMissing")}</span>
              <h3 className="mt-2 text-[22px] font-semibold text-slate-800 leading-snug">{section.sectionName}</h3>
              {section.parentSection && (
                <p className="text-[14px] text-slate-400 mt-1 truncate">{section.parentSection}</p>
              )}
            </div>
          </div>

          {/* what the metric is (one-liner) */}
          <p className="mt-6 text-[16px] leading-relaxed text-slate-500">{tr("in.coverageWhat")}</p>

          {/* why it's calculated — revealed on Show more */}
          <button type="button" onClick={() => setShowWhy((v) => !v)}
            className="mt-3 inline-flex items-center gap-1.5 text-[15px] font-semibold text-blue-600 hover:text-blue-700">
            {showWhy ? tr("in.showLess") : tr("in.showMore")}
            <ChevronDown size={17} className={`transition-transform ${showWhy ? "rotate-180" : ""}`} />
          </button>
          {showWhy && (
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-slate-100/70 px-5 py-4">
                <p className="text-[12px] font-semibold uppercase tracking-wide text-slate-400 mb-1.5">{tr("in.whyCalculate")}</p>
                <p className="text-[15px] leading-relaxed text-slate-600">{tr("in.coverageWhy")}</p>
              </div>
              <div className="rounded-2xl bg-slate-100/70 px-5 py-4">
                <p className={`text-[12px] font-semibold uppercase tracking-wide mb-1.5 ${accent.text}`}>{tr("in.forThisSection")}</p>
                <p className="text-[15px] leading-relaxed text-slate-600">{tr(riskExplainKey[section.riskLevel] ?? "in.riskMissing")}</p>
              </div>
            </div>
          )}
        </div>

        {/* iOS-style hairline + action button */}
        <button type="button" onClick={onClose}
          className="w-full border-t border-slate-200/80 py-5 text-[18px] font-semibold text-blue-600 active:bg-slate-100/70 transition-colors">
          {tr("in.done")}
        </button>
      </div>
    </div>
  );
}
