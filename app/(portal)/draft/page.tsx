import { getContext } from "@/lib/server/context";
import { Card, EmptyState, PageHeader } from "@/components/shared/ui";
import DraftViewer, { type SectionMeta } from "@/components/draft/DraftViewer";
import DraftQa from "@/components/chat/DraftQa";
import { aiAvailable, AI_SETUP_MESSAGE } from "@/lib/ai/provider";
import { SME_PROSPECTUS_BLUEPRINT } from "@/lib/ipo-blueprint/sme-prospectus-blueprint";

export const dynamic = "force-dynamic";

export default function DraftPage() {
  const { company, draft, coverage, analysis } = getContext();
  if (!company) {
    return (
      <>
        <PageHeader title="Draft Offer Document" />
        <EmptyState title="No company yet" message="Complete Company Setup and upload documents — then generate a blueprint-based, source-linked draft here." />
      </>
    );
  }

  // Right-panel insights per section: purpose, coverage, likely reviewer questions
  const meta: Record<string, SectionMeta> = {};
  for (const bp of SME_PROSPECTUS_BLUEPRINT) {
    const cov = coverage.find((c) => c.sectionId === bp.sectionId);
    meta[bp.sectionName] = {
      purpose: bp.purpose,
      coveragePct: cov?.completionPct ?? 0,
      missingFacts: cov?.missingFacts ?? [],
      questions: (analysis?.observations ?? [])
        .filter((o) => o.affectedSection === bp.sectionName)
        .map((o) => ({ q: o.observation, severity: o.severity })),
      professionalReviewRequired: bp.professionalReviewRequired,
    };
  }

  const generatable = coverage.filter((c) => c.canGenerate !== "NO").length;
  return (
    <>
      <PageHeader
        title="Draft Offer Document"
        subtitle={`16 real SME offer-document sections, generated only from your extracted facts and evidence (${generatable} of ${coverage.length} blueprint sections currently have enough data). Missing information appears as explicit placeholders — never invented content. Every section requires authorised intermediary review.`}
        actions={<a href="/api/export/draft" target="_blank" className="px-3 py-1.5 text-xs font-medium bg-slate-800 text-white rounded-lg hover:bg-slate-700">Export Draft Offer Document</a>}
      />
      {!aiAvailable() && (
        <Card className="p-4 mb-5 border-amber-300 bg-amber-50">
          <p className="text-sm text-amber-800">{AI_SETUP_MESSAGE}</p>
        </Card>
      )}
      <DraftViewer sections={draft} aiReady={aiAvailable()} meta={meta} />
      <DraftQa />
    </>
  );
}
