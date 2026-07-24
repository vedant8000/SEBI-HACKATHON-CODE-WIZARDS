import { getContext } from "@/lib/server/context";
import { EmptyState, PageHeader } from "@/components/shared/ui";
import IntelligenceTabs from "@/components/intelligence/IntelligenceTabs";
import Tr from "@/components/i18n/Tr";

export const dynamic = "force-dynamic";

export default async function IntelligencePage() {
  const { company, analysis, coverage, conflicts, objects, docs, flags } = await getContext();
  if (!company) {
    return (
      <>
        <PageHeader title={<Tr id="intelligence.title" />} />
        <EmptyState
          title={<Tr id="common.noCompany" />}
          message={<Tr id="intelligence.emptyMsg" />}
        />
      </>
    );
  }
  return (
    <>
      <PageHeader
        title={<Tr id="intelligence.title" />}
        subtitle={<Tr id="intelligence.subtitle" />}
      />
      <BankerFlagsCard flags={flags.filter((f) => f.targetType === "gap")} title="Gaps your merchant banker has flagged" />
      <IntelligenceTabs
        analysis={analysis}
        coverage={coverage}
        conflicts={conflicts}
        objects={objects}
        evidenceDocs={docs.filter((d) => d.category === "Objects Evidence").map((d) => d.fileName)}
        freshIssueCr={company.freshIssueCr}
        financials={company.financials}
      />
    </>
  );
}
