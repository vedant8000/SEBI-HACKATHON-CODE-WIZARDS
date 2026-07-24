import { getSessionUser } from "@/lib/auth/session";
import { getBankerContext } from "@/lib/server/banker-context";
import { Card, PageHeader } from "@/components/shared/ui";
import LinkCompanyForm from "@/components/banker/LinkCompanyForm";
import BankerIssues from "@/components/banker/BankerIssues";

export const dynamic = "force-dynamic";

export default async function BankerIssuesPage() {
  const user = await getSessionUser();
  const { company, analysis, conflicts, coverage } = await getBankerContext(user!.email);

  if (!company) {
    return (
      <>
        <PageHeader title="Issues & Corrections" />
        <LinkCompanyForm />
      </>
    );
  }

  if (!analysis) {
    return (
      <>
        <PageHeader title="Issues & Corrections" />
        <Card className="p-8 text-center text-sm text-slate-400">
          The rule engine has not run for {company.name} yet — the promoter needs to complete Company
          Setup and upload documents first.
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Issues & Corrections"
        subtitle={`What is missing, inconsistent or risky in ${company.name}'s filing, straight from the deterministic rule engine. Flag any item to tell the promoter exactly what to correct — your flags appear on their workspace instantly.`}
      />
      <BankerIssues
        companyId={company.id}
        gaps={analysis.gaps}
        financialChecks={analysis.financialChecks}
        conflicts={conflicts}
        rptRisks={analysis.rptRisks}
        coverage={coverage}
      />
    </>
  );
}
