import { getContext } from "@/lib/server/context";
import { Card, EmptyState, PageHeader } from "@/components/shared/ui";
import DraftViewer from "@/components/draft/DraftViewer";
import { aiAvailable, AI_SETUP_MESSAGE } from "@/lib/ai/provider";

export const dynamic = "force-dynamic";

export default function DraftPage() {
  const { company, draft, coverage } = getContext();
  if (!company) {
    return (
      <>
        <PageHeader title="Draft Offer Document" />
        <EmptyState title="No company yet" message="Create your profile and upload documents — then generate a blueprint-based, source-linked draft here." />
      </>
    );
  }
  const generatable = coverage.filter((c) => c.canGenerate !== "NO").length;
  return (
    <>
      <PageHeader
        title="Draft Offer Document"
        subtitle={`Generated section-by-section against the real SME prospectus blueprint (${coverage.length} sections; ${generatable} currently generatable from your data). Facts come only from your documents — where data is missing the draft says so instead of inventing content. Every section requires authorised intermediary review.`}
        actions={<a href="/api/export/draft" target="_blank" className="px-3 py-1.5 text-xs font-medium bg-slate-800 text-white rounded-lg hover:bg-slate-700">Export Draft (print/PDF)</a>}
      />
      {!aiAvailable() && (
        <Card className="p-4 mb-5 border-amber-300 bg-amber-50">
          <p className="text-sm text-amber-800">{AI_SETUP_MESSAGE}</p>
        </Card>
      )}
      <DraftViewer sections={draft} aiReady={aiAvailable()} />
    </>
  );
}
