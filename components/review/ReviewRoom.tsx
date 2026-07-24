"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircle2, Loader2, Scale, Undo2, XCircle } from "lucide-react";
import type { AuditLogEntry, DraftSection } from "@/lib/types";
import { Card, ReviewStatusBadge, StatCard } from "@/components/shared/ui";
import { useT } from "@/components/i18n/LanguageProvider";

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
  const t = useT();
  const [busy, setBusy] = useState<string | null>(null);
  const [comment, setComment] = useState<Record<string, string>>({});
  const [reviewer, setReviewer] = useState("Merchant Banker Reviewer");

  const act = async (sectionId: string, action: string, c?: string) => {
    setBusy(sectionId + action);
    try {
      await fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sectionId, action, comment: c, user: reviewer || "Merchant Banker Reviewer", role: "MERCHANT_BANKER" }),
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
      <Card className="p-3 flex flex-wrap items-center gap-3">
        <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">{t("rr.reviewingAs")}</span>
        <span className="px-2 py-0.5 text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 rounded-full">{t("rr.merchantBanker")}</span>
        <input
          className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg w-64"
          value={reviewer}
          onChange={(e) => setReviewer(e.target.value)}
          placeholder={t("rr.reviewerPh")}
        />
      </Card>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard label={t("rr.draftCompletion")} value={`${draftCompletion}%`} />
        <StatCard label={t("rr.awaitingReview")} value={pending} tone={pending ? "warn" : "default"} />
        <StatCard label={t("rr.approved")} value={`${approved}/${sections.length}`} tone={approved === sections.length && sections.length > 0 ? "good" : "default"} />
        <StatCard label={t("rr.changesRequested")} value={changesReq} tone={changesReq ? "warn" : "default"} />
        <StatCard label={t("rr.criticalGapsOpen")} value={criticalOpen} tone={criticalOpen ? "bad" : "good"} />
      </div>

      <Card className={`p-4 ${finalBlocked ? "border-amber-300 bg-amber-50" : "border-emerald-300 bg-emerald-50"}`}>
        <p className="text-sm font-medium text-slate-800">
          {finalBlocked
            ? t("rr.blocked", { crit: criticalOpen, high: highRiskOpen, notApproved: sections.length - approved })
            : t("rr.notBlocked")}
        </p>
      </Card>

      {sections.length === 0 ? (
        <Card className="p-8 text-center text-sm text-slate-400">{t("rr.noSections")}</Card>
      ) : (
        sections.map((s) => (
          <Card key={s.id} className="p-5">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <h3 className="text-sm font-semibold text-slate-800">{s.sectionName}</h3>
              <ReviewStatusBadge status={s.status} />
              <span className="text-xs text-slate-400">{t("rr.confidenceLine", { conf: s.confidence, sources: s.sources.length, missing: s.missingData.length })}</span>
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
                {busy === s.id + "approve" ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />} {t("rr.approve")}
              </button>
              <button onClick={() => act(s.id, "request-changes", comment[s.id])} disabled={!!busy}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium border border-red-300 text-red-700 rounded-lg hover:bg-red-50 disabled:opacity-50">
                <XCircle size={13} /> {t("rr.requestChanges")}
              </button>
              <button onClick={() => act(s.id, "assign-back", comment[s.id] || t("rr.assignBackDefault"))} disabled={!!busy}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 disabled:opacity-50">
                <Undo2 size={13} /> {t("rr.assignPromoter")}
              </button>
              <button onClick={() => act(s.id, "needs-legal")} disabled={!!busy}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium border border-violet-300 text-violet-700 rounded-lg hover:bg-violet-50 disabled:opacity-50">
                <Scale size={13} /> {t("rr.needsLegal")}
              </button>
              <input
                className="flex-1 min-w-[200px] px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
                placeholder={t("rr.commentPh")}
                value={comment[s.id] ?? ""}
                onChange={(e) => setComment({ ...comment, [s.id]: e.target.value })}
              />
              {comment[s.id] && (
                <button onClick={() => { act(s.id, "comment", comment[s.id]); setComment({ ...comment, [s.id]: "" }); }}
                  className="px-3 py-1.5 text-xs bg-slate-800 text-white rounded-lg">{t("rr.postComment")}</button>
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
          <h3 className="text-sm font-semibold text-slate-800">{t("rr.auditTrail")}</h3>
          <p className="text-xs text-slate-400">{t("rr.auditSub")}</p>
        </div>
        {auditLog.length === 0 ? (
          <p className="p-6 text-sm text-slate-400 text-center">{t("rr.noActivity")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12px] min-w-[640px]">
              <thead>
                <tr className="text-left text-slate-500 bg-slate-50">
                  <th className="px-4 py-2">{t("rr.thTime")}</th><th className="px-2 py-2">{t("rr.thUser")}</th>
                  <th className="px-2 py-2">{t("rr.thAction")}</th><th className="px-2 py-2">{t("rr.thBefore")}</th><th className="px-2 py-2">{t("rr.thAfter")}</th>
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
