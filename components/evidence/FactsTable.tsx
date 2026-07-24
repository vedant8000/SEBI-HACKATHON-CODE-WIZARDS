"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, Pencil, Plus, X } from "lucide-react";
import type { ExtractedFact, FactConflict } from "@/lib/types";
import { Badge, GlassPanel, GlassStat, HeroBackdrop } from "@/components/shared/ui";

const statusTone: Record<string, "green" | "yellow" | "red" | "blue"> = {
  ACCEPTED: "green", NEEDS_REVIEW: "yellow", REJECTED: "red", PROMOTER_EDITED: "blue",
};

/** Render-time humanizer so facts stored before this fix also display cleanly. */
function pretty(label: string): string {
  if (!label) return label;
  if (/\s/.test(label) && !/[a-z][A-Z]/.test(label)) return label;
  let t = label.replace(/Cr$/, "").replace(/[_-]+/g, " ")
    .replace(/([a-z\d])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2").trim();
  t = t.charAt(0).toUpperCase() + t.slice(1);
  t = t.replace(/\b(cin|gst|gstin|pan|din|ipo|rpt|ebitda|pat|cfo|fy|moa|aoa|kyc)\b/gi, (m) => m.toUpperCase());
  return /Cr$/.test(label) ? `${t} (₹ Cr)` : t;
}

export default function FactsTable({
  facts, conflicts, chunkStats,
}: { facts: ExtractedFact[]; conflicts: FactConflict[]; chunkStats: { total: number; processed: number; failed: number } }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [editVal, setEditVal] = useState("");
  const [showManual, setShowManual] = useState(false);
  const [manual, setManual] = useState({ factKey: "", value: "", financialYear: "" });
  const [filter, setFilter] = useState("");

  const act = async (id: string, action: string, value?: string) => {
    setBusy(id);
    try {
      await fetch("/api/facts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action, value }),
      });
      router.refresh();
    } finally { setBusy(null); setEditId(null); }
  };

  const addManual = async () => {
    if (!manual.factKey || !manual.value) return;
    setBusy("manual");
    try {
      await fetch("/api/facts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ factKey: manual.factKey, value: manual.value, financialYear: manual.financialYear || null }),
      });
      setManual({ factKey: "", value: "", financialYear: "" });
      setShowManual(false);
      router.refresh();
    } finally { setBusy(null); }
  };

  const shown = facts.filter((f) =>
    !filter ||
    f.factLabel.toLowerCase().includes(filter.toLowerCase()) ||
    f.sourceFileName.toLowerCase().includes(filter.toLowerCase()) ||
    f.factKey.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <HeroBackdrop className="p-5 md:p-6">
    <div className="relative space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <GlassStat label="Facts Extracted" value={facts.length} sub={`${facts.filter((f) => f.extractionMethod === "ai").length} by AI · ${facts.filter((f) => f.extractionMethod === "pattern").length} by pattern · ${facts.filter((f) => f.extractionMethod === "manual").length} manual`} />
        <GlassStat label="Needs Review" value={facts.filter((f) => f.status === "NEEDS_REVIEW").length} tone={facts.some((f) => f.status === "NEEDS_REVIEW") ? "warn" : "good"} />
        <GlassStat label="Conflicts" value={conflicts.filter((c) => c.status === "OPEN").length} tone={conflicts.some((c) => c.status === "OPEN") ? "bad" : "good"} sub="Same fact, different values across documents" />
        <GlassStat label="Chunks Processed" value={`${chunkStats.processed}/${chunkStats.total}`} sub={chunkStats.failed ? `${chunkStats.failed} failed — re-upload to retry` : "Page-wise extraction"} />
      </div>

      {conflicts.filter((c) => c.status === "OPEN").length > 0 && (
        <GlassPanel className="p-4 !border-red-300/80 !bg-red-100/80">
          <h3 className="text-sm font-semibold text-red-800 mb-2">Fact conflicts — reconcile before drafting</h3>
          <ul className="space-y-1.5 text-[13px] text-red-900">
            {conflicts.filter((c) => c.status === "OPEN").map((c) => (
              <li key={c.id}>⚠ <strong>{c.factKey}</strong>: {c.valueA} ({c.sourceA}) vs {c.valueB} ({c.sourceB}) — {c.explanation}</li>
            ))}
          </ul>
        </GlassPanel>
      )}

      <GlassPanel className="overflow-hidden">
        <div className="px-5 py-3 border-b border-white/60 flex flex-wrap items-center gap-3">
          <h3 className="text-sm font-semibold text-[#1e3a5f]">Extracted Facts ({shown.length})</h3>
          <input
            className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg w-56 bg-white/90"
            placeholder="Filter by fact, key or source…"
            value={filter} onChange={(e) => setFilter(e.target.value)}
          />
          <button onClick={() => setShowManual(!showManual)}
            className="ml-auto inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium border border-slate-300 rounded-lg bg-white/70 hover:bg-white">
            <Plus size={13} /> Enter fact manually
          </button>
        </div>

        {showManual && (
          <div className="px-5 py-3 bg-blue-50/60 border-b border-white/60 flex flex-wrap items-end gap-3">
            <label className="text-[11px] text-slate-500">Fact key<br />
              <input className="mt-0.5 px-2 py-1.5 text-xs border border-slate-300 rounded w-44 bg-white" placeholder="e.g. revenueCr" value={manual.factKey} onChange={(e) => setManual({ ...manual, factKey: e.target.value })} />
            </label>
            <label className="text-[11px] text-slate-500">Value<br />
              <input className="mt-0.5 px-2 py-1.5 text-xs border border-slate-300 rounded w-36 bg-white" value={manual.value} onChange={(e) => setManual({ ...manual, value: e.target.value })} />
            </label>
            <label className="text-[11px] text-slate-500">FY (optional)<br />
              <input className="mt-0.5 px-2 py-1.5 text-xs border border-slate-300 rounded w-24 bg-white" placeholder="FY2026" value={manual.financialYear} onChange={(e) => setManual({ ...manual, financialYear: e.target.value })} />
            </label>
            <button onClick={addManual} disabled={busy === "manual"} className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg disabled:opacity-50">Add</button>
            <span className="text-[11px] text-slate-400">Manual facts are flagged: evidence pending / professional verification required.</span>
          </div>
        )}

        {shown.length === 0 ? (
          <p className="p-8 text-sm text-slate-400 text-center">No facts yet — upload documents in Upload Documents, or add facts manually.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px] min-w-[980px]">
              <thead>
                <tr className="text-left text-xs text-slate-500 bg-white/50">
                  <th className="px-4 py-2.5">Fact</th>
                  <th className="px-2 py-2.5">Value</th>
                  <th className="px-2 py-2.5">FY</th>
                  <th className="px-2 py-2.5">Source</th>
                  <th className="px-2 py-2.5">Page</th>
                  <th className="px-2 py-2.5">Conf.</th>
                  <th className="px-2 py-2.5">Method</th>
                  <th className="px-2 py-2.5">Linked Sections</th>
                  <th className="px-2 py-2.5">Status</th>
                  <th className="px-2 py-2.5">Actions</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((f) => (
                  <tr key={f.id} className={`border-t border-white/60 bg-white/40 ${f.status === "REJECTED" ? "opacity-40" : ""}`}>
                    <td className="px-4 py-2 font-medium text-slate-700">{pretty(f.factLabel)}<div className="text-[10px] text-slate-400 font-mono">{f.factKey}</div></td>
                    <td className="px-2 py-2">
                      {editId === f.id ? (
                        <span className="flex gap-1">
                          <input className="px-2 py-1 text-xs border border-blue-400 rounded w-24" value={editVal} onChange={(e) => setEditVal(e.target.value)} autoFocus />
                          <button onClick={() => act(f.id, "edit", editVal)} className="text-emerald-600"><Check size={14} /></button>
                          <button onClick={() => setEditId(null)} className="text-slate-400"><X size={14} /></button>
                        </span>
                      ) : (
                        <span className="text-slate-800">{f.normalizedValue}{f.unit ? <span className="text-slate-400 text-[11px]"> {f.unit}</span> : null}</span>
                      )}
                    </td>
                    <td className="px-2 py-2 text-slate-500">{f.financialYear ?? "—"}</td>
                    <td className="px-2 py-2 text-slate-500 max-w-[180px] truncate" title={f.sourceFileName}>{f.sourceFileName}</td>
                    <td className="px-2 py-2 text-slate-500">{f.pageStart ? `${f.pageStart}${f.pageEnd && f.pageEnd !== f.pageStart ? `–${f.pageEnd}` : ""}` : "—"}</td>
                    <td className="px-2 py-2 text-slate-600">{f.confidence}%</td>
                    <td className="px-2 py-2"><Badge tone={f.extractionMethod === "ai" ? "blue" : f.extractionMethod === "manual" ? "yellow" : "grey"}>{f.extractionMethod}</Badge></td>
                    <td className="px-2 py-2 text-[11px] text-slate-400 max-w-[160px] truncate" title={f.linkedProspectusSections.join(", ")}>{f.linkedProspectusSections.slice(0, 2).join(", ") || "—"}</td>
                    <td className="px-2 py-2"><Badge tone={statusTone[f.status]}>{f.status === "PROMOTER_EDITED" ? "EDITED — MB verify" : f.status.replace("_", " ")}</Badge></td>
                    <td className="px-2 py-2 whitespace-nowrap">
                      <button title="Accept" onClick={() => act(f.id, "accept")} disabled={!!busy} className="p-1 text-slate-400 hover:text-emerald-600"><Check size={14} /></button>
                      <button title="Edit" onClick={() => { setEditId(f.id); setEditVal(f.normalizedValue); }} disabled={!!busy} className="p-1 text-slate-400 hover:text-blue-600"><Pencil size={13} /></button>
                      <button title="Reject" onClick={() => act(f.id, "reject")} disabled={!!busy} className="p-1 text-slate-400 hover:text-red-600"><X size={14} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassPanel>
    </div>
    </HeroBackdrop>
  );
}
