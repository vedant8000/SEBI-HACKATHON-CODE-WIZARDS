"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AlertTriangle, RefreshCw, Settings, Sparkles } from "lucide-react";
import { useT } from "@/components/i18n/LanguageProvider";

export default function Topbar({
  companyName, readiness, statusDetail, aiReady,
}: {
  companyName: string | null;
  /** Overall readiness score (0–100) once analysis has run, else null. */
  readiness: number | null;
  /** Dynamic, AI/rule-derived one-line status; shown after the readiness score. */
  statusDetail: string | null;
  aiReady: boolean;
}) {
  const router = useRouter();
  const t = useT();
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // "Readiness 72/100 · <detail>" once analysis has run; otherwise a prompt.
  const statusLine =
    readiness !== null
      ? `${t("topbar.readiness")} ${readiness}/100${statusDetail ? ` · ${statusDetail}` : ""}`
      : companyName
        ? t("topbar.analysisNotRun")
        : null;

  const act = async (key: string, fn: () => Promise<Response>) => {
    setBusy(key);
    setErr(null);
    try {
      const res = await fn();
      if (!res.ok) setErr((await res.json()).error ?? t("topbar.actionFailed"));
      router.refresh();
    } finally { setBusy(null); }
  };

  return (
    <header className="bg-[#f6f9fc] border-b border-slate-200 px-6 py-3 no-print sticky top-0 z-10">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          {companyName ? (
            <>
              <div className="font-bold font-serif text-lg text-[#1e3a5f] tracking-tight truncate">{companyName}</div>
              {statusLine && <div className="text-xs text-slate-500 truncate">{statusLine}</div>}
            </>
          ) : (
            <div className="text-sm text-slate-500">{t("topbar.noCompany")}</div>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {!aiReady && (
            <span className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200 rounded-lg">
              <AlertTriangle size={12} /> {t("topbar.aiWarn")}
            </span>
          )}
          <button
            onClick={() => act("analysis", () => fetch("/api/analysis", { method: "POST" }))}
            disabled={!companyName || !!busy}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-[#1e3a5f] text-white rounded-lg shadow-sm shadow-[#1e3a5f]/25 hover:bg-[#24466f] transition-colors disabled:opacity-50"
          >
            <RefreshCw size={13} className={busy === "analysis" ? "animate-spin" : ""} />
            {busy === "analysis" ? t("topbar.analysing") : t("topbar.rerun")}
          </button>
          <button
            onClick={() => act("draft", () => fetch("/api/draft", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }))}
            disabled={!companyName || !!busy || !aiReady}
            title={aiReady ? t("topbar.genTooltipReady") : t("topbar.genTooltipNo")}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-gradient-to-r from-blue-600 to-sky-500 text-white rounded-lg ring-1 ring-sky-300/60 shadow-sm shadow-blue-600/30 hover:shadow-md hover:shadow-blue-500/30 transition-shadow disabled:opacity-50"
          >
            <Sparkles size={13} />
            {busy === "draft" ? t("topbar.generating") : t("topbar.generate")}
          </button>
          <Link href="/settings" title={t("topbar.settingsTooltip")}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg">
            <Settings size={15} />
          </Link>
        </div>
      </div>
      {err && <div className="text-xs text-red-600 mt-1.5">{err}</div>}
    </header>
  );
}
