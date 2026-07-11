import Link from "next/link";
import SiimHero3D from "@/components/landing/SiimHero3D";
import {
  FolderOpen, FileSearch, FileText, UserCheck, AlertTriangle,
  Landmark, Upload, Sparkles, ArrowRight, Bot, ChevronsRight,
} from "lucide-react";

const WORKFLOW = [
  { n: 1, title: "Upload Available Documents", items: ["Financials", "Legal Records", "Promoter Details"], note: "No fixed document bundle required", highlight: false },
  { n: 2, title: "Extract & Structure Information", items: ["Classify Files", "Extract Key Data", "Map to IPO Section"], note: "", highlight: false },
  { n: 3, title: "Assess IPO Readiness", items: ["Missing Disclosure", "Risk Flags", "Document Gaps"], note: "", highlight: true },
  { n: 4, title: "Generate IPO Document Draft", items: ["Chapter Wise Drafting", "SME IPO Format", "Source Linked Output"], note: "", highlight: false },
  { n: 5, title: "Review, Resolve & Export", items: ["Review AI Draft", "Resolve Flags", "Export Review File"], note: "", highlight: false },
];

const stats = [
  ["57", "prospectus sections in the blueprint"],
  ["30+", "eligibility & consistency rules"],
  ["100%", "facts traceable to source pages"],
  ["6", "steps from records to review-ready"],
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-[#0f0e0c] text-slate-200 overflow-hidden">
      {/* Nav */}
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-[#0f0e0c]/70 border-b border-white/5">
      <nav className="max-w-6xl mx-auto flex items-center justify-between px-6 py-3">
        <div className="flex items-center gap-2.5">
          <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-sky-400 flex items-center justify-center shadow-lg shadow-blue-500/25">
            <Landmark size={18} className="text-white" />
          </span>
          <div>
            <div className="font-semibold text-white leading-tight">SIIM</div>
            <div className="text-[10px] text-slate-400 leading-tight">SME IPO Intelligence Mitra</div>
            
          </div>
        </div>
        <Link href="/onboarding"
          className="px-4 py-2 bg-white/10 border border-white/15 backdrop-blur text-white text-sm rounded-lg hover:bg-white/20 transition-colors">
          Open Platform
        </Link>
      </nav>
      </header>

      {/* Hero */}
      <section className="relative max-w-6xl mx-auto px-6 pt-2 pb-16 text-center">
        {/* glow */}
        <div className="pointer-events-none absolute inset-x-0 -top-40 h-[480px] bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.28),transparent_60%)]" />
        <div className="relative">
          <SiimHero3D />
          <div className="siim-rest">
          <h1 className="mt-6 text-2xl md:text-4xl font-bold text-white leading-[1.15] max-w-3xl mx-auto tracking-tight">
            From scattered records to a{" "}
            <span className="bg-gradient-to-r from-blue-400 via-sky-300 to-cyan-300 bg-clip-text text-transparent">
              review-ready SME IPO draft
            </span>
          </h1>
          <p className="text-base md:text-lg text-slate-400 mt-3 max-w-2xl mx-auto leading-relaxed">
            From audited financials to board resolutions, SIIM converts your company records into an
            evidence-backed draft offer document, with every gap, risk and reviewer question surfaced early.
          </p>
          <div className="flex flex-wrap justify-center gap-3 mt-6">
            <Link href="/onboarding"
              className="group flex items-center gap-2 px-7 py-3.5 bg-gradient-to-r from-blue-600 to-sky-500 text-white rounded-xl font-semibold shadow-lg shadow-blue-600/30 hover:shadow-blue-500/40 hover:-translate-y-0.5 transition-all">
              <Sparkles size={16} /> Start With Your Company
              <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <Link href="/data-room"
              className="flex items-center gap-2 px-7 py-3.5 bg-white/5 border border-white/15 rounded-xl font-semibold text-slate-200 hover:bg-white/10 transition-colors">
              <Upload size={16} /> Upload IPO Documents
            </Link>
          </div>
          </div>
        </div>


        {/* product preview: show the product, not just words */}
        <div className="relative mt-12 siim-rest" style={{ animationDelay: "0.6s" }}>
          <div className="pointer-events-none absolute -inset-x-10 -top-12 h-72 bg-[radial-gradient(ellipse_at_top,rgba(56,189,248,0.14),transparent_65%)]" />
          <div className="relative rounded-2xl border border-white/10 bg-[#161411]/95 shadow-2xl shadow-blue-950/50 overflow-hidden text-left">
            <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-white/10 bg-white/[0.03]">
              <span className="w-2.5 h-2.5 rounded-full bg-red-400/70" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400/70" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/70" />
              <span className="ml-3 px-3 py-1 rounded-md bg-white/5 text-[11px] text-slate-400 font-mono">siim.app/intelligence</span>
              <span className="ml-auto text-[10px] text-slate-500 hidden md:block">live from your documents</span>
            </div>
            <div className="grid md:grid-cols-3 gap-4 p-5">
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-3">IPO Readiness</div>
                <div className="flex items-center gap-4">
                  <svg width="72" height="72" className="-rotate-90 shrink-0">
                    <circle cx="36" cy="36" r="30" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="7" />
                    <circle cx="36" cy="36" r="30" fill="none" stroke="url(#pg)" strokeWidth="7" strokeLinecap="round" strokeDasharray="188.5" strokeDashoffset="50.9" />
                    <defs><linearGradient id="pg"><stop offset="0%" stopColor="#3b82f6" /><stop offset="100%" stopColor="#2dd4bf" /></linearGradient></defs>
                  </svg>
                  <div>
                    <div className="text-3xl font-bold text-white">73<span className="text-sm text-slate-500">/100</span></div>
                    <div className="text-[10px] text-slate-400 mt-0.5 leading-snug">Partially ready. MB review recommended.</div>
                  </div>
                </div>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-3">Detected Gaps</div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-[11px] text-slate-300"><span className="w-1.5 h-1.5 rounded-full shrink-0 bg-red-400" /> Restated financials missing</div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-300"><span className="w-1.5 h-1.5 rounded-full shrink-0 bg-amber-400" /> Receivables grew 161% vs revenue</div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-300"><span className="w-1.5 h-1.5 rounded-full shrink-0 bg-amber-400" /> GST vs books: 1.2 Cr difference</div>
                </div>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-3">Draft · Risk Factors</div>
                <p className="text-[11px] text-slate-300 leading-relaxed">Our trade receivables increased to Rs 34.7 crore in FY2024, and operating cash flow was negative…</p>
                <div className="mt-2.5 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-500/15 border border-blue-400/30 text-[9px] text-blue-300">
                  📎 Audited Financials FY2024.pdf · p.1 · 98%
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* stats strip */}
        <div className="relative grid grid-cols-2 md:grid-cols-4 gap-px bg-white/10 rounded-2xl overflow-hidden border border-white/10 mt-12">
          {stats.map(([n, label]) => (
            <div key={label} className="bg-[#1a1815]/80 px-6 py-5">
              <div className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">{n}</div>
              <div className="text-[11px] text-slate-400 mt-1 leading-snug">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* SIIM workflow (5 steps, as per deck) */}
      <section className="relative border-y border-white/10 bg-white/[0.02] py-16">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-2xl font-bold text-white text-center">The SIIM Workflow</h2>
          <p className="text-sm text-slate-400 text-center mt-2 mb-12">From scattered documents to review ready IPO draft</p>
          <div className="flex flex-col lg:flex-row items-stretch gap-3">
            {WORKFLOW.map((w, i) => (
              <div key={w.n} className="flex flex-col lg:flex-row items-stretch flex-1 gap-3">
                <div className={`relative flex-1 rounded-2xl border p-5 pt-8 transition-all hover:-translate-y-1 ${
                  w.highlight
                    ? "border-amber-400/50 bg-amber-500/10 hover:border-amber-300/70"
                    : "border-sky-400/30 bg-slate-900/60 hover:border-sky-300/60"
                }`}>
                  <span className={`absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full text-white text-sm font-bold flex items-center justify-center shadow-lg ${
                    w.highlight ? "bg-gradient-to-br from-amber-500 to-orange-400 shadow-amber-500/40" : "bg-gradient-to-br from-blue-600 to-sky-400 shadow-blue-500/40"
                  }`}>{w.n}</span>
                  <div className={`text-sm font-bold text-center leading-snug ${w.highlight ? "text-amber-200" : "text-white"}`}>{w.title}</div>
                  <div className="mt-4 space-y-2">
                    {w.items.map((it) => (
                      <div key={it} className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-medium ${
                        w.highlight ? "border-amber-400/40 bg-amber-500/10 text-amber-100" : "border-white/15 bg-white/5 text-slate-200"
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${w.highlight ? "bg-amber-400" : "bg-sky-400"}`} />
                        {it}
                      </div>
                    ))}
                    {w.note && (
                      <div className="rounded-full border border-dashed border-sky-400/50 px-3 py-1.5 text-[10px] text-sky-300 text-center">
                        {w.note}
                      </div>
                    )}
                  </div>
                </div>
                {i < WORKFLOW.length - 1 && (
                  <ChevronsRight size={22} className="hidden lg:block self-center text-sky-400 shrink-0" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features: bento grid */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <h2 className="text-2xl font-bold text-white text-center mb-10">What&apos;s inside</h2>
        <div className="grid md:grid-cols-3 gap-4 auto-rows-[minmax(120px,auto)]">
          <div className="md:col-span-2 md:row-span-2 group bg-slate-900/60 border border-white/10 rounded-2xl p-7 hover:border-blue-400/40 transition-all flex flex-col">
            <span className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-400/25 flex items-center justify-center mb-4">
              <FileText size={18} className="text-blue-400" />
            </span>
            <div className="font-semibold text-white text-lg">Source-linked draft generation</div>
            <p className="text-sm text-slate-400 mt-2 leading-relaxed max-w-md">
              Real SME offer-document sections drafted only from your extracted facts. Every sentence traces to a
              document and page; missing data is tracked, never invented.
            </p>
            <div className="mt-auto pt-6">
              <div className="rounded-xl border border-white/10 bg-black/30 p-4 text-left">
                <div className="text-[11px] font-semibold text-slate-300 border-b border-white/10 pb-2 mb-2">Related Party Transactions <span className="ml-2 text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-400/30 text-amber-300">AI Drafted · 100%</span></div>
                <p className="text-[11px] text-slate-400 leading-relaxed">During FY2024, the Company procured goods aggregating Rs 3.1 crore from Jindal Switchgear Traders LLP, an entity in which the promoter family holds interest…</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <span className="px-2 py-0.5 rounded bg-blue-500/15 border border-blue-400/30 text-[9px] text-blue-300">📎 RPT Register FY2024.pdf · p.1</span>
                  <span className="px-2 py-0.5 rounded bg-red-500/15 border border-red-400/30 text-[9px] text-red-300">⚠ RPT risk 70/100</span>
                </div>
              </div>
            </div>
          </div>
          <div className="group bg-slate-900/60 border border-white/10 rounded-2xl p-6 hover:border-blue-400/40 hover:-translate-y-0.5 transition-all">
            <FolderOpen size={18} className="text-blue-400 mb-3" />
            <div className="font-semibold text-white text-sm">Upload anything</div>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">PDFs read page-by-page, classified and processed automatically. Scans fall back to manual entry.</p>
          </div>
          <div className="group bg-slate-900/60 border border-white/10 rounded-2xl p-6 hover:border-blue-400/40 hover:-translate-y-0.5 transition-all">
            <FileSearch size={18} className="text-sky-400 mb-3" />
            <div className="font-semibold text-white text-sm">Page-cited facts</div>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">Every figure carries its source, page number and confidence. Accept, correct or reject anything.</p>
          </div>
          <div className="group bg-slate-900/60 border border-white/10 rounded-2xl p-6 hover:border-blue-400/40 hover:-translate-y-0.5 transition-all">
            <AlertTriangle size={18} className="text-amber-400 mb-3" />
            <div className="font-semibold text-white text-sm">Gaps before reviewers</div>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">30+ deterministic rules surface missing data, mismatches and related-party risks. The AI never decides compliance.</p>
          </div>
          <div className="group bg-slate-900/60 border border-white/10 rounded-2xl p-6 hover:border-blue-400/40 hover:-translate-y-0.5 transition-all">
            <UserCheck size={18} className="text-teal-300 mb-3" />
            <div className="font-semibold text-white text-sm">Merchant banker review</div>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">Approvals, change requests, comments and an audit trail. AI prepares; professionals decide.</p>
          </div>
          <div className="bg-gradient-to-br from-blue-600/20 to-sky-500/10 border border-blue-400/30 rounded-2xl p-6">
            <Bot size={18} className="text-blue-300 mb-3" />
            <div className="font-semibold text-white text-sm">Ask in English or Hindi</div>
            <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">A grounded assistant that answers only from your documents and gaps. It tells you when it cannot find something.</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-10">
        <div className="max-w-6xl mx-auto px-6 text-center text-xs text-slate-500 leading-relaxed">
          <p className="max-w-3xl mx-auto">
            <strong className="text-slate-400">Important:</strong> SIIM is an AI-assisted draft preparation tool built as a hackathon MVP.
            It does not constitute legal, investment, accounting or regulatory advice, and does not replace
            SEBI-registered merchant bankers, legal counsel, auditors or regulatory filing processes. Generated drafts
            are for professional review and never for direct filing or inviting subscription.
          </p>
          <p className="mt-4 text-slate-400 font-medium">Made by Code Wizards</p>
        </div>
      </footer>
    </div>
  );
}
