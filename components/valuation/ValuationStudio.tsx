"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Card, StatCard } from "@/components/shared/ui";
import { PeerCompareChart } from "@/components/charts/charts";

interface PeerRow { name: string; pe: number | null; evEbitda: number | null; roePct: number | null; }

const r1 = (n: number) => Math.round(n * 10) / 10;
const median = (v: number[]) => {
  const s = [...v].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

export default function ValuationStudio({
  companyName, latest, issueSizeCr,
}: {
  companyName: string;
  latest: { revenueCr: number | null; patCr: number | null; ebitdaCr: number | null; netWorthCr: number | null; borrowingsCr: number | null } | null;
  issueSizeCr: number | null;
}) {
  const [valuationCr, setValuationCr] = useState<string>(issueSizeCr ? String(issueSizeCr * 4) : "");
  const [peers, setPeers] = useState<PeerRow[]>([]);

  const v = Number(valuationCr) || 0;
  const pe = v && latest?.patCr ? r1(v / latest.patCr) : null;
  const ps = v && latest?.revenueCr ? r1(v / latest.revenueCr) : null;
  const evEbitda = v && latest?.ebitdaCr ? r1((v + (latest.borrowingsCr ?? 0)) / latest.ebitdaCr) : null;
  const roe = latest?.patCr && latest?.netWorthCr ? r1((latest.patCr / latest.netWorthCr) * 100) : null;

  const peersWithPe = peers.filter((p) => p.name && p.pe);
  const medPe = peersWithPe.length ? r1(median(peersWithPe.map((p) => p.pe!))) : null;
  const premium = pe != null && medPe ? Math.round(((pe - medPe) / medPe) * 100) : null;

  const chartData = [
    ...(pe ? [{ name: companyName.split(" ").slice(0, 2).join(" ") + " (you)", value: pe, self: true }] : []),
    ...peersWithPe.map((p) => ({ name: p.name.split(" ").slice(0, 2).join(" "), value: p.pe! })),
  ];

  return (
    <div className="space-y-5">
      <Card className="p-5">
        <label className="text-[13px] font-medium text-slate-700">
          Proposed post-money valuation (₹ Cr)
          <input className="mt-2 block px-3 py-2 text-sm border border-slate-300 rounded-lg w-56"
            type="number" value={valuationCr} onChange={(e) => setValuationCr(e.target.value)} />
        </label>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Implied P/E" value={pe != null ? `${pe}x` : "—"} sub={medPe ? `Peer median ${medPe}x` : "Add peers below"} tone={pe != null && medPe ? (pe > medPe * 1.3 ? "bad" : pe > medPe ? "warn" : "good") : "default"} />
        <StatCard label="Implied P/S" value={ps != null ? `${ps}x` : "—"} />
        <StatCard label="EV / EBITDA" value={evEbitda != null ? `${evEbitda}x` : "—"} />
        <StatCard label="Your RoE" value={roe != null ? `${roe}%` : "—"} />
      </div>

      {premium != null && (
        <Card className={`p-4 ${premium > 30 ? "border-red-300 bg-red-50" : premium > 0 ? "border-amber-300 bg-amber-50" : "border-emerald-300 bg-emerald-50"}`}>
          <p className="text-sm text-slate-800">
            {premium > 0
              ? `Your proposed valuation implies ${pe}x P/E — a ${premium}% premium to your entered peer median of ${medPe}x.${premium > 30 ? " A premium this large needs strong, specific justification in Basis for Issue Price." : " Add justification for the premium in Basis for Issue Price."}`
              : `Your proposed valuation implies ${pe}x P/E — a ${Math.abs(premium)}% discount to your entered peer median of ${medPe}x.`}
          </p>
        </Card>
      )}

      <Card className="p-5">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">Peer set (enter manually)</h3>
            <p className="text-xs text-slate-400">From exchange filings or your merchant banker&apos;s licensed data. CSV import and market-data integration are on the roadmap.</p>
          </div>
          <button onClick={() => setPeers([...peers, { name: "", pe: null, evEbitda: null, roePct: null }])}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs border border-slate-300 rounded-lg hover:bg-slate-50">
            <Plus size={13} /> Add peer
          </button>
        </div>
        {peers.length === 0 ? (
          <p className="text-sm text-slate-400 py-6 text-center">
            Peer benchmarking requires uploaded peer data or integration with a market data provider. Add listed SME
            peers manually to compare multiples.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500 border-b border-slate-200">
                <th className="py-2">Peer name</th><th>P/E (x)</th><th>EV/EBITDA (x)</th><th>RoE (%)</th><th></th>
              </tr>
            </thead>
            <tbody>
              {peers.map((p, i) => (
                <tr key={i} className="border-b border-slate-100">
                  {(["name", "pe", "evEbitda", "roePct"] as const).map((k) => (
                    <td key={k} className="py-1.5 pr-2">
                      <input
                        className="px-2 py-1.5 text-sm border border-slate-300 rounded-lg w-full"
                        type={k === "name" ? "text" : "number"}
                        placeholder={k === "name" ? "e.g. Precitech Auto Parts" : ""}
                        value={p[k] ?? ""}
                        onChange={(e) => setPeers(peers.map((x, j) => j === i ? { ...x, [k]: k === "name" ? e.target.value : (e.target.value === "" ? null : Number(e.target.value)) } : x))}
                      />
                    </td>
                  ))}
                  <td><button onClick={() => setPeers(peers.filter((_, j) => j !== i))} className="text-slate-300 hover:text-red-500"><Trash2 size={14} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {chartData.length > 1 && (
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-slate-800 mb-1">P/E vs your peer set</h3>
          <p className="text-xs text-slate-500 mb-3">Your implied multiple (dark blue) against peers you entered</p>
          <PeerCompareChart data={chartData} metricLabel="P/E" />
        </Card>
      )}
      <p className="text-xs text-slate-400">Decision support only — not investment advice and not a substitute for the merchant banker&apos;s valuation exercise.</p>
    </div>
  );
}
