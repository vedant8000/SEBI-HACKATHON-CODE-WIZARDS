import { getContext } from "@/lib/server/context";
import { Card, EmptyState, PageHeader } from "@/components/shared/ui";
import DraftViewer, { type SectionMeta } from "@/components/draft/DraftViewer";
import DraftQa from "@/components/chat/DraftQa";
import { aiAvailable } from "@/lib/ai/provider";
import { SME_PROSPECTUS_BLUEPRINT } from "@/lib/ipo-blueprint/sme-prospectus-blueprint";

export const dynamic = "force-dynamic";

export default async function DraftPage() {
  const { company, draft, coverage, analysis } = await getContext();
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
        subtitle={`The complete SME offer-document blueprint (${coverage.length} sections), generated only from your extracted facts and evidence — AI drafts the company-specific sections, the rule engine composes the standard ones (${generatable} sections currently have enough data). Missing information is omitted or flagged — never invented. Every section requires authorised intermediary review.`}
        actions={<a href="/api/export/draft" target="_blank" className="px-3 py-1.5 text-xs font-medium bg-slate-800 text-white rounded-lg hover:bg-slate-700">Export Draft Offer Document</a>}
      />
      {!aiAvailable() && (
        <Card className="p-4 mb-5 border-sky-300 bg-sky-50">
          <p className="text-sm text-sky-800">
            No AI provider is configured, so the draft is composed by the built-in <strong>rule-based generator</strong> — the
            same blueprint sections, tables and source-linking, built deterministically from your extracted facts. Configure an
            AI key (GEMINI/ANTHROPIC/OPENAI) for richer prose; the rule-based draft is always available as a fallback, including
            when AI keys are rate-limited.
          </p>
        </Card>
      )}
      <DraftViewer sections={draft} aiReady={aiAvailable()} meta={meta} />
      <DraftQa />
    </>
  );
}
