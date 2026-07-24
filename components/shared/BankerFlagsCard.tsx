"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircle2, Flag } from "lucide-react";
import type { BankerFlag } from "@/lib/types";
import { Badge, Card, SeverityBadge } from "@/components/shared/ui";

/**
 * Promoter-side view of the merchant banker's correction flags. Shown on the
 * page whose items the flags point at (documents → Data Room, facts →
 * Evidence, gaps → Intelligence, sections → Draft). The promoter fixes the
 * item and marks the flag addressed; the banker can verify and re-open.
 */
export default function BankerFlagsCard({ flags, title }: { flags: BankerFlag[]; title?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const open = flags.filter((f) => f.status === "OPEN");
  const addressed = flags.filter((f) => f.status === "ADDRESSED");

  if (!flags.length) return null;

  const markAddressed = async (id: string) => {
    setBusy(id);
    try {
      await fetch("/api/banker/flags", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: "ADDRESSED" }),
      });
      router.refresh();
    } finally { setBusy(null); }
  };

  return (
    <Card className={`p-5 mb-5 ${open.length ? "border-amber-300 bg-amber-50/60" : "border-emerald-200"}`}>
      <div className="flex items-center gap-2 mb-3">
        <Flag size={15} className={open.length ? "text-amber-600" : "text-emerald-600"} />
        <h3 className="text-sm font-semibold text-slate-800">
          {title ?? "Corrections from your merchant banker"}
        </h3>
        {open.length > 0 && <Badge tone="yellow">{open.length} open</Badge>}
        {addressed.length > 0 && <Badge tone="green">{addressed.length} addressed</Badge>}
      </div>
      {open.length === 0 ? (
        <p className="text-[13px] text-emerald-700">All corrections here are marked addressed — awaiting banker verification.</p>
      ) : (
        <div className="space-y-2.5">
          {open.map((f) => (
            <div key={f.id} className="bg-white border border-amber-200 rounded-xl px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <SeverityBadge severity={f.severity} />
                <span className="text-[13px] font-semibold text-slate-800">{f.targetLabel}</span>
                <button
                  onClick={() => markAddressed(f.id)}
                  disabled={busy === f.id}
                  className="ml-auto inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium border border-emerald-300 text-emerald-700 rounded-lg hover:bg-emerald-50 disabled:opacity-50"
                >
                  <CheckCircle2 size={12} /> {busy === f.id ? "Saving…" : "Mark addressed"}
                </button>
              </div>
              <p className="text-[13px] text-slate-600 mt-1">{f.message}</p>
              <p className="text-[11px] text-slate-400 mt-1">
                {f.author} · {new Date(f.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
              </p>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
