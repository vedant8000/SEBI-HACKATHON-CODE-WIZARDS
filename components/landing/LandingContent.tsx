"use client";

import AuthCard from "./AuthCard";
import HeroBackdrop from "./HeroBackdrop";
import LanguageProvider, { useLanguage, type Lang } from "./LanguageProvider";

/** Hero copy in both languages — switched by the toggle inside AuthCard. */
const T: Record<Lang, {
  brandTag: string;
  h1Line1: string;
  h1Line2: string;
  pitch: string;
  cards: { img: string; title: string; body: string }[];
}> = {
  en: {
    brandTag: "SME IPO Intelligence Mitra",
    h1Line1: "Simplifying SME IPO",
    h1Line2: "Offer Document Preparation",
    pitch:
      "Empowering SME promoters and merchant bankers to prepare compliant, investor-ready offer documents—faster.",
    cards: [
      { img: "/landing/icon-extract.png", title: "Smart Extraction", body: "Extract key data from documents accurately." },
      { img: "/landing/icon-compliance.png", title: "Compliance Check", body: "SEBI-aligned checks for accuracy and completeness." },
      { img: "/landing/icon-citations.png", title: "Draft with Citations", body: "Generate draft content with regulatory citations." },
    ],
  },
  hi: {
    brandTag: "एसएमई आईपीओ इंटेलिजेंस मित्र",
    h1Line1: "SME IPO ऑफ़र दस्तावेज़ की",
    h1Line2: "तैयारी अब हुई आसान",
    pitch:
      "SME प्रमोटरों और मर्चेंट बैंकरों को अनुपालन-युक्त, निवेशक-तैयार ऑफ़र दस्तावेज़ तेज़ी से तैयार करने में सक्षम बनाना।",
    cards: [
      { img: "/landing/icon-extract.png", title: "स्मार्ट एक्सट्रैक्शन", body: "दस्तावेज़ों से मुख्य डेटा सटीकता से निकालें।" },
      { img: "/landing/icon-compliance.png", title: "अनुपालन जाँच", body: "सटीकता और पूर्णता के लिए SEBI-अनुरूप जाँचें।" },
      { img: "/landing/icon-citations.png", title: "उद्धरण सहित ड्राफ़्ट", body: "नियामक उद्धरणों के साथ ड्राफ़्ट सामग्री तैयार करें।" },
    ],
  },
};

function Logo({ tag }: { tag: string }) {
  return (
    <div className="flex items-center gap-3">
      {/* Brand mark — the loading-screen temple logo (navy on light) */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/landing/siim-logo.png" alt="SIIM logo" className="h-16 w-16 object-contain drop-shadow-sm" />
      <div className="leading-tight">
        <div className="text-5xl font-extrabold tracking-tight text-[#1e3a5f] font-serif">SIIM</div>
        <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#0f766e]">
          {tag}
        </div>
      </div>
    </div>
  );
}

function Hero() {
  const lang = useLanguage()?.lang ?? "en";
  const t = T[lang];
  return (
    <div className="max-w-2xl">
      <Logo tag={t.brandTag} />

      <h1 className="mt-9 text-4xl md:text-5xl font-bold leading-[1.1] tracking-tight text-[#1e3a5f] font-serif">
        {t.h1Line1}
        <br />
        <span className="lg:whitespace-nowrap">{t.h1Line2}</span>
      </h1>
      <p className="mt-4 text-base md:text-lg text-slate-600 leading-relaxed max-w-lg">
        {t.pitch}
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {t.cards.map((c) => (
          <div
            key={c.img}
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
  );
}

export default function LandingContent() {
  return (
    <LanguageProvider>
      <div className="min-h-screen bg-[#f6f4ee] text-slate-800">
        {/* ── Hero fold (reference-style split) ── */}
        <section className="relative isolate min-h-screen flex flex-col px-6 md:px-10 py-6">
          <HeroBackdrop />

          <div className="mx-auto w-full max-w-7xl grid flex-1 items-start pt-4 gap-10 lg:grid-cols-2">
            {/* Left: brand + pitch */}
            <Hero />

            {/* Right: auth card */}
            <div className="flex justify-center lg:justify-end">
              <AuthCard />
            </div>
          </div>
        </section>
      </div>
    </LanguageProvider>
  );
}
