"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { ChevronDown, ChevronRight, FileUp, Loader2, Trash2 } from "lucide-react";
import type { DocumentRecord } from "@/lib/types";
import { Card, DocStatusBadge } from "@/components/shared/ui";

const CHECKLIST: { label: string; why: string }[] = [
  { label: "Audited financial statements (3 years)", why: "Your track record — the core of the offer document" },
  { label: "Restated financials (peer-reviewed auditor)", why: "Mandatory format for the offer document" },
  { label: "GST returns / annual summary", why: "We cross-check turnover against your books" },
  { label: "Certificate of Incorporation, MOA/AOA", why: "Proves corporate history and authorised capital" },
  { label: "Board & shareholder resolutions for the IPO", why: "Authorises the issue" },
  { label: "Promoter & director KYC (PAN/DIN)", why: "Identity and no-debarment verification" },
  { label: "Litigation declaration", why: "Even a NIL declaration is required — and must match reality" },
  { label: "Related-party transaction register", why: "Reviewers scrutinise promoter-group dealings first" },
  { label: "Quotations / invoices for planned capex", why: "Evidence for your Objects of the Issue" },
  { label: "Working capital assessment", why: "Basis for any working-capital object" },
  { label: "Material contracts & lease deeds", why: "The agreements your business runs on" },
  { label: "Licenses & government approvals", why: "Factory license, pollution consents, Udyam etc." },
];

export default function DataRoom({ docs }: { docs: DocumentRecord[] }) {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const upload = async (files: FileList | File[]) => {
    if (!files.length) return;
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      [...files].forEach((f) => fd.append("files", f));
      const res = await fetch("/api/documents/upload", { method: "POST", body: fd });
      if (!res.ok) setError((await res.json()).error ?? "Upload failed");
      router.refresh();
    } catch {
      setError("Upload failed — please try again.");
    } finally {
      setUploading(false);
    }
  };

  const remove = async (id: string) => {
    await fetch(`/api/documents?id=${id}`, { method: "DELETE" });
    router.refresh();
  };

  const uploadedCategories = new Set(docs.map((d) => d.category));

  return (
    <div className="space-y-5">
      {/* Upload zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); upload(e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${dragOver ? "border-blue-500 bg-blue-50" : "border-slate-300 bg-white hover:border-blue-400"}`}
      >
        <input ref={inputRef} type="file" multiple className="hidden"
          accept=".pdf,.txt,.csv,.md,.xlsx,.xls,.docx,.zip,.jpg,.png"
          onChange={(e) => e.target.files && upload(e.target.files)} />
        {uploading ? (
          <div className="flex flex-col items-center gap-2 text-blue-600">
            <Loader2 className="animate-spin" size={26} />
            <span className="text-sm font-medium">Reading, classifying and analysing your documents…</span>
          </div>
        ) : (
          <>
            <FileUp size={26} className="mx-auto text-slate-400 mb-2" />
            <p className="text-sm font-medium text-slate-700">Drop files here or click to upload (multiple files supported)</p>
            <p className="text-xs text-slate-400 mt-1">
              Best results with text PDFs. Scans and spreadsheets are stored and classified by filename — you can then
              enter key figures manually. Nothing leaves your machine unless you configure an AI provider.
            </p>
          </>
        )}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Checklist */}
      <Card className="p-5">
        <h3 className="text-sm font-semibold text-slate-800 mb-1">Helpful documents you may upload</h3>
        <p className="text-xs text-slate-400 mb-3">A guide, not a gate — the platform works with whatever you have and tells you what each missing item would unlock.</p>
        <div className="grid md:grid-cols-2 gap-x-8 gap-y-1.5">
          {CHECKLIST.map((c) => {
            const done = docs.some((d) => d.fileName.toLowerCase().includes(c.label.split(" ")[0].toLowerCase())) ||
              uploadedCategories.size >= 10;
            return (
              <div key={c.label} className="flex items-start gap-2 text-[13px] py-1">
                <span className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center text-[10px] shrink-0 ${done ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-300 text-transparent"}`}>✓</span>
                <span>
                  <span className="text-slate-700 font-medium">{c.label}</span>
                  <span className="text-slate-400"> — {c.why}</span>
                </span>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Documents table */}
      <Card className="overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-800">Documents ({docs.length})</h3>
          <span className="text-xs text-slate-400">Click a row to see extracted data & correct it</span>
        </div>
        {docs.length === 0 ? (
          <p className="text-sm text-slate-400 p-8 text-center">No documents yet — upload above to begin.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[860px]">
              <thead>
                <tr className="text-left text-xs text-slate-500 bg-slate-50">
                  <th className="px-4 py-2.5 w-6"></th>
                  <th className="px-2 py-2.5">Document</th>
                  <th className="px-2 py-2.5">Category</th>
                  <th className="px-2 py-2.5">Linked IPO Section</th>
                  <th className="px-2 py-2.5">Status</th>
                  <th className="px-2 py-2.5">Issues</th>
                  <th className="px-2 py-2.5">Confidence</th>
                  <th className="px-2 py-2.5">Updated</th>
                  <th className="px-2 py-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {docs.map((d) => (
                  <Row key={d.id} d={d} open={openId === d.id}
                    onToggle={() => setOpenId(openId === d.id ? null : d.id)}
                    onDelete={() => remove(d.id)} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function Row({ d, open, onToggle, onDelete }: { d: DocumentRecord; open: boolean; onToggle: () => void; onDelete: () => void }) {
  return (
    <>
      <tr className="border-t border-slate-100 hover:bg-slate-50 cursor-pointer" onClick={onToggle}>
        <td className="px-4 py-2.5 text-slate-400">{open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</td>
        <td className="px-2 py-2.5 font-medium text-slate-800">{d.fileName}</td>
        <td className="px-2 py-2.5 text-slate-600">{d.category}</td>
        <td className="px-2 py-2.5 text-slate-600">{d.linkedSection}</td>
        <td className="px-2 py-2.5"><DocStatusBadge status={d.status} /></td>
        <td className="px-2 py-2.5 text-slate-600">{d.issuesFound.length || "—"}</td>
        <td className="px-2 py-2.5 text-slate-600">{d.confidence}%</td>
        <td className="px-2 py-2.5 text-slate-500 text-xs">{d.lastUpdated}</td>
        <td className="px-2 py-2.5">
          <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="text-slate-300 hover:text-red-500" title="Delete document">
            <Trash2 size={14} />
          </button>
        </td>
      </tr>
      {open && (
        <tr className="border-t border-slate-100 bg-slate-50/60">
          <td colSpan={9} className="px-6 py-4">
            <DetailPanel d={d} />
          </td>
        </tr>
      )}
    </>
  );
}

function DetailPanel({ d }: { d: DocumentRecord }) {
  const router = useRouter();
  const [fields, setFields] = useState<Record<string, string>>(
    Object.fromEntries(Object.entries(d.fields).filter(([, v]) => typeof v !== "object").map(([k, v]) => [k, String(v)]))
  );
  const [saving, setSaving] = useState(false);

  const editableKeys = ["revenueCr", "patCr", "ebitdaCr", "netWorthCr", "borrowingsCr", "receivablesCr", "cfoCr", "gstTurnoverCr", "quotationAmountCr", "wcRequirementCr", "demandNoticeCr", "rptPurchasesCr", "promoterLoanCr", "fy"];
  const shown = editableKeys.filter((k) => k in fields || d.category !== "General");

  const save = async () => {
    setSaving(true);
    const parsed: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(fields)) {
      if (v === "") continue;
      parsed[k] = /Cr$/.test(k) ? Number(v) : v;
    }
    await fetch("/api/documents", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: d.id, fields: parsed }),
    });
    setSaving(false);
    router.refresh();
  };

  return (
    <div className="grid lg:grid-cols-2 gap-5 text-[13px]">
      <div>
        <p className="text-slate-700"><span className="font-semibold">AI summary:</span> {d.extractedSummary}</p>
        {d.keyNumbers.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {d.keyNumbers.map((n) => <span key={n} className="px-2 py-0.5 bg-blue-50 border border-blue-100 text-blue-700 rounded text-xs">{n}</span>)}
          </div>
        )}
        {d.keyEntities.length > 0 && (
          <p className="text-slate-500 mt-2"><span className="font-medium">Entities:</span> {d.keyEntities.join(", ")}</p>
        )}
        {d.issuesFound.length > 0 && (
          <ul className="mt-2 space-y-1">
            {d.issuesFound.map((i) => <li key={i} className="text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1 text-xs">⚠ {i}</li>)}
          </ul>
        )}
      </div>
      <div>
        <p className="font-semibold text-slate-700 mb-1">Extracted values — correct anything we misread <span className="font-normal text-slate-400">(all in ₹ crore)</span></p>
        <div className="grid grid-cols-3 gap-2">
          {shown.slice(0, 9).map((k) => (
            <label key={k} className="text-[11px] text-slate-500">
              {k.replace(/Cr$/, "").replace(/([A-Z])/g, " $1").trim()}
              <input
                className="mt-0.5 w-full px-2 py-1 text-xs border border-slate-300 rounded bg-white"
                value={fields[k] ?? ""}
                onChange={(e) => setFields({ ...fields, [k]: e.target.value })}
              />
            </label>
          ))}
        </div>
        <button onClick={save} disabled={saving}
          className="mt-3 px-3 py-1.5 bg-slate-800 text-white text-xs rounded-lg hover:bg-slate-700 disabled:opacity-50">
          {saving ? "Saving & re-analysing…" : "Save corrections & re-analyse"}
        </button>
        {d.manualOverride && <span className="ml-2 text-xs text-emerald-600">Manually corrected ✓</span>}
      </div>
    </div>
  );
}
