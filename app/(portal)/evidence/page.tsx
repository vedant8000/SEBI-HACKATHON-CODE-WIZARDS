import { getContext } from "@/lib/server/context";
import { EmptyState, PageHeader } from "@/components/shared/ui";
import FactsTable from "@/components/evidence/FactsTable";
import RunIntelligenceButton from "@/components/evidence/RunIntelligenceButton";
import Tr from "@/components/i18n/Tr";

export const dynamic = "force-dynamic";

export default async function EvidencePage() {
  const { company, facts, conflicts, db } = await getContext();
  if (!company) {
    return (
      <>
        <PageHeader title={<Tr id="evidence.titleEmpty" />} />
        <EmptyState title={<Tr id="common.noCompany" />} message={<Tr id="evidence.emptyMsg" />} />
      </>
    );
  }
  const chunkStats = {
    total: db.chunks.filter((c) => c.companyId === company.id).length,
    processed: db.chunks.filter((c) => c.companyId === company.id && c.processingStatus === "processed").length,
    failed: db.chunks.filter((c) => c.companyId === company.id && c.processingStatus === "failed").length,
  };
  return (
    <>
      <PageHeader
        title={<Tr id="evidence.title" />}
        subtitle={<Tr id="evidence.subtitle" />}
        actions={<RunIntelligenceButton />}
      />
      <FactsTable facts={facts} conflicts={conflicts} chunkStats={chunkStats} />
    </>
  );
}
