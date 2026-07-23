import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import JourneyStepper from "@/components/layout/JourneyStepper";
import { DisclaimerBar } from "@/components/shared/ui";
import { getContext } from "@/lib/server/context";
import { aiAvailable } from "@/lib/ai/provider";

export const dynamic = "force-dynamic";

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const { company, analysis, docs, facts, draft } = getContext();
  const steps = [
    { href: "/onboarding", label: "Company Setup", done: !!company },
    { href: "/data-room", label: "Upload Documents", done: docs.length > 0 },
    { href: "/evidence", label: "Review Evidence", done: facts.length > 0 },
    { href: "/intelligence", label: "IPO Intelligence", done: !!analysis },
    { href: "/draft", label: "Draft Generated", done: draft.some((d) => d.status !== "Not Started") },
    { href: "/merchant-review", label: "MB Review", done: draft.some((d) => d.status === "Approved") },
  ];
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 bg-[#d7e2f0]">
        <Topbar
          companyName={company?.name ?? null}
          statusLine={analysis ? `Readiness ${analysis.scores.overall}/100 · ${analysis.scores.statusLine}` : company ? "Analysis not run yet" : null}
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
