import AuthCard from "@/components/landing/AuthCard";
import HeroBackdrop from "@/components/landing/HeroBackdrop";

const HERO_CARDS = [
  { img: "/landing/icon-extract.png", title: "Smart Extraction", body: "Extract key data from documents accurately." },
  { img: "/landing/icon-compliance.png", title: "Compliance Check", body: "SEBI-aligned checks for accuracy and completeness." },
  { img: "/landing/icon-citations.png", title: "Draft with Citations", body: "Generate draft content with regulatory citations." },
];

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

function Logo() {
  return (
    <div className="flex items-center gap-3">
      {/* Brand mark cropped from the approved reference artwork */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/landing/siim-mark.png" alt="SIIM logo" className="h-20 w-auto drop-shadow-sm" />
      <div className="leading-tight">
        <div className="text-5xl font-extrabold tracking-tight text-[#1e3a5f] font-serif">SIIM</div>
        <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#0f766e]">
          SME IPO Intelligence Mitra
        </div>
      </div>
    </div>
  );
}

export default function Landing() {
  return (
    <div className="min-h-screen bg-[#f6f4ee] text-slate-800">
      {/* ── Hero fold (reference-style split) ── */}
      <section className="relative isolate min-h-screen flex flex-col px-6 md:px-10 py-6">
        <HeroBackdrop />

        <div className="mx-auto w-full max-w-7xl grid flex-1 items-start pt-4 gap-10 lg:grid-cols-2">
          {/* Left: brand + pitch */}
          <div className="max-w-2xl">
            <Logo />

            <h1 className="mt-9 text-4xl md:text-5xl font-bold leading-[1.1] tracking-tight text-[#1e3a5f] font-serif">
              Simplifying SME IPO<br /><span className="lg:whitespace-nowrap">Offer Document Preparation</span>
            </h1>
            <p className="mt-4 text-base md:text-lg text-slate-600 leading-relaxed max-w-lg">
              Empowering SME promoters and merchant bankers to prepare compliant,
              investor-ready offer documents&mdash;faster.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {HERO_CARDS.map((c) => (
                <div
                  key={c.title}
                  className="rounded-2xl border border-white/70 bg-white/85 backdrop-blur p-4 pt-5 text-center shadow-md shadow-stone-300/40 hover:shadow-lg hover:-translate-y-0.5 transition-all"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={c.img} alt="" className="mx-auto h-20 w-auto" />
                  <div className="mt-2 text-[15px] font-bold text-[#1e3a5f]">{c.title}</div>
                  <p className="mt-1 text-xs leading-snug text-slate-500">{c.body}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right: auth card */}
          <div className="flex justify-center lg:justify-end">
            <AuthCard />
          </div>
        </div>
      </section>
    </div>
  );
}
