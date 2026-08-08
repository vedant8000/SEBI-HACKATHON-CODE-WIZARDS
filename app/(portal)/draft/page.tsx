import { getContext } from "@/lib/server/context";
import { Card, EmptyState, PageHeader } from "@/components/shared/ui";
import DraftViewer, { type SectionMeta } from "@/components/draft/DraftViewer";
import SendToBankerButton from "@/components/draft/SendToBankerButton";
import DraftQa from "@/components/chat/DraftQa";
import BankerFlagsCard from "@/components/shared/BankerFlagsCard";
import TrustStrip from "@/components/shared/TrustStrip";
import { aiAvailable } from "@/lib/ai/provider";
import { SME_PROSPECTUS_BLUEPRINT } from "@/lib/ipo-blueprint/sme-prospectus-blueprint";

export const dynamic = "force-dynamic";

export default async function DraftPage() {
  const { company, draft, coverage, analysis, flags } = await getContext();
  if (!company) {
    return (
      <>
        <PageHeader title="Draft Offer Document" />
        <EmptyState title="No company yet" message="Complete Company Setup and upload documents, then generate a blueprint-based, source-linked draft here." />
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
  const draftGenerated = draft.some((d) => d.status !== "Not Started" && d.generatedText.trim());
  const alreadySent = draft.some((d) => d.status === "MB Review Pending" || d.status === "Approved");
  return (
    <>
      <PageHeader
        title="Draft Offer Document"
        subtitle={`The complete SME offer-document blueprint (${coverage.length} sections), generated only from your extracted facts and evidence, AI drafts the company-specific sections, the rule engine composes the standard ones (${generatable} sections currently have enough data). Missing information is omitted or flagged rather than assumed. Every section requires authorised intermediary review.`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <a href="/api/export/draft" target="_blank" className="px-3 py-1.5 text-xs font-medium bg-slate-800 text-white rounded-lg hover:bg-slate-700">Export Draft Offer Document</a>
            <a href="/api/export/filing-pack" target="_blank" className="px-3 py-1.5 text-xs font-medium border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50" title="Structured, source-linked JSON disclosure data model with a tamper-evident hash-chain, for the merchant banker's systems and supervisory use.">Export Machine-Readable Pack (JSON)</a>
            <a href="/api/export/verify-ledger" target="_blank" className="px-3 py-1.5 text-xs font-medium border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50" title="Recompute and verify the tamper-evident hash-chain over this company's export history.">Verify Export Ledger</a>
            <SendToBankerButton canSend={draftGenerated} alreadySent={alreadySent} />
          </div>
        }
      />
      <TrustStrip className="mb-5" />
      <BankerFlagsCard flags={flags.filter((f) => f.targetType === "section")} title="Draft sections your merchant banker wants corrected" />
      {!aiAvailable() && (
        <Card className="p-4 mb-5 border-sky-300 bg-sky-50">
          <p className="text-sm text-sky-800">
            No AI provider is configured, so the draft is composed by the built-in <strong>rule-based generator</strong>, the
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
