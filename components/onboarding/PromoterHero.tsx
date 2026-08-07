import Link from "next/link";
import { ArrowRight, Upload, BrainCircuit, FileSearch, FileText, UserCheck, ShieldCheck } from "lucide-react";
import { ScoreDonut, GlassPanel, SeverityBadge, Card } from "@/components/shared/ui";

export interface HeroGap { title: string; severity: string; section: string; href: string }

const STEPS = [
  { icon: Upload, title: "Upload what you have", body: "Financials, KYC, approvals, contracts — in any order. No fixed bundle required." },
  { icon: FileSearch, title: "We extract & source-link", body: "Every figure is read from your files with page-level provenance and a confidence score." },
  { icon: BrainCircuit, title: "See your IPO readiness", body: "A readiness score, SME-framework checks and the questions an exchange will likely ask." },
  { icon: FileText, title: "Generate a review-ready draft", body: "A 57-section SME offer-document draft — grounded in your data, never invented." },
  { icon: UserCheck, title: "Your banker reviews & certifies", body: "The draft goes to your merchant banker. SIIM prepares; intermediaries certify." },
];

/**
 * Landing hero for the promoter. First-run: a plain-language "how SIIM works"
 * guide. Once a company exists: a readiness cockpit — score, top blockers and
 * the single most useful next action — so a first-time issuer is never lost.
 */
export default function PromoterHero({
  hasCompany, score, statusLine, coveragePct, criticalCount, highCount,
  obAttention, topGaps, nextAction,
}: {
  hasCompany: boolean;
  score: number;
  statusLine: string;
  coveragePct: number;
  criticalCount: number;
  highCount: number;
  obAttention: number;
  topGaps: HeroGap[];
  nextAction: { label: string; href: string };
}) {
  if (!hasCompany) {
    return (
      <Card className="p-6 mb-6 border-blue-100 bg-gradient-to-br from-blue-50/80 to-white">
        <div className="flex flex-wrap items-start gap-3 mb-5">
          <div>
            <h2 className="text-xl font-bold font-serif text-[#1e3a5f]">Welcome — let&rsquo;s get you IPO-ready</h2>
            <p className="text-sm text-slate-600 mt-1 max-w-2xl">
              SIIM turns your scattered documents into a review-ready SME IPO offer-document draft. Fill your company
              profile below and upload whatever documents you have — here&rsquo;s the whole journey:
            </p>
          </div>
          <span className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700">
            <ShieldCheck size={13} /> Nothing is invented — every line is traceable to your files
          </span>
        </div>
        <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {STEPS.map((s, i) => (
            <li key={i} className="relative rounded-xl border border-slate-200 bg-white p-3.5">
              <span className="absolute -top-2 -left-2 grid h-6 w-6 place-items-center rounded-full bg-[#1e3a5f] text-[11px] font-bold text-white">{i + 1}</span>
              <s.icon size={18} className="text-blue-600 mb-2" />
              <div className="text-[13px] font-semibold text-slate-800 leading-snug">{s.title}</div>
              <div className="text-[11.5px] text-slate-500 mt-1 leading-snug">{s.body}</div>
            </li>
          ))}
        </ol>
      </Card>
    );
  }

  const tone = score >= 75 ? "text-emerald-600" : score >= 50 ? "text-amber-600" : "text-red-600";
  return (
    <Card className="p-5 md:p-6 mb-6 border-slate-200">
      <div className="grid gap-6 lg:grid-cols-[auto_1fr]">
        <div className="flex items-center gap-4 lg:border-r lg:border-slate-200 lg:pr-6">
          <ScoreDonut score={score} />
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">IPO Readiness</div>
            <div className={`text-2xl font-bold ${tone}`}>{score}<span className="text-base text-slate-400">/100</span></div>
            <div className="text-xs text-slate-500 mt-1 max-w-[220px] leading-snug">{statusLine}</div>
          </div>
        </div>

        <div className="min-w-0">
          <div className="grid grid-cols-3 gap-2 mb-4">
            <Metric label="Draft coverage" value={`${coveragePct}%`} tone="slate" />
            <Metric label="Critical gaps" value={criticalCount} tone={criticalCount ? "red" : "emerald"} />
            <Metric label="Framework flags" value={obAttention} tone={obAttention ? "amber" : "emerald"} />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <h3 className="text-sm font-semibold text-slate-800">
              {topGaps.length ? "Fix these next" : "No open blockers"}
              {highCount > 0 && <span className="ml-2 text-xs font-normal text-slate-400">{highCount} high-priority items in total</span>}
            </h3>
            <Link href={nextAction.href} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-700">
              {nextAction.label} <ArrowRight size={13} />
            </Link>
          </div>

          {topGaps.length === 0 ? (
            <GlassPanel className="p-4 text-sm text-emerald-700">All critical items are resolved — you&rsquo;re ready to progress the draft toward merchant-banker review.</GlassPanel>
          ) : (
            <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 overflow-hidden">
              {topGaps.map((g, i) => (
                <li key={i} className="flex items-start gap-3 px-3.5 py-2.5 bg-white">
                  <SeverityBadge severity={g.severity} />
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-medium text-slate-800 leading-snug">{g.title}</div>
                    <div className="text-[11px] text-slate-400">{g.section}</div>
                  </div>
                  <Link href={g.href} className="text-[11px] text-blue-600 hover:underline whitespace-nowrap mt-0.5">Resolve →</Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Card>
  );
}

function Metric({ label, value, tone }: { label: string; value: string | number; tone: "slate" | "red" | "amber" | "emerald" }) {
  const tones = {
    slate: "text-slate-800", red: "text-red-600", amber: "text-amber-600", emerald: "text-emerald-600",
  };
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2.5">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</div>
      <div className={`text-lg font-bold ${tones[tone]}`}>{value}</div>
    </div>
  );
}
