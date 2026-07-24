"use client";

import { useEffect, useRef, useState } from "react";
import {
  Bot, ChevronDown, FileText, FolderOpen, Gauge, Loader2, Send, Sparkles, User,
} from "lucide-react";
import { GlassPanel, HeroBackdrop, ProgressBar, SeverityBadge } from "@/components/shared/ui";
import ChatMarkdown from "@/components/chat/ChatMarkdown";

const STARTER_PROMPTS: { label: string; q: string; primary?: boolean }[] = [
  { label: "What should I fix first?", q: "What should I fix first?", primary: true },
  { label: "Is my RPT risky?", q: "Why is the related-party transaction flagged as risky and what should I disclose?", primary: true },
  { label: "Explain in Hindi", q: "Mere sabse bade risk factor ko simple Hindi mein samjhao", primary: true },
  { label: "What's missing?", q: "Which documents or facts are still missing before my draft is review-ready?" },
  { label: "Explain my score", q: "Explain my IPO readiness score and how to improve it" },
  { label: "MB will ask…", q: "What will the merchant banker likely ask about my draft?" },
];

interface Msg { role: "user" | "assistant"; text: string; at: string }

function Collapsible({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <GlassPanel className="p-4">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between text-[11px] font-semibold text-[#1e3a5f]/70 uppercase tracking-wide"
      >
        {title}
        <ChevronDown size={13} className={`transition-transform ${open ? "" : "-rotate-90"}`} />
      </button>
      {open && <div className="mt-2.5">{children}</div>}
    </GlassPanel>
  );
}

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
    <HeroBackdrop>
      <div className="grid lg:grid-cols-[1fr_300px] gap-5 p-5">
        {/* ── Chat panel ─────────────────────────────────────────────────── */}
        <GlassPanel className="flex flex-col h-[calc(100vh-230px)] min-h-[540px] overflow-hidden">
          <div className="px-5 py-3.5 border-b border-white/60 bg-white/40 flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-sky-500 flex items-center justify-center shadow-md shadow-blue-500/30"><Bot size={17} className="text-white" /></span>
            <div>
              <div className="text-sm font-semibold text-[#1e3a5f]">SIIM Assistant</div>
              <div className="text-[11px] text-slate-500">Grounded in {companyName}&apos;s documents · not legal or regulatory advice</div>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            {chat.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center px-4">
                <div className="grid place-items-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-sky-400 shadow-lg shadow-blue-500/30 mb-4">
                  <Sparkles size={28} className="text-white" />
                </div>
                <h2 className="font-serif text-2xl text-[#1e3a5f] font-semibold tracking-tight">
                  Namaste! Ask me anything about your IPO preparation.
                </h2>
                <p className="text-[13px] text-slate-500 mt-2 max-w-md">
                  I answer only from your uploaded documents, extracted facts, gaps and draft — if I can&apos;t find it there, I&apos;ll say so.
                </p>
                <div className="flex flex-wrap justify-center gap-2 mt-6 max-w-lg">
                  {STARTER_PROMPTS.map((s) => (
                    <button
                      key={s.label}
                      onClick={() => ask(s.q)}
                      disabled={asking}
                      className={`px-4 py-2 text-[12px] font-medium rounded-full transition-all disabled:opacity-50 ${
                        s.primary
                          ? "bg-[#1e3a5f] text-white shadow-md shadow-blue-900/20 hover:bg-[#24466f]"
                          : "bg-white/70 border border-white/80 text-slate-600 hover:bg-blue-50 hover:text-blue-700"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {chat.map((m, i) => (
              <div key={i} className={`flex gap-2.5 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                <span className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${m.role === "user" ? "bg-slate-200" : "bg-gradient-to-br from-blue-600 to-sky-500"}`}>
                  {m.role === "user" ? <User size={14} className="text-slate-600" /> : <Bot size={14} className="text-white" />}
                </span>
                <div className={`max-w-[78%] ${m.role === "user" ? "text-right" : ""}`}>
                  <div className={`inline-block text-left text-[13px] px-4 py-3 rounded-2xl leading-relaxed ${m.role === "user" ? "bg-gradient-to-br from-blue-600 to-sky-500 text-white rounded-tr-sm whitespace-pre-wrap shadow-md shadow-blue-500/20" : "bg-white/80 border border-white/70 text-slate-700 rounded-tl-sm shadow-sm"}`}>
                    {m.role === "user" ? m.text : <ChatMarkdown text={m.text} />}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1 px-1">{m.at}</div>
                </div>
              </div>
            ))}
            {asking && (
              <div className="flex gap-2.5">
                <span className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-sky-500 flex items-center justify-center shrink-0"><Bot size={14} className="text-white" /></span>
                <div className="bg-white/80 border border-white/70 rounded-2xl rounded-tl-sm px-4 py-3 text-xs text-slate-400 flex items-center gap-1.5 shadow-sm">
                  <Loader2 size={12} className="animate-spin" /> Reading your documents…
                </div>
              </div>
            )}
          </div>

          <div className="px-5 pb-5 pt-3">
            <p className="text-[11px] text-slate-500 text-center mb-2">
              Ask in English or Hindi. Answers come only from your uploaded documents, facts, gaps and draft — final judgement rests with your merchant banker.
            </p>
            <div className="flex items-center gap-2 bg-white/80 backdrop-blur-md border border-white/80 rounded-full shadow-md shadow-blue-900/[0.06] pl-5 pr-2 py-2 focus-within:ring-2 focus-within:ring-blue-400/50">
              <input
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400 min-w-0"
                placeholder="Type your question in English or Hindi…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && ask(q)}
              />
              <button onClick={() => ask(q)} disabled={asking || !q.trim()}
                className="w-10 h-10 shrink-0 rounded-full bg-gradient-to-br from-blue-600 to-sky-500 grid place-items-center text-white shadow-md shadow-blue-600/30 hover:shadow-lg transition-shadow disabled:opacity-40">
                <Send size={16} />
              </button>
            </div>
          </div>
        </GlassPanel>

        {/* ── Grounding panel ────────────────────────────────────────────── */}
        <div className="space-y-3">
          <Collapsible title="What I can see">
            <div className="flex items-center justify-between text-[13px] text-slate-700 mb-1">
              <span className="flex items-center gap-1.5"><Gauge size={14} className="text-blue-500 shrink-0" /> Readiness</span>
              <strong>{context.score ?? "—"}/100</strong>
            </div>
            <ProgressBar value={context.score ?? 0} />
            <p className="text-[11px] text-slate-500 mt-1.5">{context.statusLine}</p>

            <div className="h-px bg-white/70 my-3" />

            <div className="space-y-2 text-[13px] text-slate-700">
              <div className="flex items-center gap-2"><FolderOpen size={14} className="text-blue-500 shrink-0" /> {context.docs} documents · {context.facts} extracted facts</div>
              <div className="flex items-center gap-2"><FileText size={14} className="text-blue-500 shrink-0" /> {context.draftSections} draft sections · {context.gaps} open gaps ({context.criticalGaps} critical)</div>
            </div>
          </Collapsible>

          {context.topGaps.length > 0 && (
            <Collapsible title="Worth asking about">
              <div className="space-y-2">
                {context.topGaps.map((g) => {
                  const critical = g.severity === "Critical";
                  return (
                    <button
                      key={g.title}
                      onClick={() => ask(`Tell me more about "${g.title}" — why it matters and how I should fix it.`)}
                      disabled={asking}
                      className={`w-full text-left text-[12px] rounded-lg px-2.5 py-2 border transition-colors disabled:opacity-50 ${
                        critical
                          ? "bg-red-50/80 border-red-200 hover:bg-red-100/80"
                          : "bg-white/60 border-white/70 hover:bg-blue-50/80 hover:border-blue-200"
                      }`}
                    >
                      <div className="mb-0.5"><SeverityBadge severity={g.severity} /></div>
                      <span className={critical ? "text-red-800 font-medium" : "text-slate-600"}>{g.title}</span>
                    </button>
                  );
                })}
              </div>
            </Collapsible>
          )}

          <p className="text-[11px] text-slate-500 leading-relaxed px-1">
            The assistant cannot approve, clear or file anything. It prepares and explains — your merchant banker and
            legal counsel decide.
          </p>
        </div>
      </div>
    </HeroBackdrop>
  );
}
