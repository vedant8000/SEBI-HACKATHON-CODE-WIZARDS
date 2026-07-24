"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { ObjectOfIssue } from "@/lib/types";
import { Card } from "@/components/shared/ui";

const CATEGORIES = [
  "Machinery purchase (capex)", "Working capital", "Debt repayment",
  "Issue expenses", "General corporate purposes", "Building / civil works",
  "Technology / software", "Marketing & branding", "Other",
];

const inputCls = "px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white w-full";

export default function ObjectsForm({
  existing, freshIssueCr, evidenceDocs,
}: { existing: ObjectOfIssue[]; freshIssueCr: number | null; evidenceDocs: string[] }) {
  const router = useRouter();
  const [rows, setRows] = useState<ObjectOfIssue[]>(
    existing.length ? existing : [{ id: "", category: "Machinery purchase (capex)", amountCr: 0, evidence: "", warning: null, deploymentTimeline: "" }]
  );
  const [relatedPartyRepayment, setRpr] = useState(existing.some((o) => /promoter|related/i.test(o.warning ?? "")));
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");

  const total = rows.reduce((s, r) => s + (Number(r.amountCr) || 0), 0);
  const gcp = rows.filter((r) => /general corporate/i.test(r.category)).reduce((s, r) => s + (Number(r.amountCr) || 0), 0);

  const warnings: string[] = [];
  if (freshIssueCr != null && Math.abs(total - freshIssueCr) > 0.01)
    warnings.push(`Objects total ₹${total.toFixed(1)} Cr ≠ fresh issue ₹${freshIssueCr} Cr — reconcile before drafting.`);
  if (total > 0 && gcp / total > 0.25)
    warnings.push(`General corporate purposes is ${Math.round((gcp / total) * 100)}% of the plan — above the typical 25% ceiling.`);
  if (relatedPartyRepayment)
    warnings.push("Debt repayment includes promoter/related-party loans — regulatory & legal review required; expect prominent disclosure.");
  rows.forEach((r) => {
    if (/capex|machin/i.test(r.category) && !r.evidence) warnings.push(`"${r.category}" has no supporting quotation — upload one in the Data Room.`);
    if (/working capital/i.test(r.category) && !r.evidence) warnings.push("Working capital object should reference a detailed computation.");
    if (r.amountCr > 0 && !r.deploymentTimeline) warnings.push(`"${r.category}": add a deployment timeline (e.g. "FY2027 H1").`);
  });

  const save = async () => {
    setSaving(true);
    try {
      await fetch("/api/objects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ objects: rows, relatedPartyRepayment }),
      });
      setSavedMsg("Saved — analysis and draft inputs updated ✓");
      router.refresh();
      setTimeout(() => setSavedMsg(""), 2500);
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-5 max-w-5xl">
      <Card className="p-5">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[820px]">
            <thead>
              <tr className="text-left text-xs text-slate-500">
                <th className="py-2 pr-2 w-56">Purpose</th>
                <th className="pr-2 w-28">Amount (₹ Cr)</th>
                <th className="pr-2">Supporting evidence</th>
                <th className="pr-2 w-40">Deployment timeline</th>
                <th className="w-8"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-t border-slate-100">
                  <td className="py-2 pr-2">
                    <select className={inputCls} value={r.category} onChange={(e) => setRows(rows.map((x, j) => j === i ? { ...x, category: e.target.value } : x))}>
                      {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                    </select>
                  </td>
                  <td className="pr-2">
                    <input className={inputCls} type="number" value={r.amountCr || ""} onChange={(e) => setRows(rows.map((x, j) => j === i ? { ...x, amountCr: Number(e.target.value) } : x))} />
                  </td>
                  <td className="pr-2">
                    <input className={inputCls} list="evidence-docs" placeholder="e.g. Machinery Quotation.pdf" value={r.evidence} onChange={(e) => setRows(rows.map((x, j) => j === i ? { ...x, evidence: e.target.value } : x))} />
                  </td>
                  <td className="pr-2">
                    <input className={inputCls} placeholder="e.g. FY2027 H1" value={r.deploymentTimeline} onChange={(e) => setRows(rows.map((x, j) => j === i ? { ...x, deploymentTimeline: e.target.value } : x))} />
                  </td>
                  <td>
                    <button onClick={() => setRows(rows.filter((_, j) => j !== i))} className="text-slate-300 hover:text-red-500"><Trash2 size={15} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <datalist id="evidence-docs">{evidenceDocs.map((d) => <option key={d} value={d} />)}</datalist>
        </div>
        <div className="flex flex-wrap items-center gap-4 mt-4">
          <button onClick={() => setRows([...rows, { id: "", category: "Other", amountCr: 0, evidence: "", warning: null, deploymentTimeline: "" }])}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs border border-slate-300 rounded-lg hover:bg-slate-50"><Plus size={13} /> Add object</button>
          <label className="flex items-center gap-2 text-[13px] text-slate-600">
            <input type="checkbox" checked={relatedPartyRepayment} onChange={(e) => setRpr(e.target.checked)} className="rounded" />
            Debt repayment includes loans from promoter / promoter group
          </label>
          <div className="ml-auto text-sm">
            <span className="text-slate-500">Total:</span>{" "}
            <span className={`font-semibold ${freshIssueCr != null && Math.abs(total - freshIssueCr) > 0.01 ? "text-red-600" : "text-slate-800"}`}>₹{total.toFixed(1)} Cr</span>
            {freshIssueCr != null && <span className="text-slate-400"> / fresh issue ₹{freshIssueCr} Cr</span>}
          </div>
        </div>
      </Card>

      {warnings.length > 0 && (
        <Card className="p-4 border-amber-300 bg-amber-50">
          <h4 className="text-xs font-semibold text-amber-800 mb-1.5">WARNINGS ({warnings.length})</h4>
          <ul className="text-[13px] text-amber-900 space-y-1">{warnings.map((w, i) => <li key={i}>⚠ {w}</li>)}</ul>
        </Card>
      )}

      {/* Live preview table */}
      <Card className="p-5">
        <h3 className="text-sm font-semibold text-slate-800 mb-3">Objects of the Issue — preview</h3>
        <table className="w-full text-sm">
          <thead><tr className="text-left text-xs text-slate-500 border-b border-slate-200"><th className="py-2">Object</th><th>Amount (₹ Cr)</th><th>% of total</th><th>Timeline</th><th>Evidence</th></tr></thead>
          <tbody>
            {rows.filter((r) => r.amountCr > 0).map((r, i) => (
              <tr key={i} className="border-b border-slate-100">
                <td className="py-2 text-slate-700">{r.category}</td>
                <td className="font-medium">₹{r.amountCr}</td>
                <td>{total ? Math.round((r.amountCr / total) * 100) : 0}%</td>
                <td className="text-slate-500">{r.deploymentTimeline || "—"}</td>
                <td className="text-slate-500 text-xs">{r.evidence || <span className="text-amber-600">no evidence</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-xs text-slate-400 mt-3">Means of finance: fresh issue proceeds. Any shortfall must be met from internal accruals — discuss with your merchant banker.</p>
      </Card>

      <div className="flex items-center gap-3">
        <button onClick={save} disabled={saving} className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-sky-500 text-white text-sm font-medium rounded-lg shadow-sm shadow-blue-600/30 hover:shadow-md transition-shadow disabled:opacity-50">
          {saving ? "Saving…" : "Save Objects & Re-analyse"}
        </button>
        {savedMsg && <span className="text-sm text-emerald-600 font-medium">{savedMsg}</span>}
      </div>
    </div>
  );
}
