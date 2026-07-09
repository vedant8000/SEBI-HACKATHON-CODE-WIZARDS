import { getContext } from "@/lib/server/context";
import { Card, EmptyState, PageHeader, SeverityBadge } from "@/components/shared/ui";

export const dynamic = "force-dynamic";

export default function ObservationsPage() {
  const { company, analysis } = getContext();
  if (!company || !analysis) {
    return (
      <>
        <PageHeader title="Exchange Observation Simulator" />
        <EmptyState title="No analysis yet" message="Predicts the questions exchanges and merchant bankers are likely to raise on YOUR data — before filing. Run the analysis to generate them." showOnboardCta={!company} />
      </>
    );
  }
  const obs = analysis.observations;
  return (
    <>
      <PageHeader
        title="Exchange Observation Simulator"
        subtitle="A dry run of scrutiny: each simulated observation explains why it would be asked, how to respond, and what evidence to keep ready. Answering these now is dramatically cheaper than answering them after filing."
      />
      {obs.length === 0 ? (
        <Card className="p-8 text-center text-sm text-slate-400">No likely observations derived yet — upload more documents and re-run the analysis.</Card>
      ) : (
        obs.map((o, i) => (
          <Card key={o.id} className="p-5 mb-3">
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
        ))
      )}
      <p className="text-xs text-slate-400 mt-4">Simulated observations are derived from your data patterns; actual exchange comments may differ. Preparation value only.</p>
    </>
  );
}
