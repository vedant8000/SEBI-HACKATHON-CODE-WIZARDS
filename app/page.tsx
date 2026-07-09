import Link from "next/link";
import {
  FolderOpen, Gauge, Grid3x3, FileText, UserCheck, GitBranch, Calculator,
  MessageSquareWarning, Landmark, ShieldCheck, Upload, Sparkles,
} from "lucide-react";

const features = [
  { icon: FolderOpen, title: "Smart Data Room", desc: "Upload real documents — PDFs are read, classified and mined for entities, numbers and inconsistencies. Scanned copies? Correct extracted values manually." },
  { icon: Gauge, title: "IPO Readiness Score", desc: "A weighted 0–100 score computed from eligibility, financial health, disclosure completeness, governance and document quality rules." },
  { icon: Grid3x3, title: "Compliance Heatmap", desc: "All 25 offer-document sections with completion %, missing inputs, inconsistencies and risk levels." },
  { icon: FileText, title: "Source-Linked Draft Generator", desc: "A section-wise draft where every factual statement traces back to the uploaded document it came from — or honestly says the source is missing." },
  { icon: UserCheck, title: "Merchant Banker Review", desc: "A dedicated review room with approvals, change requests, comments and a full audit trail. AI prepares; professionals decide." },
  { icon: GitBranch, title: "RPT Risk Engine", desc: "Detects promoter-group entities, related-party loans and fund-diversion patterns — with suggested disclosures and required evidence." },
  { icon: Calculator, title: "Financial Consistency Checker", desc: "Cross-checks audited revenue vs GST turnover, receivables vs revenue growth, interest vs borrowings, PAT vs reserves." },
  { icon: MessageSquareWarning, title: "Exchange Observation Simulator", desc: "Predicts the questions exchanges and merchant bankers are likely to ask — before they ask them." },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="max-w-6xl mx-auto flex items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2.5">
          <span className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center">
            <Landmark size={18} className="text-white" />
          </span>
          <div>
            <div className="font-semibold text-slate-900 leading-tight">IPO Saathi</div>
            <div className="text-[10px] text-slate-500 leading-tight">AI Disclosure Intelligence for SME IPOs</div>
          </div>
        </div>
        <Link href="/dashboard" className="px-4 py-2 bg-slate-900 text-white text-sm rounded-lg hover:bg-slate-700">
          Open Platform
        </Link>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-16 pb-20 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 border border-blue-200 rounded-full text-xs text-blue-700 font-medium mb-6">
          <ShieldCheck size={13} /> Built for SEBI Hackathon — Problem Statement 4: Simplifying IPO Offer Document Preparation for SMEs
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-slate-900 leading-tight max-w-4xl mx-auto">
          Generate SME IPO Drafts Faster with{" "}
          <span className="text-blue-600">Evidence-Backed AI Disclosure Intelligence</span>
        </h1>
        <p className="text-lg text-slate-600 mt-6 max-w-3xl mx-auto">
          IPO Saathi helps SME promoters convert scattered company records into a structured, source-linked IPO draft
          with readiness checks, compliance gap detection and a merchant banker review workflow.
        </p>
        <div className="flex flex-wrap justify-center gap-3 mt-8">
          <Link href="/onboarding" className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700">
            <Sparkles size={16} /> Start With Your Company
          </Link>
          <Link href="/data-room" className="flex items-center gap-2 px-6 py-3 border border-slate-300 rounded-lg font-medium text-slate-700 hover:bg-slate-50">
            <Upload size={16} /> Upload IPO Documents
          </Link>
        </div>
        <p className="text-xs text-slate-400 mt-6 max-w-2xl mx-auto">
          Upload whatever documents you have — they are read page-by-page, classified, and mined for facts with full
          source provenance. Every score, gap and draft section is generated from your own records; nothing is pre-baked.
        </p>
      </section>

      {/* How it works */}
      <section className="bg-slate-50 border-y border-slate-200 py-14">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-xl font-semibold text-slate-900 text-center mb-10">From scattered records to a review-ready draft</h2>
          <div className="grid md:grid-cols-4 gap-6 text-center">
            {[
              ["1. Tell us about your company", "A guided, plain-language profile — no jargon, with help at every field."],
              ["2. Upload what you have", "Financials, GST returns, KYC, contracts, quotations. We read, classify and cross-check them."],
              ["3. See gaps before reviewers do", "Readiness score, compliance heatmap, RPT risks and financial inconsistencies — explained simply."],
              ["4. Generate & hand over", "A source-linked draft offer document goes to your merchant banker for professional review."],
            ].map(([t, d]) => (
              <div key={t} className="bg-white border border-slate-200 rounded-xl p-5">
                <div className="font-medium text-slate-900 text-sm">{t}</div>
                <div className="text-xs text-slate-500 mt-2 leading-relaxed">{d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <h2 className="text-xl font-semibold text-slate-900 text-center mb-10">What&apos;s inside</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
          {features.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="border border-slate-200 rounded-xl p-5 hover:shadow-md transition-shadow">
              <span className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center mb-3">
                <Icon size={17} className="text-blue-600" />
              </span>
              <div className="font-medium text-slate-900 text-sm">{title}</div>
              <div className="text-xs text-slate-500 mt-1.5 leading-relaxed">{desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-8">
        <div className="max-w-6xl mx-auto px-6 text-center text-xs text-slate-400 leading-relaxed">
          <p className="max-w-3xl mx-auto">
            <strong>Important:</strong> IPO Saathi is an AI-assisted draft preparation tool built as a hackathon MVP.
            It does not constitute legal, investment, accounting or regulatory advice, and does not replace
            SEBI-registered merchant bankers, legal counsel, auditors or regulatory filing processes. Generated drafts
            are for professional review — never for direct filing or inviting subscription.
          </p>
          <p className="mt-3">IPO Saathi · SEBI Hackathon 2026 · Problem Statement 4</p>
        </div>
      </footer>
    </div>
  );
}
