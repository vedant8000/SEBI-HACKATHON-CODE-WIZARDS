"use client";

import { useState } from "react";
import { Bot, Loader2, Send } from "lucide-react";
import { Card } from "@/components/shared/ui";
import ChatMarkdown from "@/components/chat/ChatMarkdown";
import { useT } from "@/components/i18n/LanguageProvider";

const SUGGESTED_KEYS = ["qa.s1", "qa.s2", "qa.s3", "qa.s4", "qa.s5", "qa.s6"];

/** Grounded Q&A about the draft filing — answers come only from the company's
 *  own facts, gaps and draft sections (via /api/qa). */
export default function DraftQa() {
  const t = useT();
  const [chat, setChat] = useState<{ role: "user" | "assistant"; text: string }[]>([]);
  const [q, setQ] = useState("");
  const [asking, setAsking] = useState(false);

  const ask = async (question: string) => {
    if (!question.trim() || asking) return;
    setChat((c) => [...c, { role: "user", text: question }]);
    setQ("");
    setAsking(true);
    try {
      const res = await fetch("/api/qa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const data = await res.json();
      setChat((c) => [...c, { role: "assistant", text: data.answer ?? t("qa.noResponse") }]);
    } catch {
      setChat((c) => [...c, { role: "assistant", text: t("qa.errorResp") }]);
    } finally {
      setAsking(false);
    }
  };

  return (
    <Card className="p-5 mt-8">
      <div className="flex items-center gap-2 mb-1">
        <span className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center"><Bot size={16} className="text-white" /></span>
        <div>
          <h3 className="text-sm font-semibold text-slate-800">{t("qa.title")}</h3>
          <p className="text-xs text-slate-400">{t("qa.sub")}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5 my-3">
        {SUGGESTED_KEYS.map((key) => (
          <button key={key} onClick={() => ask(t(key))} disabled={asking}
            className="px-2.5 py-1 text-[11px] bg-slate-100 hover:bg-blue-50 hover:text-blue-700 rounded-full text-slate-600 disabled:opacity-50">
            {t(key)}
          </button>
        ))}
      </div>
      {chat.length > 0 && (
        <div className="space-y-2.5 max-h-[420px] overflow-y-auto mb-3 pr-1">
          {chat.map((m, i) => (
            <div key={i} className={`text-[13px] px-3 py-2 rounded-lg leading-relaxed ${m.role === "user" ? "bg-blue-600 text-white ml-16 whitespace-pre-wrap" : "bg-slate-100 text-slate-700 mr-8"}`}>
              {m.role === "user" ? m.text : <ChatMarkdown text={m.text} />}
            </div>
          ))}
          {asking && <div className="text-slate-400 text-xs flex items-center gap-1.5"><Loader2 size={12} className="animate-spin" /> {t("qa.thinking")}</div>}
        </div>
      )}
      <div className="flex gap-2">
        <input
          className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg"
          placeholder={t("qa.inputPh")}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && ask(q)}
        />
        <button onClick={() => ask(q)} disabled={asking}
          className="px-3.5 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50"><Send size={15} /></button>
      </div>
    </Card>
  );
}
