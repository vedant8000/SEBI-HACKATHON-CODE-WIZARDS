"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { ObjectOfIssue } from "@/lib/types";
import { Card } from "@/components/shared/ui";
import { useT } from "@/components/i18n/LanguageProvider";

// Category values are stored on each object and drive rule logic (regex on the
// English text), so they stay in English — like the exchange options elsewhere.
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
  const t = useT();
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
    warnings.push(t("obj.wMismatch", { total: total.toFixed(1), fresh: freshIssueCr }));
  if (total > 0 && gcp / total > 0.25)
    warnings.push(t("obj.wGcp", { pct: Math.round((gcp / total) * 100) }));
  if (relatedPartyRepayment)
    warnings.push(t("obj.wRpr"));
  rows.forEach((r) => {
    if (/capex|machin/i.test(r.category) && !r.evidence) warnings.push(t("obj.wNoQuote", { cat: r.category }));
    if (/working capital/i.test(r.category) && !r.evidence) warnings.push(t("obj.wWc"));
    if (r.amountCr > 0 && !r.deploymentTimeline) warnings.push(t("obj.wTimeline", { cat: r.category }));
  });

  const save = async () => {
    setSaving(true);
    try {
      await fetch("/api/objects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ objects: rows, relatedPartyRepayment }),
      });
      setSavedMsg(t("obj.savedMsg"));
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
                <th className="py-2 pr-2 w-56">{t("obj.thPurpose")}</th>
                <th className="pr-2 w-28">{t("obj.thAmount")}</th>
                <th className="pr-2">{t("obj.thEvidence")}</th>
                <th className="pr-2 w-40">{t("obj.thTimeline")}</th>
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
                    <input className={inputCls} list="evidence-docs" placeholder={t("obj.evidencePh")} value={r.evidence} onChange={(e) => setRows(rows.map((x, j) => j === i ? { ...x, evidence: e.target.value } : x))} />
                  </td>
                  <td className="pr-2">
                    <input className={inputCls} placeholder={t("obj.timelinePh")} value={r.deploymentTimeline} onChange={(e) => setRows(rows.map((x, j) => j === i ? { ...x, deploymentTimeline: e.target.value } : x))} />
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
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs border border-slate-300 rounded-lg hover:bg-slate-50"><Plus size={13} /> {t("obj.addObject")}</button>
          <label className="flex items-center gap-2 text-[13px] text-slate-600">
            <input type="checkbox" checked={relatedPartyRepayment} onChange={(e) => setRpr(e.target.checked)} className="rounded" />
            {t("obj.rprLabel")}
          </label>
          <div className="ml-auto text-sm">
            <span className="text-slate-500">{t("obj.total")}</span>{" "}
            <span className={`font-semibold ${freshIssueCr != null && Math.abs(total - freshIssueCr) > 0.01 ? "text-red-600" : "text-slate-800"}`}>₹{total.toFixed(1)} Cr</span>
            {freshIssueCr != null && <span className="text-slate-400">{t("obj.freshIssueSuffix", { fresh: freshIssueCr })}</span>}
          </div>
        </div>
      </Card>

      {warnings.length > 0 && (
        <Card className="p-4 border-amber-300 bg-amber-50">
          <h4 className="text-xs font-semibold text-amber-800 mb-1.5">{t("obj.warningsTitle", { n: warnings.length })}</h4>
          <ul className="text-[13px] text-amber-900 space-y-1">{warnings.map((w, i) => <li key={i}>⚠ {w}</li>)}</ul>
        </Card>
      )}

      {/* Live preview table */}
      <Card className="p-5">
        <h3 className="text-sm font-semibold text-slate-800 mb-3">{t("obj.previewTitle")}</h3>
        <table className="w-full text-sm">
          <thead><tr className="text-left text-xs text-slate-500 border-b border-slate-200"><th className="py-2">{t("obj.pvObject")}</th><th>{t("obj.pvAmount")}</th><th>{t("obj.pvPct")}</th><th>{t("obj.pvTimeline")}</th><th>{t("obj.pvEvidence")}</th></tr></thead>
          <tbody>
            {rows.filter((r) => r.amountCr > 0).map((r, i) => (
              <tr key={i} className="border-b border-slate-100">
                <td className="py-2 text-slate-700">{r.category}</td>
                <td className="font-medium">₹{r.amountCr}</td>
                <td>{total ? Math.round((r.amountCr / total) * 100) : 0}%</td>
                <td className="text-slate-500">{r.deploymentTimeline || "—"}</td>
                <td className="text-slate-500 text-xs">{r.evidence || <span className="text-amber-600">{t("obj.noEvidence")}</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-xs text-slate-400 mt-3">{t("obj.meansOfFinance")}</p>
      </Card>

      <div className="flex items-center gap-3">
        <button onClick={save} disabled={saving} className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-sky-500 text-white text-sm font-medium rounded-lg shadow-sm shadow-blue-600/30 hover:shadow-md transition-shadow disabled:opacity-50">
          {saving ? t("obj.saving") : t("obj.saveObjects")}
        </button>
        {savedMsg && <span className="text-sm text-emerald-600 font-medium">{savedMsg}</span>}
      </div>
    </div>
  );
}
