import { getContext } from "@/lib/server/context";
import { EmptyState, PageHeader } from "@/components/shared/ui";
import AssistantChat from "@/components/chat/AssistantChat";

export const dynamic = "force-dynamic";

export default function AssistantPage() {
  const { company, analysis, facts, draft, docs } = getContext();
  if (!company) {
    return (
      <>
        <PageHeader title="AI Assistant" />
        <EmptyState
          title="No company yet"
          message="Complete Company Setup and upload documents — the assistant answers only from your own data, so it needs something to read first."
        />
      </>
    );
  }
  const gaps = (analysis?.gaps ?? []).filter((g) => g.status !== "Resolved");
  return (
    <>
      <PageHeader
        title="AI Assistant"
        subtitle="Ask anything about your IPO preparation — in English or simple Hindi. Answers come only from your uploaded documents, extracted facts, detected gaps and the draft. Final judgement always rests with your merchant banker and legal counsel."
      />
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
