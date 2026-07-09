"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircle2, Loader2, Scale, Undo2, XCircle } from "lucide-react";
import type { AuditLogEntry, DraftSection } from "@/lib/types";
import { Card, ReviewStatusBadge, StatCard } from "@/components/shared/ui";

export default function ReviewRoom({
  company, sections, criticalOpen, highRiskOpen, draftCompletion, auditLog,
}: {
  company: { name: string; id: string };
  sections: DraftSection[];
  criticalOpen: number;
  highRiskOpen: number;
  draftCompletion: number;
  auditLog: AuditLogEntry[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [comment, setComment] = useState<Record<string, string>>({});

  const act = async (sectionId: string, action: string, c?: string) => {
    setBusy(sectionId + action);
    try {
      await fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sectionId, action, comment: c, user: "Anita Deshmukh", role: "MERCHANT_BANKER" }),
      });
      router.refresh();
    } finally { setBusy(null); }
  };

  const approved = sections.filter((s) => s.status === "Approved").length;
  const pending = sections.filter((s) => s.status === "MB Review Pending").length;
  const changesReq = sections.filter((s) => s.status === "Changes Requested").length;
  const finalBlocked = criticalOpen > 0 || highRiskOpen > 0 || approved < sections.length || sections.length === 0;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard label="Draft Completion" value={`${draftCompletion}%`} />
        <StatCard label="Awaiting Review" value={pending} tone={pending ? "warn" : "default"} />
        <StatCard label="Approved" value={`${approved}/${sections.length}`} tone={approved === sections.length && sections.length > 0 ? "good" : "default"} />
        <StatCard label="Changes Requested" value={changesReq} tone={changesReq ? "warn" : "default"} />
        <StatCard label="Critical Gaps Open" value={criticalOpen} tone={criticalOpen ? "bad" : "good"} />
      </div>

      <Card className={`p-4 ${finalBlocked ? "border-amber-300 bg-amber-50" : "border-emerald-300 bg-emerald-50"}`}>
        <p className="text-sm font-medium text-slate-800">
          {finalBlocked
            ? `Final Draft Ready is BLOCKED: ${criticalOpen} critical + ${highRiskOpen} high-risk gaps open, ${sections.length - approved} section(s) not yet approved. High-risk items must be resolved or expressly waived before the draft can be marked final.`
            : "All sections approved and no high-risk gaps open — the draft can be marked Final Draft Ready."}
        </p>
      </Card>

      {sections.length === 0 ? (
        <Card className="p-8 text-center text-sm text-slate-400">No draft sections yet — the promoter must generate the draft first.</Card>
      ) : (
        sections.map((s) => (
          <Card key={s.id} className="p-5">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <h3 className="text-sm font-semibold text-slate-800">{s.sectionName}</h3>
              <ReviewStatusBadge status={s.status} />
              <span className="text-xs text-slate-400">Confidence {s.confidence}% · {s.sources.length} source(s) · {s.missingData.length} missing item(s)</span>
            </div>
            <p className="text-[13px] text-slate-600 line-clamp-3 whitespace-pre-wrap">{s.generatedText}</p>
            {s.sources.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {s.sources.map((src, i) => (
                  <span key={i} className="text-[11px] px-2 py-0.5 bg-blue-50 border border-blue-200 text-blue-800 rounded">📎 {src.document}</span>
                ))}
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <button onClick={() => act(s.id, "approve")} disabled={!!busy}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50">
                {busy === s.id + "approve" ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />} Approve
              </button>
              <button onClick={() => act(s.id, "request-changes", comment[s.id])} disabled={!!busy}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium border border-red-300 text-red-700 rounded-lg hover:bg-red-50 disabled:opacity-50">
                <XCircle size={13} /> Request Changes
              </button>
              <button onClick={() => act(s.id, "assign-back", comment[s.id] || "Assigned back to promoter for inputs.")} disabled={!!busy}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 disabled:opacity-50">
                <Undo2 size={13} /> Assign to Promoter
              </button>
              <button onClick={() => act(s.id, "needs-legal")} disabled={!!busy}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium border border-violet-300 text-violet-700 rounded-lg hover:bg-violet-50 disabled:opacity-50">
                <Scale size={13} /> Needs Legal Review
              </button>
              <input
                className="flex-1 min-w-[200px] px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
                placeholder="Review comment (attached to the action)…"
                value={comment[s.id] ?? ""}
                onChange={(e) => setComment({ ...comment, [s.id]: e.target.value })}
              />
              {comment[s.id] && (
                <button onClick={() => { act(s.id, "comment", comment[s.id]); setComment({ ...comment, [s.id]: "" }); }}
                  className="px-3 py-1.5 text-xs bg-slate-800 text-white rounded-lg">Post comment</button>
              )}
            </div>
            {s.comments.length > 0 && (
              <div className="mt-3 space-y-1">
                {s.comments.map((c) => (
                  <div key={c.id} className="text-[12px] bg-slate-50 rounded px-3 py-1.5">
                    <span className="font-medium">{c.author}</span> <span className="text-slate-400">({c.role.replaceAll("_", " ").toLowerCase()})</span>: {c.comment}
                  </div>
                ))}
              </div>
            )}
          </Card>
        ))
      )}

      <Card className="overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-800">Audit Trail</h3>
          <p className="text-xs text-slate-400">Who changed what, when — visible to all roles.</p>
        </div>
        {auditLog.length === 0 ? (
          <p className="p-6 text-sm text-slate-400 text-center">No activity yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12px] min-w-[640px]">
              <thead>
                <tr className="text-left text-slate-500 bg-slate-50">
                  <th className="px-4 py-2">Time</th><th className="px-2 py-2">User</th>
                  <th className="px-2 py-2">Action</th><th className="px-2 py-2">Before</th><th className="px-2 py-2">After</th>
                </tr>
              </thead>
              <tbody>
                {auditLog.map((a) => (
                  <tr key={a.id} className="border-t border-slate-100">
                    <td className="px-4 py-1.5 text-slate-500 whitespace-nowrap">{new Date(a.timestamp).toLocaleString("en-IN")}</td>
                    <td className="px-2 py-1.5 font-medium text-slate-700">{a.user}</td>
                    <td className="px-2 py-1.5 text-slate-600">{a.action}</td>
                    <td className="px-2 py-1.5 text-slate-400 max-w-[160px] truncate">{a.oldValue || "—"}</td>
                    <td className="px-2 py-1.5 text-slate-500 max-w-[200px] truncate">{a.newValue || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
