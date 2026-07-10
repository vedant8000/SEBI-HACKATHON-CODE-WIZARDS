import { getContext } from "@/lib/server/context";
import { EmptyState, PageHeader } from "@/components/shared/ui";
import DataRoom from "@/components/documents/DataRoom";

export const dynamic = "force-dynamic";

export default function DataRoomPage() {
  const { company, docs } = getContext();
  if (!company) {
    return (
      <>
        <PageHeader title="Smart Data Room" />
        <EmptyState title="No company yet" message="Create your company profile first — then upload your documents here." />
      </>
    );
  }
  return (
    <>
      <PageHeader
        title="Upload & Data Room"
        subtitle="Upload any IPO-related documents you currently have. IPO Saathi will classify them, extract facts, generate available sections, and show what is missing. Nothing is mandatory — start with what you have."
      />
      <DataRoom docs={docs} />
    </>
  );
}
