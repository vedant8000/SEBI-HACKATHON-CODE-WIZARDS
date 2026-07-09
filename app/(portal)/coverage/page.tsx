import { getContext } from "@/lib/server/context";
import { Badge, Card, EmptyState, PageHeader, ProgressBar, StatCard } from "@/components/shared/ui";
import { coverageSummary } from "@/lib/engine/coverage";

export const dynamic = "force-dynamic";

const genTone: Record<string, "green" | "yellow" | "red"> = { YES: "green", PARTIAL: "yellow", NO: "red" };

export default function CoveragePage() {
  const { company, coverage } = getContext();
  if (!company) {
    return (
      <>
        <PageHeader title="IPO Coverage Matrix" />
        <EmptyState title="No company yet" message="The coverage matrix maps every section of the real SME prospectus against your extracted facts — showing exactly what can be generated and what is missing." />
      </>
    );
  }
  const s = coverageSummary(coverage);
  const parents = [...new Set(coverage.map((c) => c.parentSection))];

  return (
    <>
      <PageHeader
        title="IPO Coverage Matrix"
        subtitle="All 51 sections of the SME Draft Prospectus blueprint (NSE Emerge / BSE SME structure), scored against your uploaded documents and extracted facts. This matrix decides what the draft generator can produce."
      />
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <StatCard label="Average Coverage" value={`${s.avgCompletion}%`} tone={s.avgCompletion >= 70 ? "good" : s.avgCompletion >= 40 ? "warn" : "bad"} />
        <StatCard label="Generatable Now" value={s.generatable} tone="good" />
        <StatCard label="Partial (placeholders)" value={s.partial} tone="warn" />
        <StatCard label="Blocked" value={s.blocked} tone={s.blocked ? "bad" : "good"} />
        <StatCard label="Critical Sections" value={s.critical} tone={s.critical ? "bad" : "good"} />
      </div>

      {parents.map((parent) => (
        <Card key={parent} className="mb-4 overflow-hidden">
          <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-800">{parent}</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px] min-w-[900px]">
              <tbody>
                {coverage.filter((c) => c.parentSection === parent).map((c) => (
                  <tr key={c.sectionId} className="border-t border-slate-100 align-top">
                    <td className="px-5 py-2.5 w-64 font-medium text-slate-700">{c.sectionName}</td>
                    <td className="px-2 py-2.5 w-40">
                      <div className="flex items-center gap-2">
                        <ProgressBar value={c.completionPct} />
                        <span className="text-xs w-9 text-right">{c.completionPct}%</span>
                      </div>
                    </td>
                    <td className="px-2 py-2.5 w-28"><Badge tone={genTone[c.canGenerate]}>{c.canGenerate === "YES" ? "Generate" : c.canGenerate === "PARTIAL" ? "Partial" : "Blocked"}</Badge></td>
                    <td className="px-2 py-2.5 text-xs text-slate-500">
                      {c.missingFacts.length > 0 && <div className="text-amber-700">Missing: {c.missingFacts.slice(0, 3).join("; ")}{c.missingFacts.length > 3 ? ` +${c.missingFacts.length - 3}` : ""}</div>}
                      {c.sourceDocs.length > 0 && <div>📎 {c.sourceDocs.slice(0, 2).join(", ")}{c.sourceDocs.length > 2 ? ` +${c.sourceDocs.length - 2}` : ""} · conf {c.avgConfidence}%</div>}
                      {c.professionalReviewRequired && <div className="text-slate-400">Professional review required</div>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ))}
    </>
  );
}
