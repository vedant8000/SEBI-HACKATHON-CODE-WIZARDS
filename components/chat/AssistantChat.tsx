"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, FileText, FolderOpen, Gauge, Loader2, Send, Sparkles, User } from "lucide-react";
import { Card, SeverityBadge } from "@/components/shared/ui";

const SUGGESTED: { label: string; q: string }[] = [
  { label: "What should I fix first?", q: "What should I fix first?" },
  { label: "What documents are missing?", q: "Which documents or facts are still missing before my draft is review-ready?" },
  { label: "Merchant banker questions", q: "What will the merchant banker likely ask about my draft?" },
  { label: "Why is RPT risky?", q: "Why is the related-party transaction flagged as risky and what should I disclose?" },
  { label: "Explain my readiness score", q: "Explain my IPO readiness score and how to improve it" },
  { label: "Objects of Issue — simple", q: "Explain Objects of the Issue in simple terms" },
  { label: "Simple Hindi mein samjhao", q: "Mere sabse bade risk factor ko simple Hindi mein samjhao" },
];

interface Msg { role: "user" | "assistant"; text: string; at: string }

export default function AssistantChat({
  companyName, context,
}: {
  companyName: string;
  context: {
    score: number | null; statusLine: string; docs: number; facts: number;
    gaps: number; criticalGaps: number; draftSections: number;
    topGaps: { title: string; severity: string }[];
  };
}) {
  const [chat, setChat] = useState<Msg[]>([]);
  const [q, setQ] = useState("");
  const [asking, setAsking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [chat, asking]);

  const now = () => new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

  const ask = async (question: string) => {
    if (!question.trim() || asking) return;
    setChat((c) => [...c, { role: "user", text: question, at: now() }]);
    setQ("");
    setAsking(true);
    try {
      const res = await fetch("/api/qa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const data = await res.json();
      setChat((c) => [...c, { role: "assistant", text: data.answer ?? "No response — please try again.", at: now() }]);
    } catch {
      setChat((c) => [...c, { role: "assistant", text: "I could not respond (network or rate limit). Please try again in a moment.", at: now() }]);
    } finally {
      setAsking(false);
    }
  };

  return (
    <div className="grid lg:grid-cols-[1fr_300px] gap-5">
      {/* ── Chat panel ─────────────────────────────────────────────────── */}
      <Card className="flex flex-col h-[calc(100vh-230px)] min-h-[480px] overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center"><Bot size={16} className="text-white" /></span>
          <div>
            <div className="text-sm font-semibold text-slate-800">SIIM Assistant</div>
            <div className="text-[11px] text-slate-400">Grounded in {companyName}&apos;s documents · not legal or regulatory advice</div>
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {chat.length === 0 && (
            <div className="text-center pt-10">
              <Sparkles size={26} className="mx-auto text-blue-400 mb-3" />
              <p className="text-sm text-slate-600 font-medium">Namaste! Ask me anything about your IPO preparation.</p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                I answer only from your uploaded documents, extracted facts, gaps and draft — if I can&apos;t find it there, I&apos;ll say so.
              </p>
            </div>
          )}
          {chat.map((m, i) => (
            <div key={i} className={`flex gap-2.5 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
              <span className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${m.role === "user" ? "bg-slate-200" : "bg-blue-600"}`}>
                {m.role === "user" ? <User size={13} className="text-slate-600" /> : <Bot size={13} className="text-white" />}
              </span>
              <div className={`max-w-[78%] ${m.role === "user" ? "text-right" : ""}`}>
                <div className={`inline-block text-left text-[13px] px-3.5 py-2.5 rounded-2xl whitespace-pre-wrap leading-relaxed ${m.role === "user" ? "bg-blue-600 text-white rounded-tr-sm" : "bg-slate-100 text-slate-700 rounded-tl-sm"}`}>
                  {m.text}
                </div>
                <div className="text-[10px] text-slate-300 mt-1 px-1">{m.at}</div>
              </div>
            </div>
          ))}
          {asking && (
            <div className="flex gap-2.5">
              <span className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center shrink-0"><Bot size={13} className="text-white" /></span>
              <div className="bg-slate-100 rounded-2xl rounded-tl-sm px-3.5 py-2.5 text-xs text-slate-400 flex items-center gap-1.5">
                <Loader2 size={12} className="animate-spin" /> Reading your documents…
              </div>
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-slate-100">
          <div className="flex flex-wrap gap-1.5 mb-2.5">
            {SUGGESTED.map((s) => (
              <button key={s.label} onClick={() => ask(s.q)} disabled={asking}
                className="px-2.5 py-1 text-[11px] bg-slate-100 hover:bg-blue-50 hover:text-blue-700 rounded-full text-slate-600 disabled:opacity-50">
                {s.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              className="flex-1 px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Type your question in English or Hindi…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && ask(q)}
            />
            <button onClick={() => ask(q)} disabled={asking || !q.trim()}
              className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-sky-500 text-white rounded-xl shadow-sm shadow-blue-600/30 hover:shadow-md transition-shadow disabled:opacity-40"><Send size={16} /></button>
          </div>
        </div>
      </Card>

      {/* ── Grounding panel ────────────────────────────────────────────── */}
      <div className="space-y-3">
        <Card className="p-4">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-2">What I can see</div>
          <div className="space-y-2.5 text-[13px] text-slate-700">
            <div className="flex items-center gap-2"><Gauge size={14} className="text-blue-500 shrink-0" /> Readiness <strong>{context.score ?? "—"}/100</strong></div>
            <p className="text-[11px] text-slate-400 -mt-1.5 ml-6">{context.statusLine}</p>
            <div className="flex items-center gap-2"><FolderOpen size={14} className="text-blue-500 shrink-0" /> {context.docs} documents · {context.facts} extracted facts</div>
            <div className="flex items-center gap-2"><FileText size={14} className="text-blue-500 shrink-0" /> {context.draftSections} draft sections · {context.gaps} open gaps ({context.criticalGaps} critical)</div>
          </div>
        </Card>
        {context.topGaps.length > 0 && (
          <Card className="p-4">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-2">Worth asking about</div>
            <ul className="space-y-1.5">
              {context.topGaps.map((g) => (
                <li key={g.title} className="text-[12px] text-slate-600 flex items-start gap-1.5">
                  <SeverityBadge severity={g.severity} /> <span>{g.title}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}
        <p className="text-[11px] text-slate-400 leading-relaxed px-1">
          The assistant cannot approve, clear or file anything. It prepares and explains — your merchant banker and
          legal counsel decide.
        </p>
      </div>
    </div>
  );
}
