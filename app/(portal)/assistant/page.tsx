import { getContext } from "@/lib/server/context";
import { EmptyState, PageHeader } from "@/components/shared/ui";
import AssistantChat from "@/components/chat/AssistantChat";
import Tr from "@/components/i18n/Tr";

export const dynamic = "force-dynamic";

export default async function AssistantPage() {
  const { company, analysis, facts, draft, docs } = await getContext();
  if (!company) {
    return (
      <>
        <PageHeader title={<Tr id="assistant.title" />} />
        <EmptyState
          title={<Tr id="common.noCompany" />}
          message={<Tr id="assistant.emptyMsg" />}
        />
      </>
    );
  }
  const gaps = (analysis?.gaps ?? []).filter((g) => g.status !== "Resolved");
  return (
    <>
      <PageHeader title={<Tr id="assistant.title" />} subtitle={<Tr id="assistant.subtitle" />} />
      <AssistantChat
        companyName={company.name}
        context={{
          score: analysis?.scores.overall ?? null,
          statusLine: analysis?.scores.statusLine ?? "Analysis not run yet",
          docs: docs.length,
          facts: facts.length,
          gaps: gaps.length,
          criticalGaps: gaps.filter((g) => g.severity === "Critical").length,
          draftSections: draft.length,
          topGaps: gaps
            .sort((a, b) => ["Critical", "High", "Medium", "Low"].indexOf(a.severity) - ["Critical", "High", "Medium", "Low"].indexOf(b.severity))
            .slice(0, 4)
            .map((g) => ({ title: g.title, severity: g.severity })),
        }}
      />
    </>
  );
}
