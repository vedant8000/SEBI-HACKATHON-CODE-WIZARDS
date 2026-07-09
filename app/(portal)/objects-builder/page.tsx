import { getContext } from "@/lib/server/context";
import { EmptyState, PageHeader } from "@/components/shared/ui";
import ObjectsForm from "@/components/objects/ObjectsForm";

export const dynamic = "force-dynamic";

export default function ObjectsBuilderPage() {
  const { company, objects, docs } = getContext();
  if (!company) {
    return (
      <>
        <PageHeader title="Objects of Issue Builder" />
        <EmptyState title="No company yet" message="Create your profile first — then build your fund utilisation plan here. It's the most scrutinised part of an SME offer document." />
      </>
    );
  }
  const evidenceDocs = docs.filter((d) => d.category === "Objects Evidence").map((d) => d.fileName);
  return (
    <>
      <PageHeader
        title="Objects of Issue Builder"
        subtitle="Plan how you'll use the money you raise, in plain terms. The builder warns you when an object lacks evidence, when general corporate purposes runs too high, and when repayment touches promoter-group debt."
      />
      <ObjectsForm existing={objects} freshIssueCr={company.freshIssueCr} evidenceDocs={evidenceDocs} />
    </>
  );
}
