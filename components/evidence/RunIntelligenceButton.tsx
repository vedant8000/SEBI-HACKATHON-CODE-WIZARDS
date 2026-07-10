"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { BrainCircuit, Loader2 } from "lucide-react";

/** Re-runs the rule engine on the reviewed facts, then opens IPO Intelligence. */
export default function RunIntelligenceButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true);
    try {
      await fetch("/api/analysis", { method: "POST" });
      router.push("/intelligence");
    } finally { setBusy(false); }
  };
  return (
    <button onClick={run} disabled={busy}
      className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50">
      {busy ? <Loader2 size={14} className="animate-spin" /> : <BrainCircuit size={14} />}
      {busy ? "Running…" : "Run IPO Intelligence"}
    </button>
  );
}
