import { getContext } from "@/lib/server/context";
import { Building2 } from "lucide-react";
import OnboardingForm from "@/components/onboarding/OnboardingForm";
import Tr from "@/components/i18n/Tr";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const { company } = await getContext();
  return (
    <>
      <div className="flex items-center gap-4 mb-6">
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-blue-600 to-sky-500 shadow-lg shadow-blue-500/30">
          <Building2 size={24} strokeWidth={1.8} className="text-white" />
        </span>
        <div>
          <h1 className="text-3xl font-bold font-serif tracking-tight text-[#1e3a5f]"><Tr id="onboarding.title" /></h1>
          <p className="text-sm text-slate-500 mt-0.5 max-w-3xl">
            <Tr id="onboarding.subtitle" />
          </p>
        </div>
      </div>
      <OnboardingForm existing={company} />
    </>
  );
}
