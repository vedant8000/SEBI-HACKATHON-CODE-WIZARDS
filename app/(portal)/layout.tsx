import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import { DisclaimerBar } from "@/components/shared/ui";
import { getContext } from "@/lib/server/context";
import { aiAvailable } from "@/lib/ai/provider";

export const dynamic = "force-dynamic";

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const { company, analysis } = getContext();
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar
          companyName={company?.name ?? null}
          statusLine={analysis ? `Readiness ${analysis.scores.overall}/100 · ${analysis.scores.statusLine}` : company ? "Analysis not run yet" : null}
          aiReady={aiAvailable()}
        />
        <main className="flex-1 px-6 py-6 max-w-[1400px] w-full mx-auto">
          {children}
          <DisclaimerBar />
        </main>
      </div>
    </div>
  );
}
