import { getContext } from "@/lib/server/context";
import { Building2 } from "lucide-react";
import OnboardingForm from "@/components/onboarding/OnboardingForm";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const { company } = await getContext();
  return (
    <>
      <div className="flex items-center gap-4 mb-6">
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-white border border-slate-200 shadow-sm text-[#1e3a5f]">
          <Building2 size={24} strokeWidth={1.8} />
        </span>
        <div>
          <h1 className="text-3xl font-bold font-serif tracking-tight text-[#1e3a5f]">Company Profile</h1>
          <p className="text-sm text-slate-500 mt-0.5 max-w-3xl">
            Tell us about your company in key fields. We&rsquo;ll use this to build a strong, compliant draft.
          </p>
        </div>
      </div>
      <OnboardingForm existing={company} />
    </>
  );
}
