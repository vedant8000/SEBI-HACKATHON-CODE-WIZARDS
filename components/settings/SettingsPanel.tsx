"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Card } from "@/components/shared/ui";

export default function SettingsPanel({
  companies, activeId,
}: { companies: { id: string; name: string }[]; activeId: string | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  const reset = async () => {
    if (!confirm("Delete ALL companies, documents, facts and analysis? This cannot be undone.")) return;
    setBusy("reset");
    try { await fetch("/api/reset", { method: "DELETE" }); router.refresh(); } finally { setBusy(null); }
  };

  const activate = async (id: string) => {
    setBusy(id);
    try {
      await fetch("/api/companies", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "activate", id }) });
      router.refresh();
    } finally { setBusy(null); }
  };

  return (
    <Card className="p-5">
      <h3 className="text-sm font-semibold text-slate-800 mb-2">Companies</h3>
      {companies.length === 0 ? (
        <p className="text-sm text-slate-400 mb-4">No companies yet — create one in Company Setup.</p>
      ) : (
        <div className="space-y-2 mb-4">
          {companies.map((c) => (
            <div key={c.id} className={`flex items-center justify-between px-3 py-2 rounded-lg border ${c.id === activeId ? "border-blue-400 bg-blue-50" : "border-slate-200"}`}>
              <span className="text-sm font-medium text-slate-700">
                {c.name}
                {c.id === activeId && <span className="text-[10px] text-blue-600 ml-2">active</span>}
              </span>
              {c.id !== activeId && (
                <button onClick={() => activate(c.id)} className="text-xs text-blue-600 hover:underline" disabled={!!busy}>
                  {busy === c.id ? "Switching…" : "Make active"}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      <button onClick={reset} disabled={!!busy}
        className="inline-flex items-center gap-1.5 px-4 py-2 border border-red-300 text-red-700 text-sm rounded-lg hover:bg-red-50 disabled:opacity-50">
        <Trash2 size={14} /> {busy === "reset" ? "Resetting…" : "Reset all data"}
      </button>
    </Card>
  );
}
