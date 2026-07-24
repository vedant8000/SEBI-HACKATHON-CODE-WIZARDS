import { getContext } from "@/lib/server/context";
import { Building2, KeyRound } from "lucide-react";
import OnboardingForm from "@/components/onboarding/OnboardingForm";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const { company } = await getContext();
  return (
    <>
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-white border border-slate-200 shadow-sm text-[#1e3a5f]">
          <Building2 size={24} strokeWidth={1.8} />
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
              <div className="text-[11px] font-semibold uppercase tracking-wide text-blue-700">Company code — share with your merchant banker</div>
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
