import { ShieldCheck, ShieldAlert, ShieldX, ShieldQuestion, type LucideIcon } from "lucide-react";
import type { DocumentAuthenticity } from "@/lib/types";

const MAP: Record<string, { icon: LucideIcon; cls: string; label: string }> = {
  clean: { icon: ShieldCheck, cls: "bg-emerald-50 text-emerald-700 border-emerald-200", label: "Authentic" },
  review: { icon: ShieldAlert, cls: "bg-amber-50 text-amber-700 border-amber-200", label: "Review" },
  flag: { icon: ShieldX, cls: "bg-red-50 text-red-700 border-red-200", label: "Flagged" },
  na: { icon: ShieldQuestion, cls: "bg-slate-50 text-slate-400 border-slate-200", label: "Not checked" },
};

/** Compact PDF-authenticity chip (green / amber / red), with the summary on hover. */
export default function AuthenticityBadge({ a }: { a?: DocumentAuthenticity }) {
  const m = MAP[a?.level ?? "na"] ?? MAP.na;
  const Icon = m.icon;
  return (
    <span
      title={a?.summary ?? "PDF authenticity not analysed"}
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${m.cls}`}
    >
      <Icon size={12} /> {m.label}
    </span>
  );
}
