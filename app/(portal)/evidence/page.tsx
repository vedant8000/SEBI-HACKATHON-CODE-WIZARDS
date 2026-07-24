import { getContext } from "@/lib/server/context";
import { EmptyState, PageHeader } from "@/components/shared/ui";
import FactsTable from "@/components/evidence/FactsTable";
import RunIntelligenceButton from "@/components/evidence/RunIntelligenceButton";
import BankerFlagsCard from "@/components/shared/BankerFlagsCard";

export const dynamic = "force-dynamic";

export default async function EvidencePage() {
  const { company, facts, conflicts, db, flags } = await getContext();
  if (!company) {
    return (
      <>
        <PageHeader title="Extraction & Evidence" />
        <EmptyState title="No company yet" message="Create your company and upload documents — every extracted fact appears here with its source document, page and confidence." />
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
        title="Evidence & Extraction"
        subtitle="Every fact the platform uses, with its source document, page reference, extraction method and confidence. Accept, reject or correct anything — edits are flagged for merchant banker verification, and all downstream analysis updates instantly."
        actions={<RunIntelligenceButton />}
      />
      <BankerFlagsCard flags={flags.filter((f) => f.targetType === "fact" || f.targetType === "general")} />
      <FactsTable facts={facts} conflicts={conflicts} chunkStats={chunkStats} />
    </>
  );
}
