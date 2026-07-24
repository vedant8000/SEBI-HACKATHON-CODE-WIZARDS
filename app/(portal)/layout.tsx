import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import JourneyStepper from "@/components/layout/JourneyStepper";
import { DisclaimerBar } from "@/components/shared/ui";
import { getContext } from "@/lib/server/context";
import { aiAvailable } from "@/lib/ai/provider";

export const dynamic = "force-dynamic";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const { company, analysis, docs, facts, draft } = await getContext();
  const steps = [
    { href: "/onboarding", labelKey: "step.onboarding", done: !!company && docs.length > 0 },
    { href: "/evidence", labelKey: "step.evidence", done: facts.length > 0 },
    { href: "/intelligence", labelKey: "step.intelligence", done: !!analysis },
    { href: "/draft", labelKey: "step.draft", done: draft.some((d) => d.status !== "Not Started") },
    { href: "/merchant-review", labelKey: "step.review", done: draft.some((d) => d.status === "Approved") },
  ];
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 bg-[#d7e2f0]">
        <Topbar
          companyName={company?.name ?? null}
          readiness={analysis?.scores.overall ?? null}
          statusDetail={analysis?.scores.statusLine ?? null}
          aiReady={aiAvailable()}
        />
        <JourneyStepper steps={steps} />
        <main className="flex-1 px-6 py-6 max-w-[1400px] w-full mx-auto">
          {children}
          <DisclaimerBar />
        </main>
      </div>
    </div>
  );
}
