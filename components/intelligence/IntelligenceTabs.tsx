"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { RefreshCw } from "lucide-react";
import type {
  AnalysisResult, CoverageRow, FactConflict, FinancialYear, ObjectOfIssue,
} from "@/lib/types";
import {
  Badge, Card, CheckStatusBadge, ProgressBar, ScoreDonut, SeverityBadge, StatCard,
} from "@/components/shared/ui";
import { CategoryScoreChart } from "@/components/charts/charts";
import ObjectsForm from "@/components/objects/ObjectsForm";
import { rptBand } from "@/lib/rules/scoring-config";

const TABS = [
  "Overview", "Missing Data", "Inconsistencies", "RPT & Fund Use Risk",
  "Objects of Issue", "Likely Reviewer Questions",
] as const;

const riskTone: Record<string, string> = {
  Ready: "bg-emerald-100 border-emerald-300",
  "Needs Clarification": "bg-amber-100 border-amber-300",
  "Critical Issue": "bg-red-100 border-red-300",
  "Missing Data": "bg-slate-200 border-slate-300",
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
      <Card className="p-8 text-center">
        <p className="text-sm text-slate-500">The rule engine hasn&apos;t run yet.</p>
        <button onClick={rerun} disabled={running}
          className="mt-4 px-5 py-2 bg-blue-600 text-white text-sm rounded-lg disabled:opacity-50 inline-flex items-center gap-2">
          <RefreshCw size={14} className={running ? "animate-spin" : ""} /> Run IPO Intelligence
        </button>
      </Card>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-1.5 mb-5 border-b border-slate-200 pb-3">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-3.5 py-1.5 text-[13px] font-medium rounded-lg ${tab === t ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-100"}`}>
            {t}
            {t === "Missing Data" && gaps.length > 0 && <span className="ml-1.5 text-[10px] bg-white/20 px-1.5 rounded-full">{gaps.length}</span>}
            {t === "Inconsistencies" && (finIssues.length + openConflicts.length) > 0 && <span className="ml-1.5 text-[10px] bg-white/20 px-1.5 rounded-full">{finIssues.length + openConflicts.length}</span>}
            {t === "Likely Reviewer Questions" && observations.length > 0 && <span className="ml-1.5 text-[10px] bg-white/20 px-1.5 rounded-full">{observations.length}</span>}
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
            <Card className="p-4 flex items-center gap-4 col-span-2">
              <ScoreDonut score={s?.overall ?? 0} />
              <div>
                <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">IPO Readiness Score</div>
                <div className="text-sm text-slate-700 mt-1 max-w-[240px]">{s?.statusLine}</div>
              </div>
            </Card>
            <StatCard label="Draft Coverage" value={`${avgCoverage}%`} sub={`${coverage.filter((c) => c.canGenerate === "YES").length} of ${coverage.length} sections fully generatable`} />
            <StatCard label="Critical Gaps" value={gaps.filter((g) => g.severity === "Critical").length} tone={gaps.some((g) => g.severity === "Critical") ? "bad" : "good"} sub={`${gaps.filter((g) => g.severity === "High").length} high-priority items`} />
            <StatCard label="Fact Conflicts" value={openConflicts.length} tone={openConflicts.length ? "bad" : "good"} sub="Same fact, different values across documents" />
            <StatCard label="RPT Risk" value={`${s?.rptScore ?? 0}/100`} tone={s && s.rptScore > 60 ? "bad" : s && s.rptScore > 30 ? "warn" : "good"} sub={`${rptBand(s?.rptScore ?? 0)} band`} />
            <StatCard label="Financial Consistency" value={`${s?.finConsistencyScore ?? 0}/100`} tone={s && s.finConsistencyScore < 60 ? "bad" : s && s.finConsistencyScore < 85 ? "warn" : "good"} sub={`${finChecks.length} cross-checks run`} />
            <StatCard label="Reviewer Questions" value={observations.length} sub="Simulated exchange/MB queries" />
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            <Card className="p-5">
              <h3 className="text-sm font-semibold text-slate-800 mb-1">Readiness by Category</h3>
              <p className="text-xs text-slate-500 mb-2">Eligibility 30% · Disclosure 25% · Financial 20% · Governance 15% · Documents 10%</p>
              <CategoryScoreChart data={Object.entries(s?.byCategory ?? {}).map(([category, score]) => ({ category, score }))} />
            </Card>
            <Card className="p-5">
              <h3 className="text-sm font-semibold text-slate-800 mb-1">Section Coverage Heatmap</h3>
              <p className="text-xs text-slate-500 mb-3">All {coverage.length} prospectus sections — hover for names</p>
              <div className="flex flex-wrap gap-1.5">
                {coverage.map((c) => (
                  <div key={c.sectionId} title={`${c.sectionName} — ${c.completionPct}% (${c.riskLevel})`}
                    className={`w-9 h-9 rounded border flex items-center justify-center text-[9px] font-semibold text-slate-700 ${riskTone[c.riskLevel]}`}>
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
            </Card>
          </div>

          <Card className="p-5">
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
          </Card>
        </div>
      )}

      {/* ── Tab 2: Missing Data ─────────────────────────────────────────── */}
      {tab === "Missing Data" && (
        <div className="space-y-3">
          {sortedGaps.length === 0 && <Card className="p-8 text-center text-sm text-slate-400">No missing data or open gaps.</Card>}
          {sortedGaps.map((g) => (
            <Card key={g.id} className="p-5">
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
            </Card>
          ))}
        </div>
      )}

      {/* ── Tab 3: Inconsistencies ──────────────────────────────────────── */}
      {tab === "Inconsistencies" && (
        <div className="space-y-3">
          {openConflicts.length > 0 && (
            <Card className="p-4 border-red-200 bg-red-50">
              <h3 className="text-sm font-semibold text-red-800 mb-2">Fact conflicts across documents</h3>
              <ul className="space-y-1.5 text-[13px] text-red-900">
                {openConflicts.map((c) => (
                  <li key={c.id}>⚠ <strong>{c.factKey}</strong>: {c.valueA} ({c.sourceA}) vs {c.valueB} ({c.sourceB})</li>
                ))}
              </ul>
            </Card>
          )}
          {finChecks.length === 0 && openConflicts.length === 0 && (
            <Card className="p-8 text-center text-sm text-slate-400">
              No cross-document inconsistencies detected. Upload audited financials AND GST returns (plus the RPT register and quotations) so numbers can be compared across sources.
            </Card>
          )}
          {finChecks.map((c) => (
            <Card key={c.id} className="p-5">
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
            </Card>
          ))}
        </div>
      )}

      {/* ── Tab 4: RPT & Fund Use Risk ──────────────────────────────────── */}
      {tab === "RPT & Fund Use Risk" && (
        <div className="space-y-4">
          <Card className="p-5 flex flex-wrap items-center gap-6">
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
          </Card>

          {rpt.map((r) => (
            <Card key={r.id} className="p-5">
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
            </Card>
          ))}

          <Card className="p-5">
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
          </Card>
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
            Your gaps, RPT flags and inconsistencies, reframed as the questions a merchant banker or exchange reviewer
            would ask. Answering these now is dramatically cheaper than answering them after filing.
          </p>
          {observations.length === 0 && <Card className="p-8 text-center text-sm text-slate-400">No likely questions derived yet — upload more documents and re-run.</Card>}
          {observations.map((o, i) => (
            <Card key={o.id} className="p-5">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="w-6 h-6 rounded-full bg-slate-800 text-white text-xs flex items-center justify-center font-semibold shrink-0">{i + 1}</span>
                <h3 className="text-sm font-semibold text-slate-800">{o.observation}</h3>
                <SeverityBadge severity={o.severity} />
                <span className="text-xs text-slate-400">· {o.affectedSection}</span>
              </div>
              <div className="grid md:grid-cols-3 gap-3 text-[13px]">
                <div className="bg-slate-50 rounded-lg px-3 py-2"><div className="text-xs font-medium text-slate-500 mb-0.5">Why it may be asked</div>{o.whyItMayBeAsked}</div>
                <div className="bg-blue-50 rounded-lg px-3 py-2"><div className="text-xs font-medium text-blue-700 mb-0.5">Suggested response</div>{o.suggestedResponse}</div>
                <div className="bg-amber-50 rounded-lg px-3 py-2"><div className="text-xs font-medium text-amber-700 mb-0.5">Required evidence</div>{o.requiredEvidence}</div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* rule detail table lives under Overview for completeness */}
      {tab === "Overview" && (
        <details className="mt-5">
          <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-700">Show rule-by-rule readiness results ({analysis.checks.length} rules)</summary>
          <Card className="mt-3 overflow-hidden">
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
          </Card>
        </details>
      )}

      {/* progress hint */}
      <div className="mt-6 text-right">
        <a href="/draft" className="text-sm text-blue-600 hover:underline">Next: Generate the Draft Offer Document →</a>
      </div>
      <div className="mt-2"><ProgressBar value={avgCoverage} tone="blue" /></div>
    </div>
  );
}
