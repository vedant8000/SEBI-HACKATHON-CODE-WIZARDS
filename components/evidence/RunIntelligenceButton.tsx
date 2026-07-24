"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { BrainCircuit, Loader2 } from "lucide-react";
import { useT } from "@/components/i18n/LanguageProvider";

/** Re-runs the rule engine on the reviewed facts, then opens IPO Intelligence. */
export default function RunIntelligenceButton() {
  const router = useRouter();
  const t = useT();
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
      className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-blue-600 to-sky-500 text-white text-sm font-medium rounded-lg shadow-sm shadow-blue-600/30 hover:shadow-md transition-shadow disabled:opacity-50">
      {busy ? <Loader2 size={14} className="animate-spin" /> : <BrainCircuit size={14} />}
      {busy ? t("ri.running") : t("ri.run")}
    </button>
  );
}
