import { getContext } from "@/lib/server/context";
import { EmptyState, PageHeader } from "@/components/shared/ui";
import ValuationStudio from "@/components/valuation/ValuationStudio";

export const dynamic = "force-dynamic";

export default function ValuationPage() {
  const { company } = getContext();
  if (!company) {
    return (
      <>
        <PageHeader title="Valuation & Peer Benchmarking Studio" />
        <EmptyState title="No company yet" message="Create your profile with financials — then compare your proposed valuation against peers you enter here." />
      </>
    );
  }
  const latest = company.financials.filter((f) => f.revenueCr != null).at(-1) ?? null;
  return (
    <>
      <PageHeader
        title="Valuation & Peer Benchmarking Studio"
        subtitle="Decision support for your Basis for Issue Price — never investment advice. Peer benchmarking requires peer data you enter below (or a market-data integration in production); no pre-seeded peers are used."
      />
      <ValuationStudio
        companyName={company.name}
        latest={latest ? { revenueCr: latest.revenueCr, patCr: latest.patCr, ebitdaCr: latest.ebitdaCr, netWorthCr: latest.netWorthCr, borrowingsCr: latest.borrowingsCr } : null}
        issueSizeCr={company.issueSizeCr}
      />
    </>
  );
}
