"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Company, FinancialYear } from "@/lib/types";
import { Card } from "@/components/shared/ui";

const emptyFy = (fy: string): FinancialYear => ({
  fy, revenueCr: null, patCr: null, ebitdaCr: null, netWorthCr: null,
  borrowingsCr: null, receivablesCr: null, cfoCr: null,
});

const currentFy = new Date().getFullYear() + (new Date().getMonth() >= 3 ? 0 : -1);
const defaultYears = [currentFy - 2, currentFy - 1, currentFy].map((y) => emptyFy(`FY${y}`));

function Field({
  label, help, children,
}: { label: string; help?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[13px] font-medium text-slate-700">{label}</span>
      {help && <span className="block text-[11px] text-slate-400 mb-1">{help}</span>}
      {children}
    </label>
  );
}

const inputCls =
  "mt-1 w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white";

export default function OnboardingForm({ existing }: { existing: Company | null }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [f, setF] = useState({
    name: existing?.name ?? "",
    cin: existing?.cin ?? "",
    industry: existing?.industry ?? "",
    city: existing?.city ?? "",
    state: existing?.state ?? "",
    yearOfIncorporation: existing?.yearOfIncorporation?.toString() ?? "",
    promoterName: existing?.promoterName ?? "",
    promoterExperienceYears: existing?.promoterExperienceYears?.toString() ?? "",
    issueSizeCr: existing?.issueSizeCr?.toString() ?? "",
    freshIssueCr: existing?.freshIssueCr?.toString() ?? "",
    ofsCr: existing?.ofsCr?.toString() ?? "",
    proposedListingExchange: existing?.proposedListingExchange ?? "NSE Emerge / BSE SME",
    top3CustomerPct: existing?.top3CustomerPct?.toString() ?? "",
    independentDirectorsAppointed: existing?.independentDirectorsAppointed,
    auditCommitteeConstituted: existing?.auditCommitteeConstituted,
    pendingLitigationNote: existing?.pendingLitigationNote ?? "",
  });
  const [fin, setFin] = useState<FinancialYear[]>(
    existing?.financials?.length ? existing.financials : defaultYears
  );

  const setFinVal = (i: number, key: keyof FinancialYear, v: string) =>
    setFin((prev) => prev.map((row, j) => (j === i ? { ...row, [key]: v === "" ? null : key === "fy" ? v : Number(v) } : row)));

  const submit = async () => {
    setSaving(true);
    try {
      const payload = {
        ...f,
        independentDirectorsAppointed: f.independentDirectorsAppointed,
        auditCommitteeConstituted: f.auditCommitteeConstituted,
        financials: fin,
      };
      if (existing) {
        await fetch("/api/companies", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: existing.id,
            updates: {
              ...payload,
              yearOfIncorporation: f.yearOfIncorporation ? Number(f.yearOfIncorporation) : null,
              promoterExperienceYears: f.promoterExperienceYears ? Number(f.promoterExperienceYears) : null,
              issueSizeCr: f.issueSizeCr ? Number(f.issueSizeCr) : null,
              freshIssueCr: f.freshIssueCr ? Number(f.freshIssueCr) : null,
              ofsCr: f.ofsCr ? Number(f.ofsCr) : null,
              top3CustomerPct: f.top3CustomerPct ? Number(f.top3CustomerPct) : null,
            },
          }),
        });
      } else {
        await fetch("/api/companies", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      await fetch("/api/analysis", { method: "POST" });
      setSaved(true);
      router.refresh();
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  };

  const triState = (val: boolean | null | undefined, set: (v: boolean | null) => void) => (
    <div className="mt-1 flex gap-2">
      {[["Yes", true], ["No", false], ["Not sure yet", null]].map(([label, v]) => (
        <button
          key={String(label)}
          type="button"
          onClick={() => set(v as boolean | null)}
          className={`px-3 py-1.5 text-xs rounded-lg border ${val === v ? "bg-blue-600 text-white border-blue-600" : "border-slate-300 text-slate-600 hover:bg-slate-50"}`}
        >
          {label as string}
        </button>
      ))}
    </div>
  );

  return (
    <div className="space-y-5 max-w-4xl">
      <Card className="p-5">
        <h3 className="text-sm font-semibold text-slate-800 mb-4">1 · Basic details</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Company name" help="As per your Certificate of Incorporation">
            <input className={inputCls} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="e.g. Shakti Precision Components Private Limited" />
          </Field>
          <Field label="CIN" help="21-character number on your incorporation certificate — we'll verify it against uploads">
            <input className={inputCls} value={f.cin} onChange={(e) => setF({ ...f, cin: e.target.value })} placeholder="U12345GJ2014PTC012345" />
          </Field>
          <Field label="Industry / what the business does" help="In your own words — e.g. 'auto components manufacturing'">
            <input className={inputCls} value={f.industry} onChange={(e) => setF({ ...f, industry: e.target.value })} />
          </Field>
          <Field label="Year of incorporation" help="SME platforms generally expect a 3-year track record">
            <input className={inputCls} type="number" value={f.yearOfIncorporation} onChange={(e) => setF({ ...f, yearOfIncorporation: e.target.value })} />
          </Field>
          <Field label="City"><input className={inputCls} value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} /></Field>
          <Field label="State"><input className={inputCls} value={f.state} onChange={(e) => setF({ ...f, state: e.target.value })} /></Field>
          <Field label="Promoter name" help="We use this to detect related-party entities with matching family names">
            <input className={inputCls} value={f.promoterName} onChange={(e) => setF({ ...f, promoterName: e.target.value })} />
          </Field>
          <Field label="Promoter's years of experience in this business">
            <input className={inputCls} type="number" value={f.promoterExperienceYears} onChange={(e) => setF({ ...f, promoterExperienceYears: e.target.value })} />
          </Field>
        </div>
      </Card>

      <Card className="p-5">
        <h3 className="text-sm font-semibold text-slate-800 mb-1">2 · The issue you're planning</h3>
        <p className="text-xs text-slate-400 mb-4">Rough numbers are fine to start — your merchant banker will finalise them.</p>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Field label="Total issue size (₹ Cr)"><input className={inputCls} type="number" value={f.issueSizeCr} onChange={(e) => setF({ ...f, issueSizeCr: e.target.value })} /></Field>
          <Field label="Fresh issue (₹ Cr)" help="New money coming into the company"><input className={inputCls} type="number" value={f.freshIssueCr} onChange={(e) => setF({ ...f, freshIssueCr: e.target.value })} /></Field>
          <Field label="Offer for sale (₹ Cr)" help="Promoter selling existing shares"><input className={inputCls} type="number" value={f.ofsCr} onChange={(e) => setF({ ...f, ofsCr: e.target.value })} /></Field>
          <Field label="Target exchange">
            <select className={inputCls} value={f.proposedListingExchange} onChange={(e) => setF({ ...f, proposedListingExchange: e.target.value })}>
              <option>NSE Emerge / BSE SME</option><option>NSE Emerge</option><option>BSE SME</option>
            </select>
          </Field>
        </div>
      </Card>

      <Card className="p-5">
        <h3 className="text-sm font-semibold text-slate-800 mb-1">3 · Three-year financial snapshot (₹ crore)</h3>
        <p className="text-xs text-slate-400 mb-4">
          Enter what you know — when you upload audited financials we cross-check these numbers and flag differences.
          Leave blank if unsure.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead>
              <tr className="text-left text-xs text-slate-500">
                <th className="py-2 pr-2">Year</th><th className="pr-2">Revenue</th><th className="pr-2">EBITDA</th>
                <th className="pr-2">PAT</th><th className="pr-2">Net worth</th><th className="pr-2">Borrowings</th>
                <th className="pr-2">Receivables</th><th className="pr-2">Cash from ops</th>
              </tr>
            </thead>
            <tbody>
              {fin.map((row, i) => (
                <tr key={i} className="border-t border-slate-100">
                  <td className="py-2 pr-2"><input className={`${inputCls} !mt-0 w-24`} value={row.fy} onChange={(e) => setFinVal(i, "fy", e.target.value)} /></td>
                  {(["revenueCr", "ebitdaCr", "patCr", "netWorthCr", "borrowingsCr", "receivablesCr", "cfoCr"] as const).map((k) => (
                    <td key={k} className="pr-2">
                      <input className={`${inputCls} !mt-0 w-20`} type="number" value={row[k] ?? ""} onChange={(e) => setFinVal(i, k, e.target.value)} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="p-5">
        <h3 className="text-sm font-semibold text-slate-800 mb-4">4 · Governance & honesty checks</h3>
        <div className="grid md:grid-cols-2 gap-5">
          <Field label="Have you appointed independent directors?" help="Required for listing — 'No' or 'Not sure' creates a tracked gap, which is fine at this stage">
            {triState(f.independentDirectorsAppointed, (v) => setF({ ...f, independentDirectorsAppointed: v }))}
          </Field>
          <Field label="Is an audit committee constituted?">
            {triState(f.auditCommitteeConstituted, (v) => setF({ ...f, auditCommitteeConstituted: v }))}
          </Field>
          <Field label="Top 3 customers — % of revenue" help="Above 40% is a disclosure-worthy concentration; better to surface it now">
            <input className={inputCls} type="number" value={f.top3CustomerPct} onChange={(e) => setF({ ...f, top3CustomerPct: e.target.value })} placeholder="e.g. 48" />
          </Field>
          <Field label="Any pending cases, notices or demands you know of?" help="Tax notices count too. Declaring them early avoids the most damaging kind of inconsistency later.">
            <textarea className={inputCls} rows={2} value={f.pendingLitigationNote} onChange={(e) => setF({ ...f, pendingLitigationNote: e.target.value })} placeholder="e.g. GST demand notice of ₹18 lakh for FY2024, reply filed" />
          </Field>
        </div>
      </Card>

      <div className="flex items-center gap-3">
        <button
          onClick={submit}
          disabled={saving || !f.name}
          className="px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? "Saving & analysing…" : existing ? "Save & Re-analyse" : "Create Company & Analyse"}
        </button>
        {saved && <span className="text-sm text-emerald-600 font-medium">Saved — analysis updated ✓</span>}
        {!f.name && <span className="text-xs text-slate-400">Company name is required to save.</span>}
      </div>
    </div>
  );
}
