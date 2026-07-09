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
        title="Smart Data Room"
        subtitle="Upload the documents you have — PDFs and text files are read and classified automatically; scanned copies are accepted too (you can fill in key details manually). Every document becomes evidence that your draft can cite."
      />
      <DataRoom docs={docs} />
    </>
  );
}
