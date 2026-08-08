import { FileText, FileSearch, Layers, ShieldCheck, Clock, Landmark, Coins, TimerReset, Gauge } from "lucide-react";

/**
 * "Preparation leverage" — the impact story told HONESTLY, in three layers:
 *   1. Factual counts of what SIIM actually did for this company (no assumptions).
 *   2. Published industry baselines, each with its source on screen.
 *   3. The mechanism SIIM compresses, labelled indicative — never a fabricated
 *      "X hours saved" figure.
 * Presentational only; every number is passed in from live analysis data.
 */

const CITED = [
  { icon: Clock, value: "5–6 wks", label: "Typical draft-preparation time", source: "ICSI" },
  { icon: Landmark, value: "71–88%", label: "Issue expenses spent on intermediaries", source: "NSE prospectus" },
  { icon: Coins, value: "₹25–30 L", label: "Merchant-banker fee for DRHP preparation", source: "IPO Central" },
  { icon: TimerReset, value: "+8–10 wks", label: "Added by discrepancies found late", source: "Sapient" },
] as const;

export default function PreparationLeverage({
  companyName, documentsIngested, factsLinked, sectionsReady, sectionsTotal, issuesSurfaced, checksRun,
}: {
  companyName: string;
  documentsIngested: number;
  factsLinked: number;
  sectionsReady: number;
  sectionsTotal: number;
  issuesSurfaced: number;
  checksRun: number;
}) {
  const tiles = [
    { icon: FileText, value: documentsIngested, label: "Documents ingested" },
    { icon: FileSearch, value: factsLinked, label: "Facts source-linked" },
    { icon: Layers, value: `${sectionsReady}/${sectionsTotal}`, label: "Sections auto-draftable" },
    { icon: ShieldCheck, value: checksRun, label: "Compliance checks run" },
  ];

  return (
    <section className="mb-7 overflow-hidden rounded-[28px] border border-slate-900/[0.08] bg-[#fffefa] shadow-[0_18px_54px_rgba(13,35,50,0.12)]">
      <div className="h-1 bg-gradient-to-r from-[#c99a42] via-[#2cc7ad] to-[#0c7c72]" />
      <div className="p-6 md:p-7">
        <div className="flex flex-wrap items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-[#122b45] to-[#0c7c72] text-white shadow-md shadow-teal-950/15">
            <Gauge size={19} />
          </span>
          <div>
            <h2 className="font-serif text-xl font-bold text-[#10283f]">Preparation leverage</h2>
            <p className="text-xs text-slate-500">What SIIM has done, set against the industry baseline it acts on.</p>
          </div>
          <span className="ml-auto rounded-full border border-slate-900/[0.08] bg-slate-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            Benchmarked · not a guarantee
          </span>
        </div>

        {/* Layer 1 — factual counts */}
        <div className="mt-5 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
          What SIIM has done for {companyName || "your company"}
        </div>
        <div className="mt-2 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {tiles.map((t) => (
            <div key={t.label} className="rounded-2xl border border-slate-900/[0.07] bg-[linear-gradient(150deg,#fffefa,#f4f6f1)] p-4 shadow-sm">
              <t.icon size={17} className="text-[#0c7c72]" />
              <div className="mt-2 font-serif text-2xl font-bold tabular-nums text-[#10283f]">{t.value}</div>
              <div className="mt-0.5 text-[11.5px] leading-snug text-slate-500">{t.label}</div>
            </div>
          ))}
        </div>

        {/* Layer 2 — cited baselines */}
        <div className="mt-6 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
          The industry baseline it acts on
        </div>
        <div className="mt-2 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {CITED.map((c) => (
            <div key={c.label} className="rounded-2xl border border-slate-900/[0.06] bg-white/70 p-4">
              <div className="flex items-center gap-2">
                <c.icon size={15} className="text-[#c99a42]" />
                <span className="font-serif text-lg font-bold tabular-nums text-[#10283f]">{c.value}</span>
              </div>
              <div className="mt-1 text-[11.5px] leading-snug text-slate-500">{c.label}</div>
              <div className="mt-1.5 text-[10px] font-semibold uppercase tracking-wide text-teal-700/80">Source: {c.source}</div>
            </div>
          ))}
        </div>

        {/* Layer 3 — the mechanism (dark accent band) */}
        <div className="relative mt-6 overflow-hidden rounded-2xl bg-[linear-gradient(145deg,#091726_0%,#123349_58%,#0b625b_100%)] p-5 text-white">
          <div className="pointer-events-none absolute -right-12 -top-16 h-40 w-40 rounded-full bg-cyan-300/15 blur-2xl" />
          <div className="relative flex flex-wrap items-start gap-3">
            <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/10 text-cyan-200"><TimerReset size={16} /></span>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-cyan-200/80">Where the time goes</div>
              <p className="mt-1 max-w-3xl text-sm leading-relaxed text-blue-50/90">
                SIIM front-loads the drafting and surfaces revenue-recognition, related-party and document-authenticity
                issues {issuesSurfaced > 0 ? <span className="font-semibold text-white">({issuesSurfaced} on this filing) </span> : ""}
                <span className="font-semibold text-white">before</span> a merchant banker is engaged, the very
                8–10-week revision cycle that industry data attributes to problems found late. Indicative, based on the
                cited benchmarks, not a guaranteed saving.
              </p>
            </div>
          </div>
        </div>

        <p className="mt-3 text-[10.5px] text-slate-400">
          Counts are live from your own analysis. Baselines: ICSI, NSE prospectus data, IPO Central and Sapient Services.
          Actual reduction depends on data quality and the intermediary.
        </p>
      </div>
    </section>
  );
}
