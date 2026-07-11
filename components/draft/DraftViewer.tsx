"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { FileCheck, Loader2, MessageSquarePlus, Pencil, RefreshCw, Sparkles } from "lucide-react";
import type { DraftSection } from "@/lib/types";
import { AiNote, Card, ReviewStatusBadge } from "@/components/shared/ui";
import { mdToHtml } from "@/lib/utils/markdown";

export interface SectionMeta {
  purpose: string;
  coveragePct: number;
  missingFacts: string[];
  questions: { q: string; severity: string }[];
  professionalReviewRequired: boolean;
}

export default function DraftViewer({
  sections, aiReady = true, meta = {},
}: { sections: DraftSection[]; aiReady?: boolean; meta?: Record<string, SectionMeta> }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [commentFor, setCommentFor] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");

  const call = async (key: string, fn: () => Promise<unknown>) => {
    setBusy(key);
    try { await fn(); router.refresh(); } finally { setBusy(null); }
  };

  const generateAll = () =>
    call("all", () => fetch("/api/draft", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }));
  const regen = (name: string) =>
    call(name, () => fetch("/api/draft/section", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sectionName: name }) }));
  const patch = (id: string, body: Record<string, unknown>) =>
    call(id, () => fetch("/api/draft/section", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, ...body }) }));
  const review = (sectionId: string, action: string, comment?: string) =>
    call(sectionId + action, () => fetch("/api/review", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sectionId, action, comment, user: "Promoter", role: "PROMOTER" }) }));

  if (!sections.length) {
    return (
      <Card className="p-10 text-center">
        <Sparkles size={28} className="mx-auto text-blue-500 mb-3" />
        <h3 className="text-base font-semibold text-slate-800">No draft yet</h3>
        <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
          Generate the priority sections of the SME prospectus blueprint from your extracted facts.
          Sections without enough data are created with explicit placeholders — never invented content.
          Generation takes a minute or two (one AI call per section).
        </p>
        <button onClick={generateAll} disabled={!!busy || !aiReady}
          className="mt-5 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-sky-500 text-white text-sm font-medium rounded-lg shadow-sm shadow-blue-600/30 hover:shadow-md transition-shadow disabled:opacity-50 inline-flex items-center gap-2">
          {busy === "all" ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
          {busy === "all" ? "Generating…" : "Generate Draft"}
        </button>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={generateAll} disabled={!!busy}
          className="px-3 py-1.5 text-xs font-medium border border-slate-300 rounded-lg hover:bg-slate-50 inline-flex items-center gap-1.5 disabled:opacity-50">
          <RefreshCw size={13} className={busy === "all" ? "animate-spin" : ""} /> Regenerate all sections
        </button>
      </div>
      {sections.map((s) => (
        <Card key={s.id} className="overflow-hidden">
          <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-800">{s.sectionName}</h3>
            <ReviewStatusBadge status={s.status} />
            <div className="ml-auto flex items-center gap-1.5">
              <button onClick={() => regen(s.sectionName)} disabled={!!busy} title="Regenerate from current data"
                className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded">
                {busy === s.sectionName ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              </button>
              <button onClick={() => { setEditing(editing === s.id ? null : s.id); setEditText(s.generatedText); }} title="Edit text"
                className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded"><Pencil size={14} /></button>
              <button onClick={() => setCommentFor(commentFor === s.id ? null : s.id)} title="Add comment"
                className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded"><MessageSquarePlus size={14} /></button>
              <button onClick={() => review(s.id, "mark-review")} disabled={!!busy} title="Send for merchant banker review"
                className="px-2.5 py-1 text-xs font-medium border border-blue-300 text-blue-700 rounded-lg hover:bg-blue-50 inline-flex items-center gap-1">
                <FileCheck size={13} /> Mark for Review
              </button>
            </div>
          </div>
          <div className="px-5 py-4 grid gap-5 xl:grid-cols-[1fr_290px]">
            <div>
            <AiNote confidence={s.confidence} />
            {editing === s.id ? (
              <div className="mt-3">
                <textarea className="w-full h-52 px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono"
                  value={editText} onChange={(e) => setEditText(e.target.value)} />
                <div className="flex gap-2 mt-2">
                  <button onClick={() => { patch(s.id, { text: editText, status: "Promoter Reviewed" }); setEditing(null); }}
                    className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg">Save edits</button>
                  <button onClick={() => setEditing(null)} className="px-3 py-1.5 border border-slate-300 text-xs rounded-lg">Cancel</button>
                </div>
              </div>
            ) : (
              <div className="prose-draft text-sm text-slate-700 mt-3 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: mdToHtml(s.generatedText) }} />
            )}

            {s.sources.length > 0 && (
              <div className="mt-4 bg-blue-50/70 border-l-2 border-blue-500 rounded-r-lg px-3 py-2">
                <div className="text-[11px] font-semibold text-blue-800 mb-1">SOURCE EVIDENCE</div>
                <div className="flex flex-wrap gap-1.5">
                  {s.sources.map((src, i) => (
                    <span key={i} className="text-[11px] px-2 py-0.5 bg-white border border-blue-200 text-blue-800 rounded" title={src.detail}>
                      📎 {src.document} <span className="text-blue-500">· {src.detail}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
            {s.missingData.length > 0 && (
              <div className="mt-2 bg-amber-50 border-l-2 border-amber-500 rounded-r-lg px-3 py-2">
                <div className="text-[11px] font-semibold text-amber-800 mb-0.5">SOURCE MISSING — PROMOTER CONFIRMATION REQUIRED</div>
                <ul className="text-[12px] text-amber-900">{s.missingData.map((m) => <li key={m}>• {m}</li>)}</ul>
              </div>
            )}

            {commentFor === s.id && (
              <div className="mt-3 flex gap-2">
                <input className="flex-1 px-3 py-1.5 text-sm border border-slate-300 rounded-lg"
                  placeholder="Add a note for your reviewer…" value={commentText} onChange={(e) => setCommentText(e.target.value)} />
                <button onClick={() => { review(s.id, "comment", commentText); setCommentText(""); setCommentFor(null); }}
                  className="px-3 py-1.5 bg-slate-800 text-white text-xs rounded-lg">Post</button>
              </div>
            )}
            {s.comments.length > 0 && (
              <div className="mt-3 space-y-1.5">
                {s.comments.map((c) => (
                  <div key={c.id} className="text-[12px] bg-slate-50 rounded-lg px-3 py-1.5">
                    <span className="font-medium text-slate-700">{c.author}</span>{" "}
                    <span className="text-slate-400">({c.role.replace("_", " ").toLowerCase()}, {new Date(c.createdAt).toLocaleDateString("en-IN")})</span>:{" "}
                    <span className="text-slate-600">{c.comment}</span>
                  </div>
                ))}
              </div>
            )}
            </div>
            <SectionInsightPanel m={meta[s.sectionName]} status={s.status} />
          </div>
        </Card>
      ))}
    </div>
  );
}

/** Right-side panel: plain-English summary, missing items, likely reviewer questions. */
function SectionInsightPanel({ m, status }: { m?: SectionMeta; status: string }) {
  if (!m) return null;
  return (
    <aside className="space-y-3 xl:border-l xl:border-slate-100 xl:pl-5">
      <div>
        <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">In plain English</div>
        <p className="text-[12.5px] text-slate-600 leading-relaxed">
          This section tells investors {m.purpose.charAt(0).toLowerCase() + m.purpose.slice(1)}{" "}
          Right now it is <strong>{m.coveragePct}% covered</strong> by your data
          {status === "AI Drafted" ? " and has been drafted for review." : status === "Approved" ? " and is approved by the merchant banker." : "."}
          {m.professionalReviewRequired && " Professional review is required before this section is final."}
        </p>
      </div>
      {m.missingFacts.length > 0 && (
        <div>
          <div className="text-[11px] font-semibold text-amber-700 uppercase tracking-wide mb-1">Still missing here</div>
          <ul className="text-[12px] text-amber-900 space-y-1">
            {m.missingFacts.slice(0, 5).map((x) => <li key={x} className="bg-amber-50 border border-amber-100 rounded px-2 py-1">• {x}</li>)}
          </ul>
        </div>
      )}
      {m.questions.length > 0 && (
        <div>
          <div className="text-[11px] font-semibold text-blue-700 uppercase tracking-wide mb-1">Likely reviewer questions</div>
          <ul className="text-[12px] text-blue-900 space-y-1">
            {m.questions.slice(0, 4).map((q, i) => <li key={i} className="bg-blue-50 border border-blue-100 rounded px-2 py-1">❓ {q.q}</li>)}
          </ul>
        </div>
      )}
    </aside>
  );
}
