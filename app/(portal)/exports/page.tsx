import { getContext } from "@/lib/server/context";
import { Card, EmptyState, PageHeader } from "@/components/shared/ui";
import { Download, FileText, ListChecks, Package, UserCheck } from "lucide-react";

export const dynamic = "force-dynamic";

const items = [
  { href: "/api/export/draft", icon: FileText, title: "Draft Offer Document", desc: "Full blueprint-ordered draft with source notes, placeholders and review status. Printable HTML → Save as PDF.", newTab: true },
  { href: "/api/export/gap-report", icon: ListChecks, title: "Gap Report (CSV)", desc: "Every open gap with severity, affected section, owner and suggested fix." },
  { href: "/api/export/evidence", icon: Package, title: "Evidence Pack (JSON)", desc: "All documents, extracted facts with page-level provenance, draft sections and rule results — for due diligence." },
  { href: "/api/export/readiness", icon: UserCheck, title: "Merchant Banker Review Pack", desc: "Readiness report with rule-by-rule results, category scores and open gaps. Printable HTML → Save as PDF.", newTab: true },
];

export default function ExportsPage() {
  const { company, draft, facts } = getContext();
  if (!company) {
    return (
      <>
        <PageHeader title="Export Center" />
        <EmptyState title="Nothing to export yet" message="Create a company and upload documents — all exports are generated live from your data." />
      </>
    );
  }
  return (
    <>
      <PageHeader
        title="Export Center"
        subtitle={`All exports are generated live from ${company.name}'s data — ${facts.length} extracted facts, ${draft.length} draft sections. Every export carries the AI-assisted-draft disclaimer.`}
      />
      <div className="grid md:grid-cols-2 gap-4 max-w-4xl">
        {items.map(({ href, icon: Icon, title, desc, newTab }) => (
          <a key={href} href={href} target={newTab ? "_blank" : undefined}
            className="block bg-white border border-slate-200 rounded-xl p-5 hover:shadow-md hover:border-blue-300 transition-all">
            <div className="flex items-center gap-3 mb-2">
              <span className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center">
                <Icon size={17} className="text-blue-600" />
              </span>
              <span className="font-medium text-slate-900 text-sm">{title}</span>
              <Download size={14} className="ml-auto text-slate-300" />
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
          </a>
        ))}
      </div>
      <Card className="p-4 mt-6 max-w-4xl border-amber-200 bg-amber-50">
        <p className="text-xs text-amber-800">
          Exported drafts are SME-framework-aligned working documents for authorised intermediary review. They are not
          filings, and must not be used to invite subscription or represented as SEBI-approved.
        </p>
      </Card>
    </>
  );
}
