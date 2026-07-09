import { getContext } from "@/lib/server/context";
import { PageHeader } from "@/components/shared/ui";
import OnboardingForm from "@/components/onboarding/OnboardingForm";

export const dynamic = "force-dynamic";

export default function OnboardingPage() {
  const { company } = getContext();
  return (
    <>
      <PageHeader
        title="Company Profile"
        subtitle="Tell us about your company in plain language — every field explains why it's needed. You can start with what you know and come back anytime; uploaded documents will cross-check and fill in what they can."
      />
      <OnboardingForm existing={company} />
    </>
  );
}
