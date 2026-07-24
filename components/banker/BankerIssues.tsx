"use client";

import { useState } from "react";
import type { CoverageRow, FactConflict, FinancialCheck, Gap, RptRisk } from "@/lib/types";
import { Badge, Card, SeverityBadge } from "@/components/shared/ui";
import FlagForm from "./FlagForm";

const TABS = ["Missing Data & Gaps", "Inconsistencies", "RPT Risks", "Blocked Sections"] as const;

/**
 * Everything the rule engine found wrong or missing in the promoter's filing,
 * each item with a "Flag for correction" composer so the banker can pinpoint
 * exactly what the promoter must fix before the DRHP can proceed.
 */
export default function BankerIssues({
  companyId, gaps, financialChecks, conflicts, rptRisks, coverage,
}: {
  companyId: string;
  gaps: Gap[];
  financialChecks: FinancialCheck[];
  conflicts: FactConflict[];
  rptRisks: RptRisk[];
  coverage: CoverageRow[];
}) {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Missing Data & Gaps");

  const order = { Critical: 0, High: 1, Medium: 2, Low: 3 } as const;
  const openGaps = gaps.filter((g) => g.status !== "Resolved").sort((a, b) => order[a.severity] - order[b.severity]);
  const finIssues = financialChecks.filter((c) => c.severity !== "Low").sort((a, b) => order[a.severity] - order[b.severity]);
  const openConflicts = conflicts.filter((c) => c.status === "OPEN");
  const blocked = coverage.filter((c) => c.canGenerate === "NO" || c.riskLevel === "Critical Issue");

  const counts: Record<(typeof TABS)[number], number> = {
    "Missing Data & Gaps": openGaps.length,
    Inconsistencies: finIssues.length + openConflicts.length,
    "RPT Risks": rptRisks.length,
    "Blocked Sections": blocked.length,
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-1.5 mb-5 border-b border-slate-200 pb-3">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3.5 py-1.5 text-[13px] font-medium rounded-full transition-all ${
              tab === t ? "bg-gradient-to-r from-blue-600 to-sky-500 text-white shadow-sm shadow-blue-600/30" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {t}
            {counts[t] > 0 && <span className={`ml-1.5 text-[10px] px-1.5 rounded-full ${tab === t ? "bg-white/20" : "bg-slate-200 text-slate-600"}`}>{counts[t]}</span>}
          </button>
        ))}
      </div>

      {tab === "Missing Data & Gaps" && (
        <div className="space-y-3">
          {openGaps.length === 0 && <Card className="p-8 text-center text-sm text-slate-400">No open gaps — the filing record is complete as per the rule engine.</Card>}
          {openGaps.map((g) => (
            <Card key={g.id} className="p-5">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <SeverityBadge severity={g.severity} />
                <h3 className="text-sm font-semibold text-slate-800">{g.title}</h3>
                <span className="text-xs text-slate-400">· {g.affectedSection}</span>
                <span className="ml-auto"><Badge tone="blue">Owner: {g.owner}</Badge></span>
              </div>
              <p className="text-sm text-slate-600">{g.explanation}</p>
              <div className="grid md:grid-cols-2 gap-3 mt-3 text-[13px]">
                <div className="bg-slate-50 rounded-lg px-3 py-2"><span className="font-medium text-slate-700">Required:</span> <span className="text-slate-600">{g.requiredDocument}</span></div>
                <div className="bg-blue-50 rounded-lg px-3 py-2"><span className="font-medium text-blue-800">Suggested fix:</span> <span className="text-blue-900">{g.suggestedFix}</span></div>
              </div>
              <div className="mt-3">
                <FlagForm companyId={companyId} targetType="gap" targetId={g.id} targetLabel={g.title} />
              </div>
            </Card>
          ))}
        </div>
      )}

      {tab === "Inconsistencies" && (
        <div className="space-y-3">
          {finIssues.length === 0 && openConflicts.length === 0 && (
            <Card className="p-8 text-center text-sm text-slate-400">No cross-document inconsistencies detected in the current record.</Card>
          )}
          {openConflicts.map((c) => (
            <Card key={c.id} className="p-5 border-red-200">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <SeverityBadge severity={c.severity} />
                <h3 className="text-sm font-semibold text-slate-800">Fact conflict: {c.factKey}</h3>
              </div>
              <p className="text-sm text-slate-600">{c.explanation}</p>
              <div className="grid md:grid-cols-2 gap-3 mt-2 text-[13px]">
                <div className="bg-red-50 rounded-lg px-3 py-2"><span className="text-slate-500">Value A:</span> <span className="font-medium">{c.valueA}</span> <span className="text-slate-400">({c.sourceA})</span></div>
                <div className="bg-red-50 rounded-lg px-3 py-2"><span className="text-slate-500">Value B:</span> <span className="font-medium">{c.valueB}</span> <span className="text-slate-400">({c.sourceB})</span></div>
              </div>
              <div className="mt-3">
                <FlagForm companyId={companyId} targetType="general" targetId={c.id} targetLabel={`Fact conflict: ${c.factKey}`} />
              </div>
            </Card>
          ))}
          {finIssues.map((c) => (
            <Card key={c.id} className="p-5">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <SeverityBadge severity={c.severity} />
                <h3 className="text-sm font-semibold text-slate-800">{c.checkName}</h3>
              </div>
              <div className="grid md:grid-cols-3 gap-3 text-[13px] mb-2">
                <div className="bg-slate-50 rounded-lg px-3 py-2"><div className="text-slate-400 text-xs">Expected</div><div className="font-medium text-slate-700">{c.expectedValue}</div></div>
                <div className="bg-slate-50 rounded-lg px-3 py-2"><div className="text-slate-400 text-xs">Found</div><div className="font-medium text-slate-700">{c.foundValue}</div></div>
                <div className="bg-red-50 rounded-lg px-3 py-2"><div className="text-slate-400 text-xs">Difference</div><div className="font-medium text-red-700">{c.difference}</div></div>
              </div>
              <p className="text-sm text-slate-600">{c.explanation}</p>
              <div className="mt-3">
                <FlagForm companyId={companyId} targetType="general" targetId={c.id} targetLabel={c.checkName} />
              </div>
            </Card>
          ))}
        </div>
      )}

      {tab === "RPT Risks" && (
        <div className="space-y-3">
          {rptRisks.length === 0 && <Card className="p-8 text-center text-sm text-slate-400">No related-party signals detected in the current uploads.</Card>}
          {rptRisks.map((r) => (
            <Card key={r.id} className="p-5">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <SeverityBadge severity={r.severity} />
                <h3 className="text-sm font-semibold text-slate-800">{r.entityName}</h3>
                <span className="text-xs text-slate-500">· {r.relationship}</span>
                <span className="ml-auto text-sm font-semibold text-slate-700">{r.riskScore}/100</span>
              </div>
              <p className="text-sm text-slate-600">{r.reason}</p>
              <div className="grid md:grid-cols-2 gap-3 mt-2 text-[13px]">
                <div className="bg-blue-50 rounded-lg px-3 py-2"><span className="font-medium text-blue-800">Required disclosure:</span> <span className="text-blue-900">{r.suggestedDisclosure}</span></div>
                <div className="bg-amber-50 rounded-lg px-3 py-2"><span className="font-medium text-amber-800">Required evidence:</span> <span className="text-amber-900">{r.requiredEvidence}</span></div>
              </div>
              <div className="mt-3">
                <FlagForm companyId={companyId} targetType="general" targetId={r.id} targetLabel={`RPT: ${r.entityName}`} />
              </div>
            </Card>
          ))}
        </div>
      )}

      {tab === "Blocked Sections" && (
        <div className="space-y-3">
          {blocked.length === 0 && <Card className="p-8 text-center text-sm text-slate-400">No prospectus section is currently blocked for lack of data.</Card>}
          {blocked.map((c) => (
            <Card key={c.sectionId} className="p-5">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <Badge tone={c.riskLevel === "Critical Issue" ? "red" : "grey"}>{c.riskLevel}</Badge>
                <h3 className="text-sm font-semibold text-slate-800">{c.sectionName}</h3>
                <span className="text-xs text-slate-400">· {c.parentSection} · {c.completionPct}% covered</span>
              </div>
              {c.missingFacts.length > 0 && (
                <div className="text-[13px] text-slate-600">
                  <span className="font-medium text-slate-700">Missing:</span> {c.missingFacts.slice(0, 6).join("; ")}
                  {c.missingFacts.length > 6 ? ` (+${c.missingFacts.length - 6} more)` : ""}
                </div>
              )}
              <div className="mt-3">
                <FlagForm companyId={companyId} targetType="section" targetId={c.sectionId} targetLabel={c.sectionName} />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
