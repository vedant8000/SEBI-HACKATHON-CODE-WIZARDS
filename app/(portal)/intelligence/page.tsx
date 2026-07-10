import { getContext } from "@/lib/server/context";
import { EmptyState, PageHeader } from "@/components/shared/ui";
import IntelligenceTabs from "@/components/intelligence/IntelligenceTabs";

export const dynamic = "force-dynamic";

export default function IntelligencePage() {
  const { company, analysis, coverage, conflicts, objects, docs } = getContext();
  if (!company) {
    return (
      <>
        <PageHeader title="IPO Intelligence" />
        <EmptyState
          title="No company yet"
          message="Complete Company Setup and upload documents — this page then shows your readiness score, missing data, inconsistencies, related-party risks, fund-use plan and the questions reviewers are likely to ask."
        />
      </>
    );
  }
  return (
    <>
      <PageHeader
        title="IPO Intelligence"
        subtitle="Everything the rule engine found in your data — readiness, missing data, inconsistencies, related-party & fund-use risk, your objects plan, and likely reviewer questions. All computed live from extracted facts; nothing is pre-set."
      />
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
