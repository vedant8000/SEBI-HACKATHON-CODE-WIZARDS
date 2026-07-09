import { getContext } from "@/lib/server/context";
import { Badge, Card, EmptyState, PageHeader, ProgressBar } from "@/components/shared/ui";

export const dynamic = "force-dynamic";

const riskTone: Record<string, string> = {
  Ready: "bg-emerald-50 border-emerald-300",
  "Needs Clarification": "bg-amber-50 border-amber-300",
  "Critical Issue": "bg-red-50 border-red-300",
  "Missing Data": "bg-slate-100 border-slate-300",
};
const riskBadge: Record<string, "green" | "yellow" | "red" | "grey"> = {
  Ready: "green", "Needs Clarification": "yellow", "Critical Issue": "red", "Missing Data": "grey",
};

export default function HeatmapPage() {
  const { company, coverage } = getContext();
  if (!company || !coverage.length) {
    return (
      <>
        <PageHeader title="Compliance Heatmap" />
        <EmptyState title="No data yet" message="The heatmap is computed live from the coverage matrix — upload documents and it fills in." showOnboardCta={!company} />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Compliance Heatmap"
        subtitle="Every prospectus section coloured by risk — computed live from your extracted facts, document coverage and open gaps. Nothing here is pre-set."
      />
      <div className="flex gap-3 mb-4 text-xs text-slate-500 flex-wrap">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-200 border border-emerald-400" /> Ready</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-200 border border-amber-400" /> Needs clarification</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-200 border border-red-400" /> Critical issue</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-slate-200 border border-slate-400" /> Missing data</span>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {coverage.map((h) => (
          <Card key={h.sectionId} className={`p-4 border ${riskTone[h.riskLevel]}`}>
            <div className="flex items-start justify-between gap-2 mb-2">
              <h3 className="text-[13px] font-semibold text-slate-800 leading-snug">{h.sectionName}</h3>
              <Badge tone={riskBadge[h.riskLevel]}>{h.riskLevel}</Badge>
            </div>
            <div className="flex items-center gap-2 mb-2">
              <ProgressBar value={h.completionPct} />
              <span className="text-xs font-medium text-slate-600 w-9 text-right">{h.completionPct}%</span>
            </div>
            <div className="text-[11px] text-slate-500 space-y-1">
              <div>{h.parentSection} · fact confidence {h.avgConfidence || "—"}%</div>
              {h.sourceDocs.length > 0 && <div>📎 {h.sourceDocs.slice(0, 2).join(", ")}{h.sourceDocs.length > 2 ? ` +${h.sourceDocs.length - 2}` : ""}</div>}
              {h.missingFacts.length > 0 && <div className="text-amber-700">Missing: {h.missingFacts.slice(0, 2).join("; ")}{h.missingFacts.length > 2 ? ` +${h.missingFacts.length - 2}` : ""}</div>}
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}
