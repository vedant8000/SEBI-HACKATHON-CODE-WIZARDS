"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircle2, Flag, RotateCcw } from "lucide-react";
import type { BankerFlag } from "@/lib/types";
import { Badge, Card, SeverityBadge } from "@/components/shared/ui";

const typeLabel: Record<BankerFlag["targetType"], string> = {
  document: "Document",
  fact: "Extracted fact",
  gap: "Gap",
  section: "Draft section",
  general: "General",
};

/** The banker's raised corrections, with status control (reopen / close). */
export default function FlagsPanel({ flags }: { flags: BankerFlag[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  const setStatus = async (id: string, status: "OPEN" | "ADDRESSED") => {
    setBusy(id);
    try {
      await fetch("/api/banker/flags", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      router.refresh();
    } finally { setBusy(null); }
  };

  if (!flags.length) {
    return (
      <Card className="p-6 text-center text-sm text-slate-400">
        No corrections raised yet. Use <span className="inline-flex items-center gap-1 text-amber-700"><Flag size={12} /> Flag for correction</span> on
        any document, fact or issue to pinpoint what the promoter must fix.
      </Card>
    );
  }

  return (
    <div className="space-y-2.5">
      {flags.map((f) => (
        <Card key={f.id} className={`p-4 ${f.status === "ADDRESSED" ? "opacity-70" : ""}`}>
          <div className="flex flex-wrap items-center gap-2">
            <SeverityBadge severity={f.severity} />
            <Badge tone="blue">{typeLabel[f.targetType]}</Badge>
            <span className="text-sm font-semibold text-slate-800">{f.targetLabel}</span>
            <span className="ml-auto flex items-center gap-2">
              <Badge tone={f.status === "OPEN" ? "yellow" : "green"}>
                {f.status === "OPEN" ? "Awaiting promoter" : "Addressed"}
              </Badge>
              {f.status === "ADDRESSED" ? (
                <button
                  onClick={() => setStatus(f.id, "OPEN")}
                  disabled={busy === f.id}
                  className="inline-flex items-center gap-1 text-xs text-amber-700 hover:underline disabled:opacity-50"
                  title="Not fixed properly — reopen"
                >
                  <RotateCcw size={12} /> Reopen
                </button>
              ) : (
                <button
                  onClick={() => setStatus(f.id, "ADDRESSED")}
                  disabled={busy === f.id}
                  className="inline-flex items-center gap-1 text-xs text-emerald-700 hover:underline disabled:opacity-50"
                  title="Verified fixed — close this flag"
                >
                  <CheckCircle2 size={12} /> Mark resolved
                </button>
              )}
            </span>
          </div>
          <p className="text-[13px] text-slate-600 mt-1.5">{f.message}</p>
          <p className="text-[11px] text-slate-400 mt-1">
            {f.author} · {new Date(f.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
          </p>
        </Card>
      ))}
    </div>
  );
}
