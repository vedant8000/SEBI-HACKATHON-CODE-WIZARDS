import { getContext } from "@/lib/server/context";
import { Card, CheckStatusBadge, EmptyState, PageHeader, ScoreDonut, SeverityBadge } from "@/components/shared/ui";
import { CategoryScoreChart } from "@/components/charts/charts";

export const dynamic = "force-dynamic";

export default function ReadinessPage() {
  const { company, analysis } = getContext();
  if (!company || !analysis) {
    return (
      <>
        <PageHeader title="IPO Readiness Scorecard" />
        <EmptyState title="No analysis yet" message="Create a company, upload documents, then run the analysis from the top bar — every rule below is computed from your actual data." showOnboardCta={!company} />
      </>
    );
  }
  const { checks, scores } = analysis;
  const categories = ["Eligibility", "Financial Health", "Disclosure Completeness", "Governance", "Document Quality"] as const;
  const blockers = checks.filter((c) => (c.status === "fail" || c.status === "missing") && (c.severity === "Critical" || c.severity === "High"));

  return (
    <>
      <PageHeader
        title="IPO Readiness Scorecard"
        subtitle="Weighted rule engine: Eligibility 30% · Disclosure Completeness 25% · Financial Health 20% · Governance 15% · Document Quality 10%. Pass = full score, warning = half, fail/missing = zero."
        actions={<a href="/api/export/readiness" target="_blank" className="px-3 py-1.5 text-xs font-medium border border-slate-300 rounded-lg hover:bg-slate-50">Export Readiness Report</a>}
      />

      <div className="grid lg:grid-cols-3 gap-4 mb-6">
        <Card className="p-5 flex items-center gap-5">
          <ScoreDonut score={scores.overall} size={130} />
          <div>
            <div className="text-sm font-semibold text-slate-800">Overall Readiness</div>
            <p className="text-sm text-slate-600 mt-1">{scores.statusLine}</p>
            <p className="text-xs text-slate-400 mt-2">Never interpreted as &ldquo;ready to file&rdquo; — the ceiling is &ldquo;ready for merchant banker review&rdquo;.</p>
          </div>
        </Card>
        <Card className="p-5 lg:col-span-2">
          <h3 className="text-sm font-semibold text-slate-800 mb-2">Category Scores</h3>
          <CategoryScoreChart data={Object.entries(scores.byCategory).map(([category, score]) => ({ category, score }))} />
        </Card>
      </div>

      {blockers.length > 0 && (
        <Card className="p-5 mb-6 border-red-200">
          <h3 className="text-sm font-semibold text-red-700 mb-3">Critical blockers ({blockers.length})</h3>
          <ul className="space-y-2">
            {blockers.map((b) => (
              <li key={b.id} className="flex items-start gap-2 text-sm">
                <SeverityBadge severity={b.severity} />
                <span><span className="font-medium text-slate-800">{b.ruleName}:</span> <span className="text-slate-600">{b.explanation}</span> <span className="text-blue-700">{b.suggestedFix !== "—" ? `→ ${b.suggestedFix}` : ""}</span></span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {categories.map((cat) => {
        const catChecks = checks.filter((c) => c.category === cat);
        if (!catChecks.length) return null;
        return (
          <Card key={cat} className="mb-4 overflow-hidden">
            <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-800">{cat}</h3>
              <span className="text-xs text-slate-500">{scores.byCategory[cat]}/100</span>
            </div>
            <table className="w-full text-sm">
              <tbody>
                {catChecks.map((c) => (
                  <tr key={c.id} className="border-t border-slate-100 align-top">
                    <td className="px-5 py-2.5 w-44 font-medium text-slate-700">{c.ruleName}</td>
                    <td className="px-2 py-2.5 w-28"><CheckStatusBadge status={c.status} /></td>
                    <td className="px-2 py-2.5 text-slate-600">{c.explanation}</td>
                    <td className="px-4 py-2.5 text-slate-500 w-72 text-xs">{c.suggestedFix !== "—" ? c.suggestedFix : ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        );
      })}
    </>
  );
}
