"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import type { Company, FinancialYear } from "@/lib/types";
import type { ParsedProfile } from "@/lib/document-processing/profile-parser";
import {
  Building2, Target, BarChart3, ShieldCheck, Save, ArrowRight,
  Wand2, FileUp, Loader2, CheckCircle2,
  type LucideIcon,
} from "lucide-react";

const emptyFy = (fy: string): FinancialYear => ({
  fy, revenueCr: null, patCr: null, ebitdaCr: null, netWorthCr: null,
  borrowingsCr: null, receivablesCr: null, cfoCr: null,
});

const currentFy = new Date().getFullYear() + (new Date().getMonth() >= 3 ? 0 : -1);
const defaultYears = [currentFy - 2, currentFy - 1, currentFy].map((y) => emptyFy(`FY${y}`));

const KEY_LABELS: Record<string, string> = {
  name: "Company name", cin: "CIN", industry: "Industry", city: "City", state: "State",
  yearOfIncorporation: "Year of incorporation", promoterName: "Promoter name",
  promoterExperienceYears: "Promoter experience", issueSizeCr: "Issue size",
  freshIssueCr: "Fresh issue", ofsCr: "Offer for sale", proposedListingExchange: "Exchange",
  top3CustomerPct: "Top-3 customers %", independentDirectorsAppointed: "Independent directors",
  auditCommitteeConstituted: "Audit committee", pendingLitigationNote: "Litigation note",
};
const prettyKey = (k: string) => (k.startsWith("fy:") ? `${k.slice(3)} financials` : KEY_LABELS[k] ?? k);

function Field({
  label, help, children,
}: { label: string; help?: string; children: React.ReactNode }) {
  // h-full + mt-auto pin the control to the bottom of its grid cell, so every
  // input in a row sits on the same line regardless of label/help wrapping.
  return (
    <label className="flex h-full flex-col">
      <span className="text-[13px] font-semibold text-[#1e3a5f]">{label}</span>
      {help && <span className="block text-[11px] text-slate-400 mb-1">{help}</span>}
      <span className="mt-auto block">{children}</span>
    </label>
  );
}

/** Section card matching the reference mock: icon badge + numbered title. */
function SectionCard({
  icon: Icon, title, sub, accent = false, children, className = "",
}: {
  icon: LucideIcon; title: string; sub?: string; accent?: boolean;
  children: React.ReactNode; className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border border-slate-200 bg-[#f7fafd] shadow-sm p-5 ${
        accent ? "border-t-4 border-t-blue-500" : ""
      } ${className}`}
    >
      <div className="flex items-center gap-3 mb-4">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-blue-50 border border-blue-100 text-[#1e3a5f]">
          <Icon size={17} />
        </span>
        <div>
          <h3 className="text-[15px] font-bold text-[#1e3a5f]">{title}</h3>
          {sub && <p className="text-xs text-slate-400">{sub}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

const inputCls =
  "mt-1 w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-600 transition-colors";

export default function OnboardingForm({ existing }: { existing: Company | null }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [f, setF] = useState({
    name: existing?.name ?? "",
    cin: existing?.cin ?? "",
    industry: existing?.industry ?? "",
    city: existing?.city ?? "",
    state: existing?.state ?? "",
    yearOfIncorporation: existing?.yearOfIncorporation?.toString() ?? "",
    promoterName: existing?.promoterName ?? "",
    promoterExperienceYears: existing?.promoterExperienceYears?.toString() ?? "",
    issueSizeCr: existing?.issueSizeCr?.toString() ?? "",
    freshIssueCr: existing?.freshIssueCr?.toString() ?? "",
    ofsCr: existing?.ofsCr?.toString() ?? "",
    proposedListingExchange: existing?.proposedListingExchange ?? "NSE Emerge / BSE SME",
    top3CustomerPct: existing?.top3CustomerPct?.toString() ?? "",
    independentDirectorsAppointed: existing?.independentDirectorsAppointed,
    auditCommitteeConstituted: existing?.auditCommitteeConstituted,
    pendingLitigationNote: existing?.pendingLitigationNote ?? "",
  });
  const [fin, setFin] = useState<FinancialYear[]>(
    existing?.financials?.length ? existing.financials : defaultYears
  );

  const setFinVal = (i: number, key: keyof FinancialYear, v: string) =>
    setFin((prev) => prev.map((row, j) => (j === i ? { ...row, [key]: v === "" ? null : key === "fy" ? v : Number(v) } : row)));

  // ── Auto-fill from uploaded documents ──
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [parseErr, setParseErr] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParsedProfile | null>(null);
  const [filled, setFilled] = useState<Set<string>>(new Set());
  // Files dropped here are retained so they can be persisted + analysed for the
  // company when the promoter saves — the single upload point for the app.
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

  const autofill = async (files: FileList | File[]) => {
    if (!files.length) return;
    setParsing(true);
    setParseErr(null);
    try {
      const fd = new FormData();
      [...files].forEach((file) => fd.append("files", file));
      const res = await fetch("/api/companies/parse", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) { setParseErr(data.error ?? "Could not read those documents."); return; }
      applyParsed(data as ParsedProfile);
      // retain the files (dedupe by name+size) to upload on save
      setPendingFiles((prev) => {
        const seen = new Set(prev.map((f) => `${f.name}:${f.size}`));
        return [...prev, ...[...files].filter((f) => !seen.has(`${f.name}:${f.size}`))];
      });
    } catch {
      setParseErr("Parsing failed — please try again.");
    } finally {
      setParsing(false);
    }
  };

  /** Merge parser suggestions into the form; the promoter reviews before saving. */
  const applyParsed = (p: ParsedProfile) => {
    const touched = new Set<string>();
    const pr = p.profile;
    setF((prev) => {
      const next = { ...prev };
      const put = (k: keyof typeof prev, v: string | boolean | null | undefined) => {
        if (v === undefined || v === null || v === "") return;
        (next as Record<string, unknown>)[k] = v;
        touched.add(k as string);
      };
      put("name", pr.name);
      put("cin", pr.cin);
      put("industry", pr.industry);
      put("city", pr.city);
      put("state", pr.state);
      put("yearOfIncorporation", pr.yearOfIncorporation?.toString());
      put("promoterName", pr.promoterName);
      put("promoterExperienceYears", pr.promoterExperienceYears?.toString());
      put("issueSizeCr", pr.issueSizeCr?.toString());
      put("freshIssueCr", pr.freshIssueCr?.toString());
      put("ofsCr", pr.ofsCr?.toString());
      put("proposedListingExchange", pr.proposedListingExchange);
      put("top3CustomerPct", pr.top3CustomerPct?.toString());
      if (pr.independentDirectorsAppointed !== undefined) put("independentDirectorsAppointed", pr.independentDirectorsAppointed);
      if (pr.auditCommitteeConstituted !== undefined) put("auditCommitteeConstituted", pr.auditCommitteeConstituted);
      put("pendingLitigationNote", pr.pendingLitigationNote);
      return next;
    });

    if (p.financials.length) {
      setFin((prev) => {
        const merged = prev.map((r) => ({ ...r }));
        for (const row of p.financials) {
          let target = merged.find((r) => r.fy.toUpperCase() === row.fy.toUpperCase());
          if (!target) { target = { ...row }; merged.push(target); }
          for (const k of Object.keys(row) as (keyof FinancialYear)[]) {
            if (k === "fy") continue;
            const v = row[k];
            if (v !== null && v !== undefined) { (target[k] as number | null) = v as number; touched.add(`fin:${target.fy}:${k}`); }
          }
        }
        return merged.sort((a, b) => a.fy.localeCompare(b.fy));
      });
    }

    setFilled(touched);
    setParsed(p);
  };

  const glow = (key: string) => (filled.has(key) ? " ring-2 ring-emerald-400/60 border-emerald-400 bg-emerald-50/40" : "");

  const submit = async () => {
    setSaving(true);
    try {
      const payload = {
        ...f,
        independentDirectorsAppointed: f.independentDirectorsAppointed,
        auditCommitteeConstituted: f.auditCommitteeConstituted,
        financials: fin,
      };
      if (existing) {
        await fetch("/api/companies", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: existing.id,
            updates: {
              ...payload,
              yearOfIncorporation: f.yearOfIncorporation ? Number(f.yearOfIncorporation) : null,
              promoterExperienceYears: f.promoterExperienceYears ? Number(f.promoterExperienceYears) : null,
              issueSizeCr: f.issueSizeCr ? Number(f.issueSizeCr) : null,
              freshIssueCr: f.freshIssueCr ? Number(f.freshIssueCr) : null,
              ofsCr: f.ofsCr ? Number(f.ofsCr) : null,
              top3CustomerPct: f.top3CustomerPct ? Number(f.top3CustomerPct) : null,
            },
          }),
        });
      } else {
        await fetch("/api/companies", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      // Persist the uploaded documents to this (now active) company and let the
      // upload pipeline extract facts + run analysis — so every tab reflects it.
      if (pendingFiles.length) {
        const fd = new FormData();
        pendingFiles.forEach((file) => fd.append("files", file));
        fd.append("uploadedBy", f.promoterName || "Promoter");
        await fetch("/api/documents/upload", { method: "POST", body: fd });
      } else {
        await fetch("/api/analysis", { method: "POST" });
      }
      setSaved(true);
      router.refresh();
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  };

  const triState = (val: boolean | null | undefined, set: (v: boolean | null) => void) => (
    <div className="mt-1.5 flex gap-2 flex-wrap">
      {[["Yes", true], ["No", false], ["Not sure yet", null]].map(([label, v]) => (
        <button
          key={String(label)}
          type="button"
          onClick={() => set(v as boolean | null)}
          className={`px-4 py-2 text-xs font-semibold rounded-lg border transition-all active:translate-y-[1px] active:shadow-none ${
            val === v
              ? "bg-gradient-to-b from-[#2b62b3] to-[#1e3a5f] text-white border-[#1a3352] shadow-[0_2px_3px_rgba(30,58,95,0.35)]"
              : "bg-gradient-to-b from-white to-slate-200 border-slate-300 text-slate-700 shadow-[0_2px_2px_rgba(51,65,85,0.15)] hover:to-slate-300"
          }`}
        >
          {label as string}
        </button>
      ))}
    </div>
  );

  // Table inputs get their own class — no `w-full` conflict with fixed widths,
  // and number-input spinners hidden so figures don't get clipped.
  const tableInput =
    "px-2 py-1.5 text-sm border rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-600 transition-colors " +
    "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

  // Negative figures get the red treatment from the reference mock.
  // Flexible widths (min-w + w-full) let the table compress on smaller
  // viewports / OS display scaling instead of overflowing into a scrollbar.
  const finCls = (v: number | null) =>
    v !== null && v < 0
      ? `${tableInput} w-full min-w-[52px] text-red-600 font-medium bg-red-50 border-red-200`
      : `${tableInput} w-full min-w-[52px] bg-white border-slate-300`;

  return (
    <div className="space-y-5">
      {/* ── Auto-fill from documents ── */}
      <section className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-sky-50 shadow-sm p-5">
        <div className="flex items-center gap-3 mb-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white border border-blue-200 text-blue-700">
            <Wand2 size={17} />
          </span>
          <div>
            <h3 className="text-[15px] font-bold text-[#1e3a5f]">Auto-fill from your documents</h3>
            <p className="text-xs text-slate-500">
              Have a Certificate of Incorporation, KYC, board resolution or audited financials? Drop them here and we&rsquo;ll
              read the fields below for you. You review and edit before saving — nothing is submitted automatically.
            </p>
          </div>
        </div>
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); autofill(e.dataTransfer.files); }}
          onClick={() => fileRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${dragOver ? "border-blue-500 bg-blue-100/50" : "border-blue-300 bg-white/70 hover:border-blue-400"}`}
        >
          <input ref={fileRef} type="file" multiple className="hidden"
            accept=".pdf,.txt,.csv,.md"
            onChange={(e) => e.target.files && autofill(e.target.files)} />
          {parsing ? (
            <div className="flex flex-col items-center gap-2 text-blue-600">
              <Loader2 className="animate-spin" size={24} />
              <span className="text-sm font-medium">Reading your documents and filling the form…</span>
            </div>
          ) : (
            <>
              <FileUp size={24} className="mx-auto text-blue-400 mb-1.5" />
              <p className="text-sm font-medium text-slate-700">Drop documents here or click to select (multiple supported)</p>
              <p className="text-xs text-slate-400 mt-1">Text PDFs, TXT or CSV. We read them to fill the form below, and add them to your company for full analysis when you save.</p>
            </>
          )}
        </div>
        {parseErr && <p className="text-sm text-red-600 mt-2">{parseErr}</p>}
        {parsed && !parsing && (
          <div className="mt-3 rounded-xl border border-emerald-200 bg-white p-3.5">
            <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
              <CheckCircle2 size={16} />
              Filled {filled.size} field{filled.size === 1 ? "" : "s"} from {parsed.documentsParsed.filter((d) => d.readable).length} document{parsed.documentsParsed.filter((d) => d.readable).length === 1 ? "" : "s"}.
              <span className="font-normal text-slate-400">Review the highlighted fields below, correct anything, then save.</span>
            </div>
            {pendingFiles.length > 0 && (
              <p className="mt-1.5 text-[12px] text-slate-500">
                {pendingFiles.length} document{pendingFiles.length === 1 ? "" : "s"} will be added to your company and analysed on save.
              </p>
            )}
            {Object.keys(parsed.provenance).length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {Object.entries(parsed.provenance).map(([key, prov]) => prov && (
                  <span key={key} className="inline-flex items-center gap-1 rounded-md bg-slate-50 border border-slate-200 px-2 py-0.5 text-[11px] text-slate-600">
                    <span className="font-medium text-[#1e3a5f]">{prettyKey(key)}</span>
                    <span className="text-slate-300">·</span>
                    <span className="truncate max-w-[160px]" title={prov.sourceFile}>{prov.sourceFile}</span>
                    <span className="text-emerald-600">{prov.confidence}%</span>
                  </span>
                ))}
              </div>
            )}
            {parsed.unreadable.length > 0 && (
              <p className="mt-2 text-[11px] text-amber-700">
                Could not read (likely scans — enter these manually): {parsed.unreadable.join(", ")}
              </p>
            )}
          </div>
        )}
      </section>

      <div className="grid gap-5 xl:grid-cols-[1fr_1.08fr] items-start">
        {/* ── Left column: basic details ── */}
        <SectionCard icon={Building2} title="1 · Basic details">
          <div className="grid md:grid-cols-2 gap-4">
            <Field label="Company name" help="As per your Certificate of Incorporation">
              <input className={inputCls + glow("name")} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="e.g. Shakti Precision Components Private Limited" />
            </Field>
            <Field label="CIN" help="21-character number on your incorporation certificate — we'll verify it against uploads">
              <input className={inputCls + glow("cin")} value={f.cin} onChange={(e) => setF({ ...f, cin: e.target.value })} placeholder="U12345GJ2014PTC012345" />
            </Field>
            <Field label="Industry / what the business does" help="In your own words — e.g. 'auto components manufacturing'">
              <input className={inputCls + glow("industry")} value={f.industry} onChange={(e) => setF({ ...f, industry: e.target.value })} />
            </Field>
            <Field label="Year of incorporation" help="SME platforms generally expect a 3-year track record">
              <input className={inputCls + glow("yearOfIncorporation")} type="number" value={f.yearOfIncorporation} onChange={(e) => setF({ ...f, yearOfIncorporation: e.target.value })} />
            </Field>
            <Field label="City"><input className={inputCls + glow("city")} value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} /></Field>
            <Field label="State"><input className={inputCls + glow("state")} value={f.state} onChange={(e) => setF({ ...f, state: e.target.value })} /></Field>
            <Field label="Promoter name" help="We use this to detect related-party entities with matching family names">
              <input className={inputCls + glow("promoterName")} value={f.promoterName} onChange={(e) => setF({ ...f, promoterName: e.target.value })} />
            </Field>
            <Field label="Promoter's years of experience in this business">
              <input className={inputCls + glow("promoterExperienceYears")} type="number" value={f.promoterExperienceYears} onChange={(e) => setF({ ...f, promoterExperienceYears: e.target.value })} />
            </Field>
          </div>
        </SectionCard>

        {/* ── Right column: issue + financial snapshot ── */}
        <div className="space-y-5 min-w-0">
          <SectionCard
            icon={Target}
            title="2 · The issue you're planning"
            sub="Rough numbers are fine to start — your merchant banker will finalise them."
          >
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Field label="Total issue size (₹ Cr)"><input className={inputCls + glow("issueSizeCr")} type="number" value={f.issueSizeCr} onChange={(e) => setF({ ...f, issueSizeCr: e.target.value })} /></Field>
              <Field label="Fresh issue (₹ Cr)" help="New money coming into the company"><input className={inputCls + glow("freshIssueCr")} type="number" value={f.freshIssueCr} onChange={(e) => setF({ ...f, freshIssueCr: e.target.value })} /></Field>
              <Field label="Offer for sale (₹ Cr)" help="Promoter selling existing shares"><input className={inputCls + glow("ofsCr")} type="number" value={f.ofsCr} onChange={(e) => setF({ ...f, ofsCr: e.target.value })} /></Field>
              <Field label="Target exchange">
                <select className={inputCls + glow("proposedListingExchange")} value={f.proposedListingExchange} onChange={(e) => setF({ ...f, proposedListingExchange: e.target.value })}>
                  <option>NSE Emerge / BSE SME</option><option>NSE Emerge</option><option>BSE SME</option>
                </select>
              </Field>
            </div>
          </SectionCard>

          <SectionCard
            icon={BarChart3}
            title="3 · Three-year financial snapshot (₹ crore)"
            sub="Enter what you know — uploaded audited financials cross-check these numbers. Leave blank if unsure."
            accent
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] font-semibold text-slate-500">
                    <th className="py-2 pr-2">Year</th><th className="pr-2">Revenue</th><th className="pr-2">EBITDA</th>
                    <th className="pr-2">PAT</th><th className="pr-2">Net worth</th><th className="pr-2">Borrowings</th>
                    <th className="pr-2">Receivables</th><th className="pr-2">Cash from ops</th>
                  </tr>
                </thead>
                <tbody>
                  {fin.map((row, i) => (
                    <tr key={i} className="border-t border-stone-100">
                      <td className="py-2 pr-2">
                        <input className={`${tableInput} w-full min-w-[78px] bg-white border-slate-300 font-semibold text-[#1e3a5f]`} value={row.fy} onChange={(e) => setFinVal(i, "fy", e.target.value)} />
                      </td>
                      {(["revenueCr", "ebitdaCr", "patCr", "netWorthCr", "borrowingsCr", "receivablesCr", "cfoCr"] as const).map((k) => (
                        <td key={k} className="pr-2">
                          <input className={finCls(row[k] as number | null) + glow(`fin:${row.fy}:${k}`)} type="number" value={row[k] ?? ""} onChange={(e) => setFinVal(i, k, e.target.value)} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </div>
      </div>

      {/* ── Governance, full width ── */}
      <SectionCard icon={ShieldCheck} title="4 · Governance & honesty checks">
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <Field label="Have you appointed independent directors?" help="Required for listing — 'No' or 'Not sure' creates a tracked gap, which is fine at this stage">
            {triState(f.independentDirectorsAppointed, (v) => setF({ ...f, independentDirectorsAppointed: v }))}
          </Field>
          <Field label="Is an audit committee constituted?">
            {triState(f.auditCommitteeConstituted, (v) => setF({ ...f, auditCommitteeConstituted: v }))}
          </Field>
          <Field label="Top 3 customers — % of revenue" help="Above 40% is a disclosure-worthy concentration; better to surface it now">
            <input className={inputCls + glow("top3CustomerPct")} type="number" value={f.top3CustomerPct} onChange={(e) => setF({ ...f, top3CustomerPct: e.target.value })} placeholder="e.g. 48" />
          </Field>
          <Field label="Any pending cases, notices or demands you know of?" help="Tax notices count too. Declaring them early avoids the most damaging kind of inconsistency later.">
            <textarea className={inputCls + glow("pendingLitigationNote")} rows={2} value={f.pendingLitigationNote} onChange={(e) => setF({ ...f, pendingLitigationNote: e.target.value })} placeholder="e.g. GST demand notice of ₹18 lakh for FY2024, reply filed" />
          </Field>
        </div>
      </SectionCard>

      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={submit}
          disabled={saving || !f.name}
          className="flex items-center gap-2 px-6 py-3 bg-[#1e3a5f] text-white text-sm font-semibold rounded-xl shadow-lg shadow-[#1e3a5f]/25 hover:bg-[#24466f] transition-colors disabled:opacity-50"
        >
          <Save size={15} />
          {saving
            ? (pendingFiles.length ? "Saving, uploading & analysing…" : "Saving & analysing…")
            : existing ? "Save & Re-analyse"
            : pendingFiles.length ? "Create Company, Upload & Analyse" : "Create Company & Analyse"}
        </button>
        {saved && <span className="text-sm text-emerald-600 font-medium">Saved — analysis updated ✓</span>}
        {(saved || existing) && (
          <a
            href="/evidence"
            className="group flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-sky-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-blue-600/25 hover:shadow-blue-500/35 transition-shadow"
          >
            Continue to Evidence & Extraction
            <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
          </a>
        )}
        {!f.name && <span className="text-xs text-slate-400">Company name is required to save.</span>}
      </div>
    </div>
  );
}
