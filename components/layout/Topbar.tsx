"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AlertTriangle, RefreshCw, Settings, Sparkles } from "lucide-react";

export default function Topbar({
  companyName, statusLine, aiReady,
}: { companyName: string | null; statusLine: string | null; aiReady: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const act = async (key: string, fn: () => Promise<Response>) => {
    setBusy(key);
    setErr(null);
    try {
      const res = await fn();
      if (!res.ok) setErr((await res.json()).error ?? "Action failed");
      router.refresh();
    } finally { setBusy(null); }
  };

  return (
    <header className="bg-[#fdfcf9] border-b border-stone-200 px-6 py-3 no-print sticky top-0 z-10">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          {companyName ? (
            <>
              <div className="font-medium text-slate-900 truncate">{companyName}</div>
              {statusLine && <div className="text-xs text-slate-500 truncate">{statusLine}</div>}
            </>
          ) : (
            <div className="text-sm text-slate-500">No company yet — start with Company Setup, then upload your documents</div>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {!aiReady && (
            <span className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200 rounded-lg">
              <AlertTriangle size={12} /> AI provider not configured — extraction &amp; generation limited
            </span>
          )}
          <button
            onClick={() => act("analysis", () => fetch("/api/analysis", { method: "POST" }))}
            disabled={!companyName || !!busy}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw size={13} className={busy === "analysis" ? "animate-spin" : ""} />
            {busy === "analysis" ? "Analysing…" : "Re-run Rules"}
          </button>
          <button
            onClick={() => act("draft", () => fetch("/api/draft", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }))}
            disabled={!companyName || !!busy || !aiReady}
            title={aiReady ? "Generate the blueprint-driven draft from your extracted facts" : "Configure an AI API key in .env.local to enable generation"}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium bg-gradient-to-r from-blue-600 to-sky-500 text-white rounded-lg shadow-sm shadow-blue-600/30 hover:shadow-md hover:shadow-blue-500/30 transition-shadow disabled:opacity-50"
          >
            <Sparkles size={13} />
            {busy === "draft" ? "Generating…" : "Generate Draft"}
          </button>
          <Link href="/settings" title="Settings (AI provider status, data management)"
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg">
            <Settings size={15} />
          </Link>
        </div>
      </div>
      {err && <div className="text-xs text-red-600 mt-1.5">{err}</div>}
    </header>
  );
}
