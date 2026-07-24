import { getContext } from "@/lib/server/context";
import { Card, EmptyState, PageHeader } from "@/components/shared/ui";
import DraftViewer, { type SectionMeta } from "@/components/draft/DraftViewer";
import DraftQa from "@/components/chat/DraftQa";
import Tr from "@/components/i18n/Tr";
import { aiAvailable } from "@/lib/ai/provider";
import { SME_PROSPECTUS_BLUEPRINT } from "@/lib/ipo-blueprint/sme-prospectus-blueprint";

export const dynamic = "force-dynamic";

export default async function DraftPage() {
  const { company, draft, coverage, analysis, flags } = await getContext();
  if (!company) {
    return (
      <>
        <PageHeader title={<Tr id="draft.title" />} />
        <EmptyState title={<Tr id="common.noCompany" />} message={<Tr id="draft.emptyMsg" />} />
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
        title={<Tr id="draft.title" />}
        subtitle={<Tr id="draft.subtitle" params={{ sections: coverage.length, gen: generatable }} />}
        actions={<a href="/api/export/draft" target="_blank" className="px-3 py-1.5 text-xs font-medium bg-slate-800 text-white rounded-lg hover:bg-slate-700"><Tr id="draft.export" /></a>}
      />
      <BankerFlagsCard flags={flags.filter((f) => f.targetType === "section")} title="Draft sections your merchant banker wants corrected" />
      {!aiAvailable() && (
        <Card className="p-4 mb-5 border-sky-300 bg-sky-50">
          <p className="text-sm text-sky-800">
            <Tr id="draft.ruleNotePrefix" /><strong><Tr id="draft.ruleNoteBold" /></strong><Tr id="draft.ruleNoteSuffix" />
          </p>
        </Card>
      )}
      <DraftViewer sections={draft} aiReady={aiAvailable()} meta={meta} />
      <DraftQa />
    </>
  );
}
