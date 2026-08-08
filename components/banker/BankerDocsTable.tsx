"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, ExternalLink } from "lucide-react";
import type { BankerFlag, DocumentRecord } from "@/lib/types";
import { Badge, Card, DocStatusBadge } from "@/components/shared/ui";
import AuthenticityBadge from "@/components/documents/AuthenticityBadge";
import FlagForm from "./FlagForm";

/**
 * Read-only view of the promoter's filing documents for the merchant banker:
 * classification, extraction results, detected issues, plus "view file" and
 * a flag composer to pinpoint corrections. No upload, no delete, no editing.
 */
export default function BankerDocsTable({
  docs, flags, companyId,
}: { docs: DocumentRecord[]; flags: BankerFlag[]; companyId: string }) {
  const [openId, setOpenId] = useState<string | null>(null);

  if (!docs.length) {
    return (
      <Card className="p-8 text-center text-sm text-slate-400">
        The promoter has not uploaded any documents yet. Documents appear here as soon as they are
        uploaded and processed.
      </Card>
    );
  }

  const openFlagsFor = (docId: string) =>
    flags.filter((f) => f.targetType === "document" && f.targetId === docId && f.status === "OPEN").length;

  return (
    <Card className="overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-800">Filing documents ({docs.length})</h3>
        <span className="text-xs text-slate-400">Click a row for extracted data · read-only</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[900px]">
          <thead>
            <tr className="text-left text-xs text-slate-500 bg-slate-50">
              <th className="px-4 py-2.5 w-6"></th>
              <th className="px-2 py-2.5">Document</th>
              <th className="px-2 py-2.5">Category</th>
              <th className="px-2 py-2.5">Linked IPO Section</th>
              <th className="px-2 py-2.5">Status</th>
              <th className="px-2 py-2.5">Issues</th>
              <th className="px-2 py-2.5">Confidence</th>
              <th className="px-2 py-2.5">Authenticity</th>
              <th className="px-2 py-2.5">Uploaded by</th>
              <th className="px-2 py-2.5">Flags</th>
            </tr>
          </thead>
          <tbody>
            {docs.map((d) => (
              <Row
                key={d.id}
                d={d}
                companyId={companyId}
                openFlags={openFlagsFor(d.id)}
                open={openId === d.id}
                onToggle={() => setOpenId(openId === d.id ? null : d.id)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function Row({
  d, companyId, openFlags, open, onToggle,
}: { d: DocumentRecord; companyId: string; openFlags: number; open: boolean; onToggle: () => void }) {
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
        <td className="px-2 py-2.5"><AuthenticityBadge a={d.authenticity} /></td>
        <td className="px-2 py-2.5 text-slate-500 text-xs">{d.uploadedBy}</td>
        <td className="px-2 py-2.5">{openFlags ? <Badge tone="yellow">{openFlags} open</Badge> : <span className="text-slate-300 text-xs">—</span>}</td>
      </tr>
      {open && (
        <tr className="border-t border-slate-100 bg-slate-50/60">
          <td colSpan={10} className="px-6 py-4">
            <div className="grid lg:grid-cols-2 gap-5 text-[13px]">
              <div>
                <p className="text-slate-700"><span className="font-semibold">Extraction summary:</span> {d.extractedSummary}</p>
                {d.keyNumbers.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {d.keyNumbers.map((n) => (
                      <span key={n} className="px-2 py-0.5 bg-blue-50 border border-blue-100 text-blue-700 rounded text-xs">{n}</span>
                    ))}
                  </div>
                )}
                {d.keyEntities.length > 0 && (
                  <p className="text-slate-500 mt-2"><span className="font-medium">Entities:</span> {d.keyEntities.join(", ")}</p>
                )}
                {d.issuesFound.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {d.issuesFound.map((i) => (
                      <li key={i} className="text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1 text-xs">⚠ {i}</li>
                    ))}
                  </ul>
                )}
                {d.authenticity && (
                  <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3">
                    <div className="flex items-center gap-2">
                      <AuthenticityBadge a={d.authenticity} />
                      <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Authenticity forensics</span>
                      {d.authenticity.applicable && <span className="ml-auto text-xs font-semibold text-slate-600">{d.authenticity.score}/100</span>}
                    </div>
                    <p className="mt-1.5 text-xs text-slate-600">{d.authenticity.summary}</p>
                    {d.authenticity.signals.length > 0 && (
                      <ul className="mt-2 space-y-1">
                        {d.authenticity.signals.map((sig) => (
                          <li key={sig.id} className="flex gap-2 text-[11.5px]">
                            <span className={`mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full ${sig.level === "flag" ? "bg-red-500" : sig.level === "review" ? "bg-amber-500" : "bg-slate-300"}`} />
                            <span className="text-slate-600"><span className="font-medium text-slate-700">{sig.label}:</span> {sig.detail}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    <p className="mt-2 text-[10px] text-slate-400">Structural signals only, not proof of forgery. Verify the original source document before relying on its figures.</p>
                  </div>
                )}
                {d.extractedText.trim().length > 0 && (
                  <details className="mt-3">
                    <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-700">Show extracted text (first pages)</summary>
                    <pre className="mt-2 max-h-56 overflow-y-auto whitespace-pre-wrap text-[11px] leading-relaxed bg-white border border-slate-200 rounded-lg p-3 text-slate-600">
                      {d.extractedText.slice(0, 4000)}
                    </pre>
                  </details>
                )}
              </div>
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <a
                    href={`/api/documents/file?id=${d.id}`}
                    target="_blank"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-slate-300 rounded-lg hover:bg-white text-slate-700"
                  >
                    <ExternalLink size={12} /> View original file
                  </a>
                  <span onClick={(e) => e.stopPropagation()}>
                    <FlagForm companyId={companyId} targetType="document" targetId={d.id} targetLabel={d.fileName} />
                  </span>
                </div>
                {Object.keys(d.fields).length > 0 && (
                  <div>
                    <p className="font-semibold text-slate-700 mb-1">Extracted values</p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                      {Object.entries(d.fields)
                        .filter(([, v]) => typeof v !== "object" && v !== undefined && v !== null && v !== "")
                        .slice(0, 14)
                        .map(([k, v]) => (
                          <div key={k} className="flex justify-between gap-2 text-xs border-b border-slate-100 py-1">
                            <span className="text-slate-500">{k.replace(/Cr$/, " (₹ Cr)").replace(/([A-Z])/g, " $1").trim()}</span>
                            <span className="font-medium text-slate-700">{String(v)}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
