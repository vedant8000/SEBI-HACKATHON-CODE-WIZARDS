import { getContext } from "@/lib/server/context";
import { EmptyState, PageHeader } from "@/components/shared/ui";
import ReviewRoom from "@/components/review/ReviewRoom";

export const dynamic = "force-dynamic";

export default function MerchantReviewPage() {
  const { company, draft, analysis, db } = getContext();
  if (!company) {
    return (
      <>
        <PageHeader title="Merchant Banker Review Room" />
        <EmptyState title="No company assigned" message="Once a company profile exists and a draft is generated, the merchant banker reviews it here — section by section, with evidence." />
      </>
    );
  }
  const auditLog = db.auditLog.filter((a) => a.companyId === company.id).slice(0, 40);
  return (
    <>
      <PageHeader
        title="Merchant Banker Review Room"
        subtitle="IPO Saathi prepares; professionals decide. The merchant banker reviews each AI-drafted section against its source evidence, approves or requests changes, and every action lands in the audit trail."
        actions={<a href="/api/export/review-pack" target="_blank" className="px-3 py-1.5 text-xs font-medium bg-slate-800 text-white rounded-lg hover:bg-slate-700">Export Review Pack</a>}
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
