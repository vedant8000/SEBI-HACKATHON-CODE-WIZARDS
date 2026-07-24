import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import JourneyStepper from "@/components/layout/JourneyStepper";
import { DisclaimerBar } from "@/components/shared/ui";
import { getContext } from "@/lib/server/context";
import { getBankerContext } from "@/lib/server/banker-context";
import { getSessionUser } from "@/lib/auth/session";
import { aiAvailable } from "@/lib/ai/provider";

export const dynamic = "force-dynamic";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  const role = user?.role ?? "PROMOTER";

  // ── Merchant banker shell: linked-company header, no promoter journey ──
  if (role === "MERCHANT_BANKER") {
    const { company, analysis } = await getBankerContext(user!.email);
    return (
      <div className="flex min-h-screen">
        <Sidebar role={role} />
        <div className="flex-1 flex flex-col min-w-0 bg-[#d7e2f0]">
          <Topbar
            role={role}
            companyName={company?.name ?? null}
            statusLine={
              company
                ? analysis
                  ? `Readiness ${analysis.scores.overall}/100 · ${analysis.scores.statusLine}`
                  : "Analysis not run yet"
                : "No company linked yet — enter the promoter's company code"
            }
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

  // ── Promoter shell: preparation journey ──
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
      <Sidebar role={role} />
      <div className="flex-1 flex flex-col min-w-0 bg-[#d7e2f0]">
        <Topbar
          role={role}
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
