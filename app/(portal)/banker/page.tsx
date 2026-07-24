import Link from "next/link";
import { getSessionUser } from "@/lib/auth/session";
import { getBankerContext } from "@/lib/server/banker-context";
import { Badge, Card, PageHeader, ScoreDonut, StatCard } from "@/components/shared/ui";
import LinkCompanyForm from "@/components/banker/LinkCompanyForm";
import FlagsPanel from "@/components/banker/FlagsPanel";

export const dynamic = "force-dynamic";

export default async function BankerOverviewPage() {
  const user = await getSessionUser();
  const ctx = await getBankerContext(user!.email);

  if (!ctx.company) {
    return (
      <>
        <PageHeader
          title="Merchant Banker Workspace"
          subtitle="Review an SME's IPO filing: their uploaded documents, extracted facts, gaps, inconsistencies and draft — and pinpoint exactly what must be corrected before the DRHP can proceed."
        />
        <LinkCompanyForm />
      </>
    );
  }

  const { company, analysis, docs, facts, draft, flags, coverage } = ctx;
  const gaps = (analysis?.gaps ?? []).filter((g) => g.status !== "Resolved");
  const critical = gaps.filter((g) => g.severity === "Critical").length;
  const high = gaps.filter((g) => g.severity === "High").length;
  const openFlags = flags.filter((f) => f.status === "OPEN");
  const approved = draft.filter((s) => s.status === "Approved").length;
  const avgCoverage = coverage.length ? Math.round(coverage.reduce((s, c) => s + c.completionPct, 0) / coverage.length) : 0;

  return (
    <>
      <PageHeader
        title={`Reviewing: ${company.name}`}
        subtitle={`Everything below is computed from the promoter's own uploads and profile. Inspect the filing documents, pinpoint corrections, and review the draft section-by-section.${ctx.linkedCompanies.length > 1 ? ` (You are linked to ${ctx.linkedCompanies.length} companies — the first is shown.)` : ""}`}
        actions={<Badge tone="navy">Code {company.companyCode ?? "—"}</Badge>}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <Card className="p-4 flex items-center gap-4 col-span-2">
          <ScoreDonut score={analysis?.scores.overall ?? 0} />
          <div>
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">IPO Readiness</div>
            <div className="text-sm text-slate-700 mt-1 max-w-[240px]">{analysis?.scores.statusLine ?? "Analysis not run yet — ask the promoter to complete setup."}</div>
          </div>
        </Card>
        <StatCard label="Critical / High Gaps" value={`${critical} / ${high}`} tone={critical ? "bad" : high ? "warn" : "good"} sub="Open items blocking the filing" />
        <StatCard label="Your Open Flags" value={openFlags.length} tone={openFlags.length ? "warn" : "good"} sub="Corrections awaiting the promoter" />
        <StatCard label="Documents Filed" value={docs.length} sub={`${facts.length} facts extracted`} />
        <StatCard label="Draft Coverage" value={`${avgCoverage}%`} sub={`${approved}/${draft.length || 0} sections approved`} />
      </div>

      <div className="grid md:grid-cols-3 gap-3 mb-6">
        <Link href="/banker/documents" className="block">
          <Card className="p-4 h-full hover:border-blue-300">
            <div className="text-sm font-semibold text-slate-800">1 · Inspect Filing Documents →</div>
            <p className="text-xs text-slate-500 mt-1">Every document the promoter uploaded, with extraction results and the original file.</p>
          </Card>
        </Link>
        <Link href="/banker/issues" className="block">
          <Card className="p-4 h-full hover:border-amber-300">
            <div className="text-sm font-semibold text-slate-800">2 · Pinpoint Issues & Corrections →</div>
            <p className="text-xs text-slate-500 mt-1">Missing data, inconsistencies and RPT risks — flag exactly what the promoter must fix.</p>
          </Card>
        </Link>
        <Link href="/banker/draft-review" className="block">
          <Card className="p-4 h-full hover:border-violet-300">
            <div className="text-sm font-semibold text-slate-800">3 · Review the Draft →</div>
            <p className="text-xs text-slate-500 mt-1">Approve or request changes on each drafted section, with full audit trail.</p>
          </Card>
        </Link>
      </div>

      <h3 className="text-sm font-semibold text-slate-800 mb-2">Your correction flags</h3>
      <FlagsPanel flags={flags} />

      <Card className="p-4 mt-6">
        <h3 className="text-sm font-semibold text-slate-800 mb-2">Link another company</h3>
        <LinkCompanyForm compact />
      </Card>
    </>
  );
}
