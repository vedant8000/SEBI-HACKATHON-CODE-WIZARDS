import { getContext } from "@/lib/server/context";
import { Building2, KeyRound } from "lucide-react";
import OnboardingForm from "@/components/onboarding/OnboardingForm";
import PromoterHero, { type HeroGap } from "@/components/onboarding/PromoterHero";
import PreparationLeverage from "@/components/onboarding/PreparationLeverage";

export const dynamic = "force-dynamic";

const sevOrder = { Critical: 0, High: 1, Medium: 2, Low: 3 } as const;

export default async function OnboardingPage() {
  const { company, analysis, docs, draft, facts, coverage } = await getContext();

  const openGaps = (analysis?.gaps ?? []).filter((g) => g.status !== "Resolved");
  const sortedGaps = [...openGaps].sort(
    (a, b) => (sevOrder[a.severity] ?? 9) - (sevOrder[b.severity] ?? 9)
  );
  const criticalCount = openGaps.filter((g) => g.severity === "Critical").length;
  const highCount = openGaps.filter((g) => g.severity === "High").length;
  const obAttention = (analysis?.complianceObligations ?? []).filter((o) => o.status === "Attention").length;
  const topGaps: HeroGap[] = sortedGaps.slice(0, 3).map((g) => ({
    title: g.title, severity: g.severity, section: g.affectedSection, href: "/intelligence",
  }));

  // Preparation-leverage counts — live from analysis, never assumed.
  const factsLinked = facts.filter((f) => f.status !== "REJECTED").length;
  const sectionsReady = coverage.filter((c) => c.canGenerate === "YES").length;
  const authFlags = docs.filter((d) => d.authenticity?.level === "flag").length;
  const integrityFlags = analysis?.integrity?.signals.filter((s) => s.status === "flag").length ?? 0;
  const finIssues = (analysis?.financialChecks ?? []).filter((f) => f.severity !== "Low").length;
  const issuesSurfaced = openGaps.length + integrityFlags + finIssues + authFlags;
  const checksRun = analysis?.checks.length ?? 0;

  const draftStarted = draft.some((d) => d.status !== "Not Started");
  const nextAction =
    !company ? { label: "Complete your profile", href: "#" }
      : docs.length === 0 ? { label: "Upload your documents", href: "/onboarding#upload" }
        : !analysis ? { label: "Run IPO Intelligence", href: "/intelligence" }
          : criticalCount > 0 ? { label: `Resolve ${criticalCount} critical gap${criticalCount > 1 ? "s" : ""}`, href: "/intelligence" }
            : !draftStarted ? { label: "Generate the draft", href: "/draft" }
              : { label: "Progress to merchant-banker review", href: "/draft" };

  return (
    <>
      <PromoterHero
        hasCompany={!!company}
        assessed={!!analysis}
        score={analysis?.scores.overall ?? 0}
        statusLine={analysis?.scores.statusLine ?? (company ? "Run IPO Intelligence to compute your readiness." : "")}
        coveragePct={analysis?.scores.draftCompletionPct ?? 0}
        criticalCount={criticalCount}
        highCount={highCount}
        obAttention={obAttention}
        topGaps={topGaps}
        nextAction={nextAction}
      />
      {company && (docs.length > 0 || factsLinked > 0) && (
        <PreparationLeverage
          companyName={company.name}
          documentsIngested={docs.length}
          factsLinked={factsLinked}
          sectionsReady={sectionsReady}
          sectionsTotal={coverage.length}
          issuesSurfaced={issuesSurfaced}
          checksRun={checksRun}
        />
      )}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-blue-600 to-sky-500 shadow-lg shadow-blue-500/30">
          <Building2 size={24} strokeWidth={1.8} className="text-white" />
        </span>
        <div>
          <h1 className="text-3xl font-bold font-serif tracking-tight text-[#1e3a5f]">Company Profile</h1>
          <p className="text-sm text-slate-500 mt-0.5 max-w-3xl">
            Tell us about your company in key fields. We&rsquo;ll use this to build a strong, compliant draft.
          </p>
        </div>
        {company?.companyCode && (
          <div className="ml-auto flex items-center gap-2.5 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-2.5">
            <KeyRound size={16} className="text-blue-700 shrink-0" />
            <div className="leading-tight">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-blue-700">Company code, share with your merchant banker</div>
              <div className="font-mono text-base font-bold text-[#1e3a5f] tracking-widest">{company.companyCode}</div>
              <div className="text-[11px] text-slate-500">They enter it in their SIIM workspace to review your filing.</div>
            </div>
          </div>
        )}
      </div>
      <OnboardingForm existing={company} />
    </>
  );
}
