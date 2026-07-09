import { getContext } from "@/lib/server/context";
import { Card, EmptyState, PageHeader, SeverityBadge, StatCard } from "@/components/shared/ui";

export const dynamic = "force-dynamic";

export default function FinancialChecksPage() {
  const { company, analysis } = getContext();
  if (!company || !analysis) {
    return (
      <>
        <PageHeader title="Financial Consistency Checker" />
        <EmptyState title="No analysis yet" message="This module cross-checks numbers ACROSS your documents — audited revenue vs GST turnover, receivables vs revenue growth, interest vs borrowings, PAT vs reserves. Run the analysis to see results." showOnboardCta={!company} />
      </>
    );
  }
  const checks = analysis.financialChecks;
  const score = analysis.scores.finConsistencyScore;

  return (
    <>
      <PageHeader
        title="Financial Consistency Checker"
        subtitle="Numbers that don't reconcile across documents are the fastest way to lose reviewer trust. Each check shows the expected value, what we found, and how to fix the difference."
      />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <StatCard label="Consistency Score" value={`${score}/100`} tone={score < 60 ? "bad" : score < 85 ? "warn" : "good"} />
        <StatCard label="Checks Run" value={checks.length} />
        <StatCard label="High Severity" value={checks.filter((c) => c.severity === "High").length} tone={checks.some((c) => c.severity === "High") ? "bad" : "good"} />
        <StatCard label="Medium Severity" value={checks.filter((c) => c.severity === "Medium").length} tone={checks.some((c) => c.severity === "Medium") ? "warn" : "good"} />
      </div>

      {checks.length === 0 ? (
        <Card className="p-8 text-center text-sm text-slate-400">
          Not enough overlapping data to cross-check yet. Upload audited financials AND GST returns (plus quotations and the RPT register) so numbers can be compared across sources.
        </Card>
      ) : (
        checks.map((c) => (
          <Card key={c.id} className="p-5 mb-3">
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
        ))
      )}
    </>
  );
}
