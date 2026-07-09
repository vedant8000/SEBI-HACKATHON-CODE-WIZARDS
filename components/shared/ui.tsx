import Link from "next/link";
import type { ReactNode } from "react";

// ── Cards & layout ──────────────────────────────────────────────────────────

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`bg-white border border-slate-200 rounded-xl shadow-sm ${className}`}>
      {children}
    </div>
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
  return (
    <Card className="p-4">
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
      <svg width={size} height={size} className="-rotate-90">
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
            Create Company Profile
          </Link>
          <Link href="/settings" className="px-4 py-2 border border-slate-300 text-sm rounded-lg hover:bg-slate-50">
            Load Demo Company
          </Link>
        </div>
      )}
    </Card>
  );
}

export function DisclaimerBar() {
  return (
    <p className="text-[11px] leading-relaxed text-slate-400 border-t border-slate-200 pt-3 mt-10">
      <strong>Disclaimer:</strong> IPO Saathi is an AI-assisted draft preparation tool. It does not constitute legal,
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
