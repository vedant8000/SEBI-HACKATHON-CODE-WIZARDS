import { ShieldCheck, FileSearch, UserCheck, History, Lock } from "lucide-react";

/**
 * A compact trust bar surfacing SIIM's safeguards, the guarantees a regulator
 * and a first-time promoter both care about. Presentational only.
 */
const ITEMS = [
  { icon: FileSearch, title: "Zero fabrication", body: "Every drafted line traces to an extracted fact, and missing data is left out rather than filled in." },
  { icon: ShieldCheck, title: "Evidence-linked", body: "Facts carry file + page + confidence provenance you can open and verify." },
  { icon: UserCheck, title: "Human-in-the-loop", body: "The promoter drafts; the SEBI-registered merchant banker reviews and certifies." },
  { icon: History, title: "Tamper-evident trail", body: "Every change is logged; exports carry a SHA-256 content hash." },
  { icon: Lock, title: "DPDP-aligned handling", body: "Company data is access-scoped, consent-based and retained only as needed." },
];

export default function TrustStrip({ className = "" }: { className?: string }) {
  return (
    <div className={`rounded-2xl border border-slate-200 bg-white/80 p-4 ${className}`}>
      <div className="flex items-center gap-2 mb-3">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-600">
          <ShieldCheck size={15} />
        </span>
        <h3 className="text-sm font-semibold text-[#1e3a5f]">Built for trust &amp; supervision</h3>
        <span className="ml-auto text-[11px] text-slate-400">Preparation aid, not a regulatory filing</span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {ITEMS.map((it) => (
          <div key={it.title} className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
            <it.icon size={16} className="text-blue-600 mb-1.5" />
            <div className="text-[12.5px] font-semibold text-slate-800 leading-snug">{it.title}</div>
            <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">{it.body}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
