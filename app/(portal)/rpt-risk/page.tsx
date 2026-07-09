import { getContext } from "@/lib/server/context";
import { Card, EmptyState, PageHeader, ScoreDonut, SeverityBadge } from "@/components/shared/ui";
import { rptBand } from "@/lib/rules/scoring-config";

export const dynamic = "force-dynamic";

export default function RptRiskPage() {
  const { company, analysis } = getContext();
  if (!company || !analysis) {
    return (
      <>
        <PageHeader title="RPT Risk & Fund Diversion Engine" />
        <EmptyState title="No analysis yet" message="This engine scans your uploads for promoter-group entities (including family-name matches), related-party loans and fund-diversion patterns. Run the analysis to see results." showOnboardCta={!company} />
      </>
    );
  }
  const risks = analysis.rptRisks;
  const score = analysis.scores.rptScore;

  return (
    <>
      <PageHeader
        title="RPT Risk & Fund Diversion Engine"
        subtitle="Related-party transactions are the first thing reviewers scrutinise in an SME IPO. This engine detects them from your documents — including entities whose names match the promoter's family — and tells you exactly what to disclose and evidence."
      />
      <Card className="p-5 mb-5 flex flex-wrap items-center gap-6">
        <ScoreDonut score={score} label="RPT RISK" />
        <div>
          <div className="text-sm font-semibold text-slate-800">
            RPT Risk: {rptBand(score)} <span className="text-slate-400 font-normal">(0–30 Low · 31–60 Medium · 61–100 High)</span>
          </div>
          <p className="text-sm text-slate-600 mt-1 max-w-2xl">
            {risks.length
              ? `${risks.length} related-party signal(s) detected. None of these block an IPO by themselves — undisclosed, they absolutely do. Disclose early, evidence thoroughly.`
              : "No related-party signals detected in the current uploads. If your business does transact with promoter-connected entities, upload the RPT register — non-detection is not clearance."}
          </p>
        </div>
      </Card>

      {risks.map((r) => (
        <Card key={r.id} className="p-5 mb-3">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <SeverityBadge severity={r.severity} />
            <h3 className="text-sm font-semibold text-slate-800">{r.entityName}</h3>
            <span className="text-xs text-slate-500">· {r.relationship}</span>
            <span className="ml-auto text-sm font-semibold text-slate-700">Risk score {r.riskScore}/100</span>
          </div>
          <div className="grid md:grid-cols-3 gap-3 text-[13px] mb-3">
            <div className="bg-slate-50 rounded-lg px-3 py-2"><span className="text-slate-500">Amount:</span> <span className="font-medium">{r.amountCr ? `₹${r.amountCr} Cr` : "Not extracted"}</span></div>
            <div className="bg-slate-50 rounded-lg px-3 py-2"><span className="text-slate-500">Share of base:</span> <span className="font-medium">{r.pctOfBase}</span></div>
            <div className="bg-slate-50 rounded-lg px-3 py-2"><span className="text-slate-500">Band:</span> <span className="font-medium">{rptBand(r.riskScore)}</span></div>
          </div>
          <p className="text-sm text-slate-600"><span className="font-medium text-slate-800">Why flagged:</span> {r.reason}</p>
          <div className="grid md:grid-cols-2 gap-3 mt-3 text-[13px]">
            <div className="bg-blue-50 rounded-lg px-3 py-2"><span className="font-medium text-blue-800">Suggested disclosure:</span> <span className="text-blue-900">{r.suggestedDisclosure}</span></div>
            <div className="bg-amber-50 rounded-lg px-3 py-2"><span className="font-medium text-amber-800">Required evidence:</span> <span className="text-amber-900">{r.requiredEvidence}</span></div>
          </div>
        </Card>
      ))}
      <p className="text-xs text-slate-400 mt-4">All RPT findings require merchant banker and legal review. Name-matching is a heuristic — confirm relationships before treating an entity as related or unrelated.</p>
    </>
  );
}
