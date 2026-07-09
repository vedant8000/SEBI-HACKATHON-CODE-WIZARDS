"use client";

import { useState } from "react";
import { Loader2, Send } from "lucide-react";
import { Card } from "@/components/shared/ui";

const MODES = [
  { key: "promoter", label: "Promoter Summary", desc: "What your IPO document says — for you" },
  { key: "investor", label: "Investor Summary", desc: "How potential investors may read it" },
  { key: "risk", label: "Risk Summary", desc: "Red flags and weaknesses, straight up" },
];

const SUGGESTED = [
  "What should I fix first?",
  "What documents are missing?",
  "Why is RPT risky?",
  "What will the merchant banker likely ask?",
  "Why is this risk factor needed?",
  "Explain Objects of the Issue in simple terms",
];

export default function SummaryTabs({ summaries }: { summaries: Record<string, string> }) {
  const [mode, setMode] = useState("promoter");
  const [lang, setLang] = useState<"en" | "hi">("en");
  const [chat, setChat] = useState<{ role: "user" | "assistant"; text: string }[]>([]);
  const [q, setQ] = useState("");
  const [asking, setAsking] = useState(false);

  const ask = async (question: string) => {
    if (!question.trim()) return;
    setChat((c) => [...c, { role: "user", text: question }]);
    setQ("");
    setAsking(true);
    try {
      const res = await fetch("/api/qa", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question }) });
      const data = await res.json();
      setChat((c) => [...c, { role: "assistant", text: data.answer }]);
    } finally { setAsking(false); }
  };

  return (
    <div className="grid lg:grid-cols-2 gap-5">
      <div>
        <div className="flex flex-wrap items-center gap-2 mb-3">
          {MODES.map((m) => (
            <button key={m.key} onClick={() => setMode(m.key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border ${mode === m.key ? "bg-blue-600 text-white border-blue-600" : "border-slate-300 text-slate-600 hover:bg-slate-50"}`}>
              {m.label}
            </button>
          ))}
          <div className="ml-auto flex rounded-lg border border-slate-300 overflow-hidden">
            <button onClick={() => setLang("en")} className={`px-3 py-1.5 text-xs font-medium ${lang === "en" ? "bg-slate-800 text-white" : "text-slate-600"}`}>English</button>
            <button onClick={() => setLang("hi")} className={`px-3 py-1.5 text-xs font-medium ${lang === "hi" ? "bg-slate-800 text-white" : "text-slate-600"}`}>Simple Hindi</button>
          </div>
        </div>
        <Card className="p-5">
          <p className="text-xs text-slate-400 mb-2">{MODES.find((m) => m.key === mode)?.desc}</p>
          <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{summaries[`${mode}:${lang}`]}</p>
        </Card>
      </div>

      <Card className="p-5 flex flex-col h-fit lg:sticky lg:top-20">
        <h3 className="text-sm font-semibold text-slate-800">Ask IPO Saathi</h3>
        <p className="text-xs text-slate-400 mb-3">Answers are grounded in your company&apos;s own analysis — final judgement always rests with your merchant banker.</p>
        <div className="flex flex-wrap gap-1.5 mb-3">
          {SUGGESTED.map((s) => (
            <button key={s} onClick={() => ask(s)} className="px-2.5 py-1 text-[11px] bg-slate-100 hover:bg-blue-50 hover:text-blue-700 rounded-full text-slate-600">
              {s}
            </button>
          ))}
        </div>
        <div className="space-y-2.5 max-h-[380px] overflow-y-auto mb-3">
          {chat.map((m, i) => (
            <div key={i} className={`text-[13px] px-3 py-2 rounded-lg whitespace-pre-wrap leading-relaxed ${m.role === "user" ? "bg-blue-600 text-white ml-10" : "bg-slate-100 text-slate-700 mr-6"}`}>
              {m.text}
            </div>
          ))}
          {asking && <div className="text-slate-400 text-xs flex items-center gap-1.5"><Loader2 size={12} className="animate-spin" /> Thinking…</div>}
        </div>
        <div className="flex gap-2 mt-auto">
          <input className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg"
            placeholder="Type your question…" value={q}
            onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && ask(q)} />
          <button onClick={() => ask(q)} disabled={asking} className="px-3 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50"><Send size={15} /></button>
        </div>
      </Card>
    </div>
  );
}
