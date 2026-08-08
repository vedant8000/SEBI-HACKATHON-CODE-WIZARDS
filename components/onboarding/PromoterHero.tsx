import Link from "next/link";
import {
  Activity,
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  CircleAlert,
  FileCheck2,
  FileSearch,
  FileText,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Upload,
  UserCheck,
} from "lucide-react";
import { Card, GlassPanel } from "@/components/shared/ui";

export interface HeroGap {
  title: string;
  severity: string;
  section: string;
  href: string;
}

const STEPS = [
  { icon: Upload, title: "Upload what you have", body: "Financials, KYC, approvals and contracts, in any order. No fixed bundle required." },
  { icon: FileSearch, title: "We extract & source-link", body: "Every figure is read from your files with page-level provenance and a confidence score." },
  { icon: BrainCircuit, title: "See your IPO readiness", body: "A readiness score, SME-framework checks and the questions an exchange will likely ask." },
  { icon: FileText, title: "Generate a review-ready draft", body: "A 57-section SME offer-document draft, grounded entirely in your own data." },
  { icon: UserCheck, title: "Your banker reviews & certifies", body: "The draft goes to your merchant banker. SIIM prepares; intermediaries certify." },
];

/**
 * First-run journey and, once a company exists, a visual readiness cockpit.
 * All values remain live outputs of the existing analysis engine.
 */
export default function PromoterHero({
  hasCompany,
  assessed,
  score,
  statusLine,
  coveragePct,
  criticalCount,
  highCount,
  obAttention,
  topGaps,
  nextAction,
}: {
  hasCompany: boolean;
  assessed: boolean;
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
      <Card className="mb-6 border-blue-100 bg-gradient-to-br from-blue-50/80 to-white p-6">
        <div className="mb-5 flex flex-wrap items-start gap-3">
          <div>
            <h2 className="font-serif text-xl font-bold text-[#1e3a5f]">Welcome, let&rsquo;s get you IPO-ready</h2>
            <p className="mt-1 max-w-2xl text-sm text-slate-600">
              SIIM turns your scattered documents into a review-ready SME IPO offer-document draft. Fill your company
              profile below and upload whatever documents you have, here&rsquo;s the whole journey:
            </p>
          </div>
          <span className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700">
            <ShieldCheck size={13} /> Everything is traceable to your documents
          </span>
        </div>
        <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {STEPS.map((step, index) => (
            <li key={step.title} className="relative rounded-xl border border-slate-200 bg-white p-3.5">
              <span className="absolute -left-2 -top-2 grid h-6 w-6 place-items-center rounded-full bg-[#1e3a5f] text-[11px] font-bold text-white">{index + 1}</span>
              <step.icon size={18} className="mb-2 text-blue-600" />
              <div className="text-[13px] font-semibold leading-snug text-slate-800">{step.title}</div>
              <div className="mt-1 text-[11.5px] leading-snug text-slate-500">{step.body}</div>
            </li>
          ))}
        </ol>
      </Card>
    );
  }

  const priorityCount = criticalCount + highCount;
  const scoreState = !assessed
    ? {
        label: "Assessment pending",
        detail: "Run IPO Intelligence",
        color: "#60a5fa",
        pill: "border-blue-300/30 bg-blue-300/10 text-blue-100",
      }
    : score >= 75
      ? {
          label: "Evidence progressing",
          detail: "Professional review recommended",
          color: "#34d399",
          pill: "border-emerald-300/30 bg-emerald-300/10 text-emerald-100",
        }
      : score >= 50
        ? {
            label: "Needs attention",
            detail: "Resolve priority gaps next",
            color: "#fbbf24",
            pill: "border-amber-300/30 bg-amber-300/10 text-amber-100",
          }
        : {
            label: "Early preparation",
            detail: "Build the evidence base",
            color: "#fb7185",
            pill: "border-rose-300/30 bg-rose-300/10 text-rose-100",
          };

  return (
    <section className="relative mb-7 overflow-hidden rounded-[28px] border border-white/80 bg-white shadow-[0_18px_55px_rgba(30,58,95,0.16)]">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-600 via-cyan-400 to-emerald-400" />
      <div className="grid xl:grid-cols-[390px_1fr]">
        <div className="relative overflow-hidden bg-gradient-to-br from-[#102b4c] via-[#17456e] to-[#087f92] p-6 text-white md:p-7 xl:min-h-[365px]">
          <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-cyan-300/15 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-20 -left-16 h-48 w-48 rounded-full bg-blue-300/15 blur-2xl" />

          <div className="relative flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-200">
                <Activity size={14} /> Live readiness cockpit
              </div>
              <h2 className="mt-2 font-serif text-2xl font-bold">IPO readiness</h2>
            </div>
            <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${scoreState.pill}`}>
              {scoreState.label}
            </span>
          </div>

          <div className="relative mt-5 flex flex-col items-center sm:flex-row sm:gap-6 xl:flex-col">
            <ReadinessGauge score={score} assessed={assessed} color={scoreState.color} />
            <div className="mt-4 min-w-0 text-center sm:mt-0 sm:text-left xl:mt-4 xl:text-center">
              <div className="text-sm font-semibold text-white">{scoreState.detail}</div>
              <p className="mt-1 max-w-[280px] text-xs leading-relaxed text-blue-100/75">{statusLine}</p>
            </div>
          </div>

          <div className="relative mt-5">
            <div className="mb-2 flex justify-between text-[9px] font-semibold uppercase tracking-wide text-blue-100/60">
              <span>Early prep</span><span>Evidence building</span><span>MB review</span>
            </div>
            <div className="relative h-1.5 rounded-full bg-white/15">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-300 transition-[width] duration-700"
                style={{ width: `${assessed ? Math.max(3, Math.min(score, 100)) : 3}%` }}
              />
              <span
                className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-cyan-300 shadow-lg shadow-cyan-300/40"
                style={{ left: `${assessed ? Math.max(3, Math.min(score, 97)) : 3}%` }}
              />
            </div>
          </div>
        </div>

        <div className="min-w-0 p-5 md:p-7">
          <div className="grid gap-3 sm:grid-cols-3">
            <Metric icon={FileCheck2} label="Draft coverage" value={`${coveragePct}%`} sub="Blueprint coverage" progress={coveragePct} tone="blue" />
            <Metric icon={CircleAlert} label="Critical gaps" value={criticalCount} sub={criticalCount ? "Must be resolved" : "No critical blockers"} tone={criticalCount ? "red" : "emerald"} />
            <Metric icon={ShieldAlert} label="Framework flags" value={obAttention} sub={obAttention ? "Needs attention" : "No active flags"} tone={obAttention ? "amber" : "emerald"} />
          </div>

          <div className="mt-6 flex flex-wrap items-end justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-blue-50 text-blue-700"><Sparkles size={15} /></span>
              <div>
                <h3 className="text-sm font-bold text-[#17375e]">{topGaps.length ? "Your highest-impact next steps" : "No open blockers"}</h3>
                <p className="text-[11px] text-slate-500">
                  {priorityCount > 0
                    ? `${priorityCount} critical or high-priority item${priorityCount === 1 ? "" : "s"} in total`
                    : "Your evidence base has no critical or high-priority gaps"}
                </p>
              </div>
            </div>
            <Link
              href={nextAction.href}
              className="group inline-flex items-center gap-2 rounded-xl bg-[#17375e] px-4 py-2.5 text-xs font-semibold text-white shadow-md shadow-slate-900/15 transition hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-lg"
            >
              {nextAction.label} <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>

          {topGaps.length === 0 ? (
            <GlassPanel className="mt-3 flex items-center gap-3 border-emerald-200 bg-emerald-50/80 p-4 text-sm text-emerald-800">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-emerald-100"><CheckCircle2 size={18} /></span>
              <div>
                <div className="font-semibold">Priority blockers resolved</div>
                <div className="text-xs text-emerald-700/75">You can progress the working draft toward merchant-banker review.</div>
              </div>
            </GlassPanel>
          ) : (
            <ul className="mt-3 grid gap-2.5">
              {topGaps.map((gap, index) => {
                const critical = gap.severity === "Critical";
                const high = gap.severity === "High";
                return (
                  <li
                    key={`${gap.title}-${index}`}
                    className="group relative flex items-center gap-3 overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-r from-white to-slate-50/70 px-4 py-3 transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
                  >
                    <span className={`absolute inset-y-0 left-0 w-1 ${critical ? "bg-red-500" : high ? "bg-amber-500" : "bg-blue-500"}`} />
                    <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${critical ? "bg-red-50 text-red-600" : high ? "bg-amber-50 text-amber-600" : "bg-blue-50 text-blue-600"}`}>
                      {critical ? <CircleAlert size={17} /> : <ShieldAlert size={17} />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="mb-0.5 flex flex-wrap items-center gap-2">
                        <span className={`text-[9px] font-bold uppercase tracking-[0.12em] ${critical ? "text-red-600" : high ? "text-amber-600" : "text-blue-600"}`}>{gap.severity}</span>
                        <span className="text-[10px] text-slate-300">#{String(index + 1).padStart(2, "0")}</span>
                      </div>
                      <div className="text-[13px] font-semibold leading-snug text-slate-800">{gap.title}</div>
                      <div className="mt-0.5 truncate text-[10.5px] text-slate-400">Impacts: {gap.section}</div>
                    </div>
                    <Link
                      href={gap.href}
                      aria-label={`Resolve ${gap.title}`}
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-slate-200 bg-white text-blue-700 transition group-hover:border-blue-300 group-hover:bg-blue-50"
                    >
                      <ArrowRight size={14} />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

function ReadinessGauge({ score, assessed, color }: { score: number; assessed: boolean; color: string }) {
  const safeScore = Math.max(0, Math.min(score, 100));
  return (
    <div
      role="progressbar"
      aria-label="IPO readiness score"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={assessed ? safeScore : undefined}
      className="relative grid h-36 w-36 shrink-0 place-items-center rounded-full p-[10px] shadow-[0_18px_45px_rgba(2,20,40,0.28)]"
      style={{ background: `conic-gradient(${color} ${assessed ? safeScore * 3.6 : 12}deg, rgba(255,255,255,0.16) 0deg)` }}
    >
      <div className="absolute inset-[10px] rounded-full border border-white/10 bg-gradient-to-br from-[#102b4c] to-[#123a5d]" />
      <div className="relative text-center">
        <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-blue-200/75">Score</div>
        <div className="mt-0.5 text-4xl font-bold tabular-nums text-white">{assessed ? safeScore : "—"}</div>
        <div className="text-[10px] font-medium text-blue-100/60">out of 100</div>
      </div>
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  sub,
  tone,
  progress,
}: {
  icon: typeof FileCheck2;
  label: string;
  value: string | number;
  sub: string;
  tone: "blue" | "red" | "amber" | "emerald";
  progress?: number;
}) {
  const tones = {
    blue: { text: "text-blue-700", icon: "bg-blue-50 text-blue-700", wash: "from-blue-50/80", bar: "bg-blue-600" },
    red: { text: "text-red-600", icon: "bg-red-50 text-red-600", wash: "from-red-50/80", bar: "bg-red-500" },
    amber: { text: "text-amber-600", icon: "bg-amber-50 text-amber-600", wash: "from-amber-50/80", bar: "bg-amber-500" },
    emerald: { text: "text-emerald-600", icon: "bg-emerald-50 text-emerald-600", wash: "from-emerald-50/80", bar: "bg-emerald-500" },
  };
  const style = tones[tone];

  return (
    <div className={`relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br ${style.wash} to-white p-4 shadow-sm`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[9px] font-bold uppercase tracking-[0.13em] text-slate-400">{label}</div>
          <div className={`mt-1 text-2xl font-bold tabular-nums ${style.text}`}>{value}</div>
        </div>
        <span className={`grid h-9 w-9 place-items-center rounded-xl ${style.icon}`}><Icon size={17} /></span>
      </div>
      <div className="mt-1 text-[10.5px] text-slate-500">{sub}</div>
      {progress != null && (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div className={`h-full rounded-full ${style.bar}`} style={{ width: `${Math.max(0, Math.min(progress, 100))}%` }} />
        </div>
      )}
    </div>
  );
}
