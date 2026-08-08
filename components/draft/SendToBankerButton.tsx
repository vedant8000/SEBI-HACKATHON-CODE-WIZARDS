"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircle2, Loader2, Send } from "lucide-react";

/**
 * One-click "send the whole generated draft to the merchant banker". Inactive
 * until the draft has been generated; once sent, it locks into a confirmed state
 * and the promoter journey's final step ("Sent for MB Review") is marked done.
 */
export default function SendToBankerButton({ canSend, alreadySent }: { canSend: boolean; alreadySent: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(alreadySent);
  const [err, setErr] = useState<string | null>(null);

  const send = async () => {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/draft/send-review", { method: "POST" });
      if (res.ok) { setSent(true); router.refresh(); }
      else setErr((await res.json().catch(() => ({}))).error ?? "Could not send for review.");
    } catch {
      setErr("Could not send for review.");
    } finally { setBusy(false); }
  };

  if (sent) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg">
        <CheckCircle2 size={13} /> Sent for MB review
      </span>
    );
  }

  return (
    <span className="inline-flex flex-col items-start gap-0.5">
      <button
        onClick={send}
        disabled={!canSend || busy}
        title={canSend ? "Send the generated draft to your merchant banker for review" : "Generate the draft first to enable this"}
        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold bg-gradient-to-r from-blue-600 to-sky-500 text-white rounded-lg ring-1 ring-sky-300/60 shadow-sm shadow-blue-600/30 hover:shadow-md hover:shadow-blue-500/30 transition-shadow cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
      >
        {busy ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
        {busy ? "Sending…" : "Send to Merchant Banker Review"}
      </button>
      {err && <span className="text-[11px] text-red-600">{err}</span>}
    </span>
  );
}
