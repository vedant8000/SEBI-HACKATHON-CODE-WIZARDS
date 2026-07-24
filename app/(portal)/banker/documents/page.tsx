import { getSessionUser } from "@/lib/auth/session";
import { getBankerContext } from "@/lib/server/banker-context";
import { PageHeader } from "@/components/shared/ui";
import LinkCompanyForm from "@/components/banker/LinkCompanyForm";
import BankerDocsTable from "@/components/banker/BankerDocsTable";

export const dynamic = "force-dynamic";

export default async function BankerDocumentsPage() {
  const user = await getSessionUser();
  const { company, docs, flags } = await getBankerContext(user!.email);

  if (!company) {
    return (
      <>
        <PageHeader title="Filing Documents" />
        <LinkCompanyForm />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Filing Documents"
        subtitle={`Every document ${company.name} has uploaded for the IPO filing — classification, extracted values and detected issues. Open the original file, and flag anything that must be corrected or re-submitted.`}
      />
      <BankerDocsTable docs={docs} flags={flags} companyId={company.id} />
    </>
  );
}
