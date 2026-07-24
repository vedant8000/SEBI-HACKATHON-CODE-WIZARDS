"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { KeyRound, Link2, Loader2 } from "lucide-react";
import { Card } from "@/components/shared/ui";

/**
 * The banker's entry point: enter the company code the promoter shared
 * (shown on their Company Setup / Settings page) to link this account to
 * that company's filing.
 */
export default function LinkCompanyForm({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [linked, setLinked] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/banker/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error ?? "Could not link. Please try again."); return; }
      setLinked(data.company?.name ?? "company");
      setCode("");
      router.refresh();
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const form = (
    <form onSubmit={submit} className="flex flex-wrap items-center gap-2">
      <div className="relative">
        <KeyRound size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="SIIM-XXXXXX"
          className="pl-9 pr-3 py-2.5 text-sm font-mono tracking-wider border border-slate-300 rounded-xl bg-white w-52 focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-600"
        />
      </div>
      <button
        type="submit"
        disabled={busy || !code.trim()}
        className="flex items-center gap-1.5 px-4 py-2.5 bg-[#1e3a5f] text-white text-sm font-semibold rounded-xl hover:bg-[#24466f] transition-colors disabled:opacity-50"
      >
        {busy ? <Loader2 size={14} className="animate-spin" /> : <Link2 size={14} />}
        {busy ? "Linking…" : "Link company"}
      </button>
    </form>
  );

  if (compact) {
    return (
      <div>
        {form}
        {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
        {linked && <p className="text-sm text-emerald-600 mt-2">Linked to {linked} ✓</p>}
      </div>
    );
  }

  return (
    <Card className="p-8 max-w-xl mx-auto text-center">
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-blue-50 border border-blue-100 text-[#1e3a5f] mb-3">
        <KeyRound size={20} />
      </span>
      <h2 className="text-lg font-semibold text-slate-800">Link to a company filing</h2>
      <p className="text-sm text-slate-500 mt-1.5 mb-5 max-w-md mx-auto">
        Ask the promoter for their <strong>company code</strong> — it is shown on their Company Setup and
        Settings pages (format <span className="font-mono">SIIM-XXXXXX</span>). Entering it gives you review
        access to their uploaded documents, extracted facts, issues and draft.
      </p>
      <div className="flex justify-center">{form}</div>
      {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
      {linked && <p className="text-sm text-emerald-600 mt-3">Linked to {linked} ✓</p>}
    </Card>
  );
}
