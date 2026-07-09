import { getContext } from "@/lib/server/context";
import { Card, EmptyState, PageHeader, SeverityBadge, Badge } from "@/components/shared/ui";

export const dynamic = "force-dynamic";

export default function GapReportPage() {
  const { company, analysis } = getContext();
  if (!company || !analysis) {
    return (
      <>
        <PageHeader title="Gap Report" />
        <EmptyState title="No analysis yet" message="Gaps are detected by comparing your uploads and profile against what an SME offer document requires. Run the analysis to see them." showOnboardCta={!company} />
      </>
    );
  }
  const order = { Critical: 0, High: 1, Medium: 2, Low: 3 } as const;
  const gaps = [...analysis.gaps].sort((a, b) => order[a.severity] - order[b.severity]);
  const counts = { Critical: 0, High: 0, Medium: 0, Low: 0 } as Record<string, number>;
  gaps.forEach((g) => counts[g.severity]++);

  return (
    <>
      <PageHeader
        title="Gap Report"
        subtitle="Every gap says what's missing, why it matters, who should fix it, and how — in plain language. Fixing these before the merchant banker sees them is where most of the time saving comes from."
        actions={<a href="/api/export/gap-report" className="px-3 py-1.5 text-xs font-medium border border-slate-300 rounded-lg hover:bg-slate-50">Export CSV</a>}
      />
      <div className="flex gap-2 mb-5 flex-wrap">
        {Object.entries(counts).map(([sev, n]) => (
          <span key={sev} className="text-xs"><SeverityBadge severity={sev} /> <span className="text-slate-600 font-medium">{n}</span></span>
        ))}
      </div>
      <div className="space-y-3">
        {gaps.map((g) => (
          <Card key={g.id} className="p-5">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <SeverityBadge severity={g.severity} />
              <h3 className="text-sm font-semibold text-slate-800">{g.title}</h3>
              <span className="text-xs text-slate-400">· {g.affectedSection}</span>
              <span className="ml-auto flex items-center gap-2">
                <Badge tone="blue">Owner: {g.owner}</Badge>
                <Badge tone={g.status === "Resolved" ? "green" : g.status === "In Progress" ? "yellow" : "grey"}>{g.status}</Badge>
              </span>
            </div>
            <p className="text-sm text-slate-600">{g.explanation}</p>
            <div className="grid md:grid-cols-2 gap-3 mt-3 text-[13px]">
              <div className="bg-slate-50 rounded-lg px-3 py-2">
                <span className="font-medium text-slate-700">Required document/data:</span>{" "}
                <span className="text-slate-600">{g.requiredDocument}</span>
              </div>
              <div className="bg-blue-50 rounded-lg px-3 py-2">
                <span className="font-medium text-blue-800">Suggested fix:</span>{" "}
                <span className="text-blue-900">{g.suggestedFix}</span>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}
