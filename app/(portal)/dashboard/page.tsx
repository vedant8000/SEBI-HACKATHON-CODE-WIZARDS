import Link from "next/link";
import { getContext } from "@/lib/server/context";
import { Card, EmptyState, PageHeader, ScoreDonut, SeverityBadge, StatCard } from "@/components/shared/ui";
import { FinTrendChart, CategoryScoreChart } from "@/components/charts/charts";
import { rptBand } from "@/lib/rules/scoring-config";

export const dynamic = "force-dynamic";

export default function Dashboard() {
  const { company, docs, draft, analysis, facts, conflicts, coverage } = getContext();

  if (!company) {
    return (
      <>
        <PageHeader title="Dashboard" subtitle="Your IPO preparation cockpit." />
        <EmptyState
          title="Welcome to SIIM"
          message="Create your company profile and upload your documents to get a readiness score, gap report and a source-linked draft offer document. Or load the demo company to see the full journey."
        />
      </>
    );
  }

  const s = analysis?.scores;
  const criticalGaps = analysis?.gaps.filter((g) => g.severity === "Critical" && g.status !== "Resolved") ?? [];
  const highGaps = analysis?.gaps.filter((g) => g.severity === "High" && g.status !== "Resolved") ?? [];
  const approved = draft.filter((d) => d.status === "Approved").length;
  const finData = company.financials.map((f) => ({ fy: f.fy, Revenue: f.revenueCr, PAT: f.patCr }));
  const catData = Object.entries(s?.byCategory ?? {}).map(([category, score]) => ({ category, score }));

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle={`${company.name} · ${company.industry}${company.city ? ` · ${company.city}, ${company.state}` : ""} · Proposed issue ${company.issueSizeCr ? `₹${company.issueSizeCr} Cr` : "—"} on ${company.proposedListingExchange}`}
      />

      {!analysis && (
        <Card className="p-4 mb-6 border-amber-300 bg-amber-50">
          <p className="text-sm text-amber-800">
            Analysis hasn&apos;t run yet. Upload documents in the <Link href="/data-room" className="underline font-medium">Data Room</Link> or
            click <strong>Re-run Analysis</strong> in the top bar.
          </p>
        </Card>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-4 flex items-center gap-4 col-span-2">
          <ScoreDonut score={s?.overall ?? 0} />
          <div>
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">IPO Readiness Score</div>
            <div className="text-sm text-slate-700 mt-1 max-w-[220px]">{s?.statusLine ?? "Run the analysis to compute your score."}</div>
            <Link href="/readiness" className="text-xs text-blue-600 hover:underline mt-1 inline-block">View rule-by-rule results →</Link>
          </div>
        </Card>
        <StatCard label="Draft Coverage" value={`${coverage.length ? Math.round(coverage.reduce((x, c) => x + c.completionPct, 0) / coverage.length) : 0}%`} sub={`${draft.length} sections generated · ${approved} approved`} />
        <StatCard label="Documents & Facts" value={docs.length} sub={`${facts.length} facts extracted · ${facts.filter((f) => f.status === "NEEDS_REVIEW").length} need review`} />
        <StatCard label="Fact Conflicts" value={conflicts.filter((c) => c.status === "OPEN").length} tone={conflicts.some((c) => c.status === "OPEN") ? "bad" : "good"} sub="Same fact, different values across documents" />
        <StatCard label="Critical Gaps" value={criticalGaps.length} tone={criticalGaps.length ? "bad" : "good"} sub={`${highGaps.length} high-priority items`} />
        <StatCard label="RPT Risk" value={s ? `${s.rptScore}/100` : "—"} tone={s && s.rptScore > 60 ? "bad" : s && s.rptScore > 30 ? "warn" : "good"} sub={s ? `${rptBand(s.rptScore)} risk band` : "Not computed"} />
        <StatCard label="Financial Consistency" value={s ? `${s.finConsistencyScore}/100` : "—"} tone={s && s.finConsistencyScore < 60 ? "bad" : s && s.finConsistencyScore < 85 ? "warn" : "good"} sub={`${analysis?.financialChecks.length ?? 0} cross-checks run`} />
        <StatCard label="MB Review" value={`${approved}/${draft.length || "—"}`} sub="Sections approved by merchant banker" />
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mb-6">
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-slate-800 mb-1">Financial Track Record</h3>
          <p className="text-xs text-slate-500 mb-3">Revenue & PAT (₹ crore) from your profile and uploaded statements</p>
          {finData.some((f) => f.Revenue != null)
            ? <FinTrendChart data={finData} />
            : <p className="text-sm text-slate-400 py-10 text-center">No financial data yet — add it in Company Profile or upload audited statements.</p>}
        </Card>
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-slate-800 mb-1">Readiness by Category</h3>
          <p className="text-xs text-slate-500 mb-3">Weighted: Eligibility 30% · Disclosure 25% · Financial 20% · Governance 15% · Documents 10%</p>
          {catData.length
            ? <CategoryScoreChart data={catData} />
            : <p className="text-sm text-slate-400 py-10 text-center">Run the analysis to see category scores.</p>}
        </Card>
      </div>

      <Card className="p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-800">Top Blockers & Next Actions</h3>
          <Link href="/gap-report" className="text-xs text-blue-600 hover:underline">Full gap report →</Link>
        </div>
        {criticalGaps.length + highGaps.length === 0 ? (
          <p className="text-sm text-slate-400">No critical or high-priority gaps open. Send sections for merchant banker review.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {[...criticalGaps, ...highGaps].slice(0, 6).map((g) => (
              <li key={g.id} className="py-2.5 flex items-start gap-3">
                <SeverityBadge severity={g.severity} />
                <div className="min-w-0">
                  <div className="text-sm font-medium text-slate-800">{g.title}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{g.suggestedFix} · Owner: {g.owner}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
