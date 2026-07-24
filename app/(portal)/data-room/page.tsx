import { getContext } from "@/lib/server/context";
import { EmptyState, PageHeader } from "@/components/shared/ui";
import DataRoom from "@/components/documents/DataRoom";
import Tr from "@/components/i18n/Tr";

export const dynamic = "force-dynamic";

export default async function DataRoomPage() {
  const { company, docs } = await getContext();
  if (!company) {
    return (
      <>
        <PageHeader title={<Tr id="dataroom.title" />} />
        <EmptyState title={<Tr id="common.noCompany" />} message={<Tr id="dataroom.emptyMsg" />} />
      </>
    );
  }
  return (
    <>
      <PageHeader
        title={<Tr id="dataroom.title" />}
        subtitle={<Tr id="dataroom.subtitle" />}
      />
      <DataRoom docs={docs} />
    </>
  );
}
