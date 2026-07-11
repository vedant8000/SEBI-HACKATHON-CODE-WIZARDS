import { getContext } from "@/lib/server/context";
import { Card, EmptyState, PageHeader, StatCard } from "@/components/shared/ui";
import { estimateSavings } from "@/lib/engine/summary";

export const dynamic = "force-dynamic";

export default function SavingsPage() {
  const { company, analysis, draft, docs } = getContext();
  if (!company) {
    return (
      <>
        <PageHeader title="Time & Cost Saved" />
        <EmptyState title="No company yet" message="Once you're working, this dashboard estimates the preparation time and early-stage professional hours the platform is saving you." />
      </>
    );
  }
  const s = estimateSavings(analysis, draft, docs.length);
  return (
    <>
      <PageHeader
        title="Time & Cost Saved"
        subtitle="Where the savings come from: gaps caught before professional review, drafts assembled with evidence attached, and rework avoided. All figures are estimates, not guarantees."
      />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <StatCard label="Traditional First Draft" value={s.traditionalDays} sub="Typical SME timeline with scattered records" />
        <StatCard label="With SIIM" value={s.aiAssistedDays} sub="To a promoter-ready, review-ready draft" tone="good" />
        <StatCard label="Estimated Days Saved" value={s.daysSaved} tone="good" />
        <StatCard label="Est. Cost Saved" value={s.estimatedCostSaved} sub="Early-stage professional fees avoided" tone="good" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <StatCard label="Gaps Caught Early" value={s.gapsFoundEarly} sub="Before merchant banker review" />
        <StatCard label="Source-Linked Disclosures" value={s.sourceLinkedDisclosures} sub="Facts traceable to documents" />
        <StatCard label="Checks Automated" value={s.checksAutomated} sub="Readiness + consistency rules run" />
        <StatCard label="Est. Rework Reduction" value={s.reworkReduction} sub="From catching issues pre-review" />
      </div>
      <Card className="p-5">
        <h3 className="text-sm font-semibold text-slate-800 mb-2">How to read these numbers</h3>
        <ul className="text-sm text-slate-600 space-y-1.5">
          <li>• <strong>{s.documentsProcessed} documents</strong> were read, classified and cross-checked automatically.</li>
          <li>• <strong>{s.professionalHoursSaved}</strong> of early-stage professional hours estimated saved — intermediaries start from an organised, evidence-linked draft instead of raw files.</li>
          <li>• The merchant banker&apos;s statutory role is unchanged; savings come from arriving prepared, not from skipping review.</li>
        </ul>
        <p className="text-xs text-slate-400 mt-4">{s.disclaimer}</p>
      </Card>
    </>
  );
}
