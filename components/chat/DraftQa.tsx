"use client";

import { useState } from "react";
import { Bot, Loader2, Send } from "lucide-react";
import { Card } from "@/components/shared/ui";
import ChatMarkdown from "@/components/chat/ChatMarkdown";

const SUGGESTED = [
  "What is still missing before my draft is review-ready?",
  "What should I fix first?",
  "What will the merchant banker likely ask about this draft?",
  "Why is the related-party transaction risky?",
  "Explain Objects of the Issue in simple terms",
  "Explain my biggest risk factor in simple Hindi",
];

/** Grounded Q&A about the draft filing — answers come only from the company's
 *  own facts, gaps and draft sections (via /api/qa). */
export default function DraftQa() {
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
      setChat((c) => [...c, { role: "assistant", text: data.answer ?? "No response — please try again." }]);
    } catch {
      setChat((c) => [...c, { role: "assistant", text: "The assistant could not respond (network or rate limit). Please try again." }]);
    } finally {
      setAsking(false);
    }
  };

  return (
    <Card className="p-5 mt-8">
      <div className="flex items-center gap-2 mb-1">
        <span className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center"><Bot size={16} className="text-white" /></span>
        <div>
          <h3 className="text-sm font-semibold text-slate-800">Ask about your draft filing</h3>
          <p className="text-xs text-slate-400">Answers come only from your uploaded documents, extracted facts, gaps and this draft — final judgement rests with your merchant banker.</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5 my-3">
        {SUGGESTED.map((s) => (
          <button key={s} onClick={() => ask(s)} disabled={asking}
            className="px-2.5 py-1 text-[11px] bg-slate-100 hover:bg-blue-50 hover:text-blue-700 rounded-full text-slate-600 disabled:opacity-50">
            {s}
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
          {asking && <div className="text-slate-400 text-xs flex items-center gap-1.5"><Loader2 size={12} className="animate-spin" /> Thinking…</div>}
        </div>
      )}
      <div className="flex gap-2">
        <input
          className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg"
          placeholder="Type your question about the draft, gaps, risks or process…"
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
