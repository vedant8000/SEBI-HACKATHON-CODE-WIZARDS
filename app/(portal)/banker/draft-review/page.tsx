import { getSessionUser } from "@/lib/auth/session";
import { getBankerContext } from "@/lib/server/banker-context";
import { PageHeader } from "@/components/shared/ui";
import LinkCompanyForm from "@/components/banker/LinkCompanyForm";
import ReviewRoom from "@/components/review/ReviewRoom";

export const dynamic = "force-dynamic";

export default async function BankerDraftReviewPage() {
  const user = await getSessionUser();
  const { company, draft, analysis, db } = await getBankerContext(user!.email);

  if (!company) {
    return (
      <>
        <PageHeader title="Draft Review" />
        <LinkCompanyForm />
      </>
    );
  }

  const auditLog = db.auditLog.filter((a) => a.companyId === company.id).slice(0, 40);
  return (
    <>
      <PageHeader
        title="Draft Review"
        subtitle="SIIM prepares; professionals decide. Review each drafted section against its source evidence, approve or request changes — every action lands in the audit trail."
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
