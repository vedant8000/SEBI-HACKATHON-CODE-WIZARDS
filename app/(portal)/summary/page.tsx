import { getContext } from "@/lib/server/context";
import { EmptyState, PageHeader } from "@/components/shared/ui";
import { generateSummary, type SummaryLang, type SummaryMode } from "@/lib/engine/summary";
import SummaryTabs from "@/components/summary/SummaryTabs";

export const dynamic = "force-dynamic";

export default function SummaryPage() {
  const { company, analysis, draft } = getContext();
  if (!company) {
    return (
      <>
        <PageHeader title="Plain-English IPO Summary & Q&A" />
        <EmptyState title="No company yet" message="Once your data is in, this page explains your own IPO draft in simple language — for you, for investors, and as a risk brief — plus a Q&A assistant grounded in your data." />
      </>
    );
  }
  const modes: SummaryMode[] = ["promoter", "investor", "risk"];
  const langs: SummaryLang[] = ["en", "hi"];
  const summaries: Record<string, string> = {};
  for (const m of modes) for (const l of langs) summaries[`${m}:${l}`] = generateSummary(m, l, company, analysis, draft);

  return (
    <>
      <PageHeader
        title="Plain-English IPO Summary & Q&A"
        subtitle="Your IPO story without the jargon — generated from your actual data. Switch to Simple Hindi/Hinglish if that reads easier. Then ask the assistant anything about your preparation."
      />
      <SummaryTabs summaries={summaries} />
    </>
  );
}
