import { getContext } from "@/lib/server/context";
import { EmptyState, PageHeader } from "@/components/shared/ui";
import ReviewRoom from "@/components/review/ReviewRoom";
import Tr from "@/components/i18n/Tr";

export const dynamic = "force-dynamic";

export default async function MerchantReviewPage() {
  const { company, draft, analysis, db } = await getContext();
  if (!company) {
    return (
      <>
        <PageHeader title={<Tr id="review.title" />} />
        <EmptyState title={<Tr id="review.emptyTitle" />} message={<Tr id="review.emptyMsg" />} />
      </>
    );
  }
  const auditLog = db.auditLog.filter((a) => a.companyId === company.id).slice(0, 40);
  return (
    <>
      <PageHeader
        title={<Tr id="review.title" />}
        subtitle={<Tr id="review.subtitle" />}
        actions={<a href="/api/export/review-pack" target="_blank" className="px-3 py-1.5 text-xs font-medium bg-slate-800 text-white rounded-lg hover:bg-slate-700"><Tr id="review.export" /></a>}
      />
      <ReviewRoom
        company={{ name: company.name, id: company.id }}
        sections={draft}
        criticalOpen={(analysis?.gaps ?? []).filter((g) => g.severity === "Critical" && g.status !== "Resolved").length}
        highRiskOpen={(analysis?.gaps ?? []).filter((g) => g.severity === "High" && g.status !== "Resolved").length}
        draftCompletion={analysis?.scores.draftCompletionPct ?? 0}
        auditLog={auditLog}
      />
    </>
  );
}
