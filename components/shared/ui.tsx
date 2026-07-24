import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

// ── Cards & layout ──────────────────────────────────────────────────────────

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-shadow ${className}`}>
      {children}
    </div>
  );
}

// ── Immersive "hero" surface (gradient backdrop + glass panels) ────────────
// Shared visual language for pages given the glassmorphism treatment
// (Assistant, Company Setup, …) — a soft gradient stage with a faint
// capital-markets scene in the idle corner, echoing the sidebar's brand
// illustration, with translucent frosted panels floating on top.

/** Faint skyline / candlestick / growth-curve scene for hero backdrops. */
export function HeroScene() {
  return (
    <svg viewBox="0 0 420 220" className="w-full h-full" aria-hidden>
      <g fill="#1e3a5f">
        <rect x="10" y="120" width="30" height="100" opacity="0.10" rx="2" />
        <rect x="48" y="86" width="38" height="134" opacity="0.14" rx="2" />
        <rect x="94" y="140" width="26" height="80" opacity="0.09" rx="2" />
        <rect x="128" y="104" width="34" height="116" opacity="0.13" rx="2" />
        <rect x="170" y="150" width="24" height="70" opacity="0.08" rx="2" />
      </g>
      <g stroke="#3b82f6" strokeWidth="2" opacity="0.28">
        {[[300, 128, 158], [318, 108, 148], [336, 122, 152], [354, 92, 132], [372, 104, 140]].map(([x, top, bot]) => (
          <g key={x}>
            <line x1={x} y1={top - 8} x2={x} y2={bot + 8} />
            <rect x={x - 5} y={top} width="10" height={bot - top} fill="#eff6ff" />
          </g>
        ))}
      </g>
      <path
        d="M8,200 C 90,190 160,170 220,140 C 280,110 330,80 400,50"
        fill="none" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" opacity="0.3"
      />
    </svg>
  );
}

/** Gradient stage — wrap page content that should get the immersive hero treatment. */
export function HeroBackdrop({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#7fb0ea] via-[#9dc4ef] to-[#4f80c9] border border-white/60 shadow-[0_10px_36px_rgba(20,45,80,0.28)] ${className}`}>
      <div className="pointer-events-none absolute -left-16 -top-20 w-72 h-72 bg-white/25 rounded-full blur-3xl" />
      <div className="pointer-events-none absolute right-10 -top-10 w-56 h-56 bg-sky-200/40 rounded-full blur-3xl" />
      <div className="pointer-events-none absolute left-1/3 top-1/3 w-72 h-72 bg-violet-400/25 rounded-full blur-3xl" />
      <div className="pointer-events-none absolute right-1/4 bottom-1/4 w-64 h-64 bg-teal-300/25 rounded-full blur-3xl" />
      <div className="pointer-events-none absolute right-0 bottom-0 w-[380px] h-[200px] opacity-30">
        <HeroScene />
      </div>
      <div className="relative">{children}</div>
    </div>
  );
}

/** Translucent, blurred card floating on a HeroBackdrop. */
export function GlassPanel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl bg-white/80 backdrop-blur-md border border-white/60 shadow-lg shadow-blue-900/10 ${className}`}>
      {children}
    </div>
  );
}

/** Glass stat tile — the StatCard equivalent for HeroBackdrop pages. Tinted by tone so good/bad reads at a glance. */
export function GlassStat({
  label, value, sub, tone = "default",
}: { label: string; value: ReactNode; sub?: string; tone?: "default" | "good" | "warn" | "bad" }) {
  const toneCls = { default: "text-[#1e3a5f]", good: "text-emerald-700", warn: "text-amber-700", bad: "text-red-700" }[tone];
  const barCls = { default: "bg-gradient-to-r from-blue-500 to-sky-400", good: "bg-gradient-to-r from-emerald-500 to-teal-400", warn: "bg-gradient-to-r from-amber-500 to-yellow-400", bad: "bg-gradient-to-r from-red-500 to-rose-400" }[tone];
  const washCls = {
    default: "!bg-gradient-to-br !from-blue-100 !to-white/70 !border-blue-200/80 !shadow-blue-900/[0.08]",
    good: "!bg-gradient-to-br !from-emerald-100 !to-white/70 !border-emerald-200/80 !shadow-emerald-500/[0.15]",
    warn: "!bg-gradient-to-br !from-amber-100 !to-white/70 !border-amber-200/80 !shadow-amber-500/[0.15]",
    bad: "!bg-gradient-to-br !from-red-100 !to-white/70 !border-red-200/80 !shadow-red-500/[0.15]",
  }[tone];
  return (
    <GlassPanel className={`p-4 relative overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-lg ${washCls}`}>
      <span className={`absolute inset-x-0 top-0 h-0.5 ${barCls}`} />
      <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</div>
      <div className={`text-2xl font-semibold mt-1 ${toneCls}`}>{value}</div>
      {sub && <div className="text-xs text-slate-500 mt-1">{sub}</div>}
    </GlassPanel>
  );
}

/** Gradient icon badge used in hero headers (Bot, Sparkles, section icons…). */
export function HeroIconBadge({
  icon: Icon, size = 17,
}: { icon: LucideIcon; size?: number }) {
  return (
    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-blue-600 to-sky-500 shadow-md shadow-blue-500/30">
      <Icon size={size} className="text-white" />
    </span>
  );
}

export function PageHeader({
  title, subtitle, actions,
}: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500 mt-1 max-w-3xl">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
    </div>
  );
}

export function StatCard({
  label, value, sub, tone = "default",
}: { label: string; value: ReactNode; sub?: string; tone?: "default" | "good" | "warn" | "bad" }) {
  const toneCls = { default: "text-slate-900", good: "text-emerald-700", warn: "text-amber-700", bad: "text-red-700" }[tone];
  const barCls = { default: "bg-gradient-to-r from-blue-500 to-sky-400", good: "bg-gradient-to-r from-emerald-500 to-teal-400", warn: "bg-gradient-to-r from-amber-500 to-yellow-400", bad: "bg-gradient-to-r from-red-500 to-rose-400" }[tone];
  return (
    <Card className="p-4 relative overflow-hidden">
      <span className={`absolute inset-x-0 top-0 h-0.5 ${barCls}`} />
      <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</div>
      <div className={`text-2xl font-semibold mt-1 ${toneCls}`}>{value}</div>
      {sub && <div className="text-xs text-slate-500 mt-1">{sub}</div>}
    </Card>
  );
}

// ── Badges ──────────────────────────────────────────────────────────────────

const badgeTones: Record<string, string> = {
  green: "bg-emerald-50 text-emerald-700 border-emerald-200",
  yellow: "bg-amber-50 text-amber-800 border-amber-200",
  red: "bg-red-50 text-red-700 border-red-200",
  grey: "bg-slate-100 text-slate-600 border-slate-200",
  blue: "bg-blue-50 text-blue-700 border-blue-200",
  navy: "bg-slate-800 text-white border-slate-800",
};

export function Badge({ tone = "grey", children }: { tone?: keyof typeof badgeTones; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border whitespace-nowrap ${badgeTones[tone]}`}>
      {children}
    </span>
  );
}

export function SeverityBadge({ severity }: { severity: string }) {
  const tone = severity === "Critical" ? "red" : severity === "High" ? "red" : severity === "Medium" ? "yellow" : "grey";
  return <Badge tone={tone as keyof typeof badgeTones}>{severity}</Badge>;
}

export function CheckStatusBadge({ status }: { status: string }) {
  const map: Record<string, { tone: keyof typeof badgeTones; label: string }> = {
    pass: { tone: "green", label: "Pass" },
    warning: { tone: "yellow", label: "Warning" },
    fail: { tone: "red", label: "Fail" },
    missing: { tone: "grey", label: "Missing Data" },
  };
  const m = map[status] ?? { tone: "grey", label: status };
  return <Badge tone={m.tone}>{m.label}</Badge>;
}

export function DocStatusBadge({ status }: { status: string }) {
  const tone =
    status === "Complete" ? "green"
      : status === "Missing" ? "grey"
        : status === "Inconsistent" ? "red"
          : status === "Pending MB Review" ? "blue"
            : "yellow";
  return <Badge tone={tone as keyof typeof badgeTones}>{status}</Badge>;
}

export function ReviewStatusBadge({ status }: { status: string }) {
  const tone =
    status === "Approved" || status === "Final Draft Ready" ? "green"
      : status === "Changes Requested" ? "red"
        : status === "MB Review Pending" ? "blue"
          : status === "AI Drafted" || status === "Promoter Reviewed" ? "yellow"
            : "grey";
  return <Badge tone={tone as keyof typeof badgeTones}>{status}</Badge>;
}

// ── Progress & score ────────────────────────────────────────────────────────

export function ProgressBar({ value, tone }: { value: number; tone?: "auto" | "blue" }) {
  const color =
    tone === "blue" ? "bg-blue-600"
      : value >= 75 ? "bg-emerald-600" : value >= 40 ? "bg-amber-500" : "bg-red-600";
  return (
    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}

export function ScoreDonut({ score, size = 120, label }: { score: number; size?: number; label?: string }) {
  const r = (size - 14) / 2;
  const c = 2 * Math.PI * r;
  const color = score >= 75 ? "#059669" : score >= 50 ? "#d97706" : "#dc2626";
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <div className="absolute inset-3 rounded-full blur-xl opacity-40" style={{ backgroundColor: color }} />
      <svg width={size} height={size} className="-rotate-90 relative">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e2e8f0" strokeWidth="10" />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="10"
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - score / 100)}
        />
      </svg>
      <div className="absolute text-center">
        <div className="text-2xl font-bold text-slate-900">{score}</div>
        <div className="text-[10px] text-slate-500 uppercase tracking-wide">{label ?? "/100"}</div>
      </div>
    </div>
  );
}

// ── Empty state & disclaimers ───────────────────────────────────────────────

export function EmptyState({
  title, message, showOnboardCta = true,
}: { title: string; message: string; showOnboardCta?: boolean }) {
  return (
    <Card className="p-10 text-center">
      <div className="text-4xl mb-3">📄</div>
      <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
      <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">{message}</p>
      {showOnboardCta && (
        <div className="flex justify-center gap-3 mt-5">
          <Link href="/onboarding" className="px-4 py-2 bg-slate-800 text-white text-sm rounded-lg hover:bg-slate-700">
            Start Company Setup
          </Link>
          <Link href="/data-room" className="px-4 py-2 border border-slate-300 text-sm rounded-lg hover:bg-slate-50">
            Upload Documents
          </Link>
        </div>
      )}
    </Card>
  );
}

export function DisclaimerBar() {
  return (
    <p className="text-[11px] leading-relaxed text-slate-400 border-t border-slate-200 pt-3 mt-10">
      <strong>Disclaimer:</strong> SIIM is an AI-assisted draft preparation tool. It does not constitute legal,
      investment, accounting or regulatory advice, and does not replace SEBI-registered merchant bankers, legal counsel,
      auditors or regulatory filing processes. All generated content requires professional review. Estimates are
      illustrative, not guarantees. Nothing here means &ldquo;ready to file with SEBI&rdquo; — at best it means
      &ldquo;ready for merchant banker review&rdquo;.
    </p>
  );
}

export function AiNote({ confidence }: { confidence?: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-500">
      <span className="px-1.5 py-0.5 rounded bg-violet-50 text-violet-700 border border-violet-200 font-medium">AI-generated</span>
      <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 font-medium">Needs professional review</span>
      {confidence !== undefined && <span>Source confidence: {confidence}%</span>}
    </span>
  );
}
