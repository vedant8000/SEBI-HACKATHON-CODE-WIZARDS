"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Flag, Loader2 } from "lucide-react";
import type { FlagTargetType, Severity } from "@/lib/types";

/**
 * Inline "pinpoint a correction" composer. Renders a small Flag button that
 * expands into a message + severity form and POSTs to /api/banker/flags.
 * Used on documents, facts, gaps, inconsistencies and draft sections.
 */
export default function FlagForm({
  companyId, targetType, targetId, targetLabel,
}: {
  companyId: string;
  targetType: FlagTargetType;
  targetId: string | null;
  targetLabel: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [severity, setSeverity] = useState<Severity>("Medium");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/banker/flags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, targetType, targetId, targetLabel, message, severity }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error ?? "Could not raise the flag."); return; }
      setDone(true);
      setMessage("");
      setOpen(false);
      setTimeout(() => setDone(false), 2500);
      router.refresh();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="inline-block text-left">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg border transition-colors ${
          open
            ? "bg-amber-100 border-amber-300 text-amber-900"
            : "border-amber-300 text-amber-700 hover:bg-amber-50"
        }`}
        title={`Flag "${targetLabel}" for correction`}
      >
        <Flag size={12} /> {done ? "Flagged ✓" : "Flag for correction"}
      </button>
      {open && (
        <div className="mt-2 p-3 bg-amber-50/70 border border-amber-200 rounded-xl w-full min-w-[280px] max-w-md space-y-2">
          <div className="text-[11px] font-semibold text-amber-800">
            Correction on: <span className="font-normal">{targetLabel}</span>
          </div>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            placeholder="What must the promoter correct, and how? e.g. 'Litigation declaration says NIL but the GST demand of ₹0.18 Cr must be disclosed — re-execute the declaration and add the matter to Outstanding Litigation.'"
            className="w-full px-3 py-2 text-[13px] border border-amber-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-400/40"
          />
          <div className="flex items-center gap-2">
            <select
              value={severity}
              onChange={(e) => setSeverity(e.target.value as Severity)}
              className="px-2 py-1.5 text-xs border border-amber-300 rounded-lg bg-white"
            >
              <option>Critical</option><option>High</option><option>Medium</option><option>Low</option>
            </select>
            <button
              type="button"
              onClick={submit}
              disabled={busy || !message.trim()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 text-white text-xs font-semibold rounded-lg hover:bg-amber-700 disabled:opacity-50"
            >
              {busy ? <Loader2 size={12} className="animate-spin" /> : <Flag size={12} />}
              Send to promoter
            </button>
            <button type="button" onClick={() => setOpen(false)} className="px-2 py-1.5 text-xs text-slate-500 hover:text-slate-700">
              Cancel
            </button>
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
      )}
    </div>
  );
}
