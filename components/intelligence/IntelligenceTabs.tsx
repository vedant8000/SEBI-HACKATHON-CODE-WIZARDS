"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { RefreshCw } from "lucide-react";
import type {
  AnalysisResult, CoverageRow, FactConflict, FinancialYear, ObjectOfIssue,
} from "@/lib/types";
import {
  Badge, CheckStatusBadge, GlassPanel, GlassStat, HeroBackdrop, ProgressBar, ScoreDonut, SeverityBadge,
} from "@/components/shared/ui";
import { CategoryScoreChart } from "@/components/charts/charts";
import ObjectsForm from "@/components/objects/ObjectsForm";
import { rptBand } from "@/lib/rules/scoring-config";
import type { PeerBenchmark } from "@/lib/engine/peers";

const TABS = [
  "Overview", "Disclosure Integrity", "SME Framework", "Missing Data", "Inconsistencies",
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
  "Needs Clarification": "Some facts are missing or low-confidence — review before drafting.",
  "Critical Issue": "Key facts are missing or conflicting, blocking a reliable draft here.",
  "Missing Data": "No extracted facts yet — upload supporting documents for this section.",
};

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
  const obligations = analysis?.complianceObligations ?? [];
  const obAttention = obligations.filter((o) => o.status === "Attention").length;
  const integrity = analysis?.integrity ?? null;
  const integritySignals = integrity?.signals ?? [];
  const integrityFlags = integritySignals.filter((x) => x.status === "flag").length;
  const avgCoverage = coverage.length ? Math.round(coverage.reduce((x, c) => x + c.completionPct, 0) / coverage.length) : 0;

  // fund-use warnings derived from the saved objects plan
  const objectsTotal = objects.reduce((x, o) => x + o.amountCr, 0);
  const fundUseWarnings: string[] = [];
  for (const o of objects) if (o.warning) fundUseWarnings.push(`${o.category}: ${o.warning}`);
  if (freshIssueCr != null && objects.length && Math.abs(objectsTotal - freshIssueCr) > 0.01)
    fundUseWarnings.push(`Objects total ₹${objectsTotal.toFixed(1)} Cr does not match the fresh issue of ₹${freshIssueCr} Cr.`);
  const gcp = objects.filter((o) => /general corporate/i.test(o.category)).reduce((x, o) => x + o.amountCr, 0);
  if (objectsTotal > 0 && gcp / objectsTotal > 0.25)
    fundUseWarnings.push(`General corporate purposes is ${Math.round((gcp / objectsTotal) * 100)}% of the plan — above the typical 25% ceiling.`);

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
      <div className="flex flex-wrap items-center gap-1.5 mb-5 border-b border-white/60 pb-3">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-3.5 py-1.5 text-[13px] font-medium rounded-full transition-all ${tab === t ? "bg-gradient-to-r from-blue-600 to-sky-500 text-white shadow-sm shadow-blue-600/30" : "text-slate-600 hover:bg-white/60"}`}>
            {t}
            {t === "Disclosure Integrity" && integrityFlags > 0 && <span className="ml-1.5 text-[10px] bg-white/20 px-1.5 rounded-full">{integrityFlags}</span>}
            {t === "SME Framework" && obAttention > 0 && <span className="ml-1.5 text-[10px] bg-white/20 px-1.5 rounded-full">{obAttention}</span>}
            {t === "Missing Data" && gaps.length > 0 && <span className="ml-1.5 text-[10px] bg-white/20 px-1.5 rounded-full">{gaps.length}</span>}
            {t === "Inconsistencies" && (finIssues.length + openConflicts.length) > 0 && <span className="ml-1.5 text-[10px] bg-white/20 px-1.5 rounded-full">{finIssues.length + openConflicts.length}</span>}
            {t === "Exchange Observations" && observations.length > 0 && <span className="ml-1.5 text-[10px] bg-white/20 px-1.5 rounded-full">{observations.length}</span>}
          </button>
        ))}
        <button onClick={rerun} disabled={running}
          className="ml-auto px-3 py-1.5 text-xs font-medium border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 inline-flex items-center gap-1.5">
          <RefreshCw size={12} className={running ? "animate-spin" : ""} /> Re-run
        </button>
      </div>

      {/* ── Tab 1: Overview ─────────────────────────────────────────────── */}
      {tab === "Overview" && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <GlassPanel className="p-4 flex items-center gap-4 col-span-2">
              <ScoreDonut score={s?.overall ?? 0} />
              <div>
                <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">IPO Readiness Score</div>
                <div className="text-sm text-slate-700 mt-1 max-w-[240px]">{s?.statusLine}</div>
              </div>
            </GlassPanel>
            <GlassStat label="Draft Coverage" value={`${avgCoverage}%`} sub={`${coverage.filter((c) => c.canGenerate === "YES").length} of ${coverage.length} sections fully generatable`} />
            <GlassStat label="Critical Gaps" value={gaps.filter((g) => g.severity === "Critical").length} tone={gaps.some((g) => g.severity === "Critical") ? "bad" : "good"} sub={`${gaps.filter((g) => g.severity === "High").length} high-priority items`} />
            <GlassStat label="Fact Conflicts" value={openConflicts.length} tone={openConflicts.length ? "bad" : "good"} sub="Same fact, different values across documents" />
            <GlassStat label="RPT Risk" value={`${s?.rptScore ?? 0}/100`} tone={s && s.rptScore > 60 ? "bad" : s && s.rptScore > 30 ? "warn" : "good"} sub={`${rptBand(s?.rptScore ?? 0)} band`} />
            <GlassStat label="Financial Consistency" value={`${s?.finConsistencyScore ?? 0}/100`} tone={s && s.finConsistencyScore < 60 ? "bad" : s && s.finConsistencyScore < 85 ? "warn" : "good"} sub={`${finChecks.length} cross-checks run`} />
            {integrity ? (
              <GlassStat label="Disclosure Integrity" value={`${integrity.score}/100`} tone={integrity.score < 50 ? "bad" : integrity.score < 70 ? "warn" : "good"} sub={`${integrity.band} · ${integrityFlags} to address`} />
            ) : (
              <GlassStat label="Reviewer Questions" value={observations.length} sub="Simulated exchange/MB queries" />
            )}
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            <GlassPanel className="p-5">
              <h3 className="text-sm font-semibold text-slate-800 mb-1">Readiness by Category</h3>
              <p className="text-xs text-slate-500 mb-2">Eligibility 30% · Disclosure 25% · Financial 20% · Governance 15% · Documents 10%</p>
              <CategoryScoreChart data={Object.entries(s?.byCategory ?? {}).map(([category, score]) => ({ category, score }))} />
            </GlassPanel>
            <GlassPanel className="p-5">
              <h3 className="text-sm font-semibold text-slate-800 mb-1">Section Coverage Heatmap</h3>
              <p className="text-xs text-slate-500 mb-3">All {coverage.length} prospectus sections — hover for names</p>
              <div className="flex flex-wrap gap-1.5">
                {coverage.map((c) => (
                  <div key={c.sectionId} title={`${c.sectionName} — ${c.completionPct}% (${c.riskLevel})\n${riskExplain[c.riskLevel]}`}
                    className={`w-9 h-9 rounded border flex items-center justify-center text-[9px] font-semibold text-slate-700 transition-transform hover:scale-110 hover:shadow-md cursor-default ${riskTone[c.riskLevel]}`}>
                    {c.completionPct}
                  </div>
                ))}
              </div>
              <div className="flex gap-3 mt-3 text-[11px] text-slate-500 flex-wrap">
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-emerald-100 border border-emerald-300" />Ready</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-amber-100 border border-amber-300" />Needs clarification</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-red-100 border border-red-300" />Critical</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-slate-200 border border-slate-300" />Missing data</span>
              </div>
            </GlassPanel>
          </div>

          <GlassPanel className="p-5">
            <h3 className="text-sm font-semibold text-slate-800 mb-3">Top 5 Blockers</h3>
            {sortedGaps.length === 0 ? (
              <p className="text-sm text-slate-400">No open blockers.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {sortedGaps.slice(0, 5).map((g) => (
                  <li key={g.id} className="py-2.5 flex items-start gap-3">
                    <SeverityBadge severity={g.severity} />
                    <div>
                      <div className="text-sm font-medium text-slate-800">{g.title}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{g.suggestedFix} · Owner: {g.owner}</div>
                    </div>
                  </li>
                ))}
              </ul>
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
              legal advice — your merchant banker and legal counsel confirm final compliance.
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

      {/* ── Tab 2: Missing Data ─────────────────────────────────────────── */}
      {tab === "Missing Data" && (
        <div className="space-y-3">
          {sortedGaps.length === 0 && <GlassPanel className="p-8 text-center text-sm text-slate-400">No missing data or open gaps.</GlassPanel>}
          {sortedGaps.map((g) => (
            <GlassPanel key={g.id} className="p-5">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <SeverityBadge severity={g.severity} />
                <h3 className="text-sm font-semibold text-slate-800">{g.title}</h3>
                <span className="text-xs text-slate-400">· {g.affectedSection}</span>
                <span className="ml-auto flex items-center gap-2">
                  <Badge tone="blue">Owner: {g.owner}</Badge>
                  <Badge tone={g.status === "In Progress" ? "yellow" : "grey"}>{g.status}</Badge>
                </span>
              </div>
              <p className="text-sm text-slate-600">{g.explanation}</p>
              <div className="grid md:grid-cols-2 gap-3 mt-3 text-[13px]">
                <div className="bg-slate-50 rounded-lg px-3 py-2"><span className="font-medium text-slate-700">Missing fact/document:</span> <span className="text-slate-600">{g.requiredDocument}</span></div>
                <div className="bg-blue-50 rounded-lg px-3 py-2"><span className="font-medium text-blue-800">Suggested fix:</span> <span className="text-blue-900">{g.suggestedFix}</span></div>
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
              <h3 className="text-sm font-semibold text-red-800 mb-2">Fact conflicts across documents</h3>
              <ul className="space-y-1.5 text-[13px] text-red-900">
                {openConflicts.map((c) => (
                  <li key={c.id}>⚠ <strong>{c.factKey}</strong>: {c.valueA} ({c.sourceA}) vs {c.valueB} ({c.sourceB})</li>
                ))}
              </ul>
            </GlassPanel>
          )}
          {finChecks.length === 0 && openConflicts.length === 0 && (
            <GlassPanel className="p-8 text-center text-sm text-slate-400">
              No cross-document inconsistencies detected. Upload audited financials AND GST returns (plus the RPT register and quotations) so numbers can be compared across sources.
            </GlassPanel>
          )}
          {finChecks.map((c) => (
            <GlassPanel key={c.id} className="p-5">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <SeverityBadge severity={c.severity} />
                <h3 className="text-sm font-semibold text-slate-800">{c.checkName}</h3>
              </div>
              <div className="grid md:grid-cols-3 gap-3 text-[13px] mb-2">
                <div className="bg-slate-50 rounded-lg px-3 py-2"><div className="text-slate-400 text-xs">Expected</div><div className="font-medium text-slate-700">{c.expectedValue}</div></div>
                <div className="bg-slate-50 rounded-lg px-3 py-2"><div className="text-slate-400 text-xs">Found</div><div className="font-medium text-slate-700">{c.foundValue}</div></div>
                <div className={`rounded-lg px-3 py-2 ${c.severity === "Low" ? "bg-emerald-50" : "bg-red-50"}`}><div className="text-slate-400 text-xs">Difference</div><div className={`font-medium ${c.severity === "Low" ? "text-emerald-700" : "text-red-700"}`}>{c.difference}</div></div>
              </div>
              <p className="text-sm text-slate-600">{c.explanation}</p>
              {c.suggestedFix !== "—" && <p className="text-[13px] text-blue-800 bg-blue-50 rounded-lg px-3 py-2 mt-2"><span className="font-medium">Suggested fix:</span> {c.suggestedFix}</p>}
            </GlassPanel>
          ))}
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
                  ? `${rpt.length} related-party signal(s) detected in your documents. Undisclosed, these are the costliest IPO mistake — disclose early, evidence thoroughly.`
                  : "No related-party signals detected in current uploads. If your business transacts with promoter-connected entities, upload the RPT register — non-detection is not clearance."}
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
              <p className="text-sm text-slate-400">No objects plan yet — build it in the &ldquo;Objects of Issue&rdquo; tab.</p>
            ) : fundUseWarnings.length === 0 ? (
              <p className="text-sm text-emerald-700">No fund-use warnings — objects reconcile with the fresh issue and carry evidence.</p>
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
              values — your merchant banker substitutes the actual peer set and pricing for the filing.
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
                <p className="mt-3 text-[11px] text-slate-400">Illustrative reference peers for benchmarking — not live market data and not a valuation opinion. The merchant banker finalises the peer set and issue price.</p>
              </GlassPanel>
            </>
          )}
        </div>
      )}

      {/* ── Tab: Exchange Observation Simulator ─────────────────────────── */}
      {tab === "Exchange Observations" && (
        <div className="space-y-3">
          <GlassPanel className="p-5 !bg-slate-900/[0.03] border-slate-300/70">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h3 className="text-sm font-semibold text-slate-800">Exchange Observation Simulator</h3>
              <Badge tone="blue">NSE Emerge / BSE SME lens</Badge>
            </div>
            <p className="text-xs text-slate-500 max-w-3xl">
              The clarifications an exchange reviewer is most likely to raise on your draft, predicted from your own
              gaps, RPT flags, financial inconsistencies and framework breaches — each with why it gets asked and the
              disclosure that pre-empts it. On NSE Emerge and BSE SME the <em>exchange</em> reviews the offer document,
              so answering these before filing is dramatically cheaper than a post-filing query round.
            </p>
            <div className="flex flex-wrap gap-2 mt-3 text-[11px] text-slate-500">
              <span>Predicted observations: <b className="text-slate-700">{observations.length}</b></span>
              <span>· Very likely: <b className="text-red-700">{observations.filter((o) => o.severity === "Critical").length}</b></span>
              <span>· Likely: <b className="text-amber-700">{observations.filter((o) => o.severity === "High").length}</b></span>
            </div>
          </GlassPanel>
          {observations.length === 0 && <GlassPanel className="p-8 text-center text-sm text-slate-400">No observations derived yet — upload more documents and re-run.</GlassPanel>}
          {observations.map((o, i) => (
            <GlassPanel key={o.id} className="p-5">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="w-6 h-6 rounded-full bg-slate-800 text-white text-xs flex items-center justify-center font-semibold shrink-0">{i + 1}</span>
                <h3 className="text-sm font-semibold text-slate-800">{o.observation}</h3>
                <span className={`inline-block px-2 py-0.5 text-[11px] font-medium rounded-full border ${likelihood[o.severity]?.cls}`}>{likelihood[o.severity]?.label}</span>
                <span className="text-xs text-slate-400">· {o.affectedSection}</span>
              </div>
              <div className="grid md:grid-cols-3 gap-3 text-[13px]">
                <div className="bg-slate-50 rounded-lg px-3 py-2"><div className="text-xs font-medium text-slate-500 mb-0.5">Why it may be asked</div>{o.whyItMayBeAsked}</div>
                <div className="bg-blue-50 rounded-lg px-3 py-2"><div className="text-xs font-medium text-blue-700 mb-0.5">Suggested response</div>{o.suggestedResponse}</div>
                <div className="bg-amber-50 rounded-lg px-3 py-2"><div className="text-xs font-medium text-amber-700 mb-0.5">Required evidence</div>{o.requiredEvidence}</div>
              </div>
            </GlassPanel>
          ))}
        </div>
      )}

      {/* rule detail table lives under Overview for completeness */}
      {tab === "Overview" && (
        <details className="mt-5">
          <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-700">Show rule-by-rule readiness results ({analysis.checks.length} rules)</summary>
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
        <a href="/draft" className="text-sm text-blue-600 hover:underline">Next: Generate the Draft Offer Document →</a>
      </div>
      <div className="mt-2"><ProgressBar value={avgCoverage} tone="blue" /></div>
    </div>
    </HeroBackdrop>
  );
}
