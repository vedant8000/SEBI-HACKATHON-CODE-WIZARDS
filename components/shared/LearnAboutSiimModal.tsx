"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  BarChart3,
  BrainCircuit,
  CheckCircle2,
  CircleDashed,
  FileSearch,
  FileText,
  Files,
  Scale,
  ShieldCheck,
  Sparkles,
  Target,
  X,
} from "lucide-react";

type ModalLang = "en" | "hi";

const COPY = {
  en: {
    title: "Understanding SIIM",
    subtitle: "Your SME IPO preparation workspace, in simple words",
    scoreEyebrow: "YOUR READINESS SCORE",
    whatTitle: "What is it?",
    whatBody: "A 0–100 preparation indicator calculated from your company profile, uploaded documents, accepted facts and 37 deterministic checks.",
    greenTitle: "Green · 75–100",
    greenBody: "Stronger preparation. Continue professional verification and close the remaining exceptions.",
    amberTitle: "Amber · 50–74",
    amberBody: "Important gaps remain. Follow the remediation queue and assign each item to the right owner.",
    redTitle: "Red · below 50",
    redBody: "Foundational evidence is missing. Resolve critical blockers before relying on the draft.",
    dimensionsEyebrow: "WHAT MAKES THE SCORE (5 PARTS)",
    dimensions: [
      ["Eligibility", "30%", "Company profile and configured SME IPO readiness rules."],
      ["Disclosure completeness", "25%", "Facts available for important offer-document sections."],
      ["Financial consistency", "20%", "Figures and trends checked across uploaded records."],
      ["Governance", "15%", "Promoter, board, RPT, approvals and compliance inputs."],
      ["Document quality", "10%", "Readable, classified documents connected to evidence."],
    ],
    workflowEyebrow: "HOW SIIM WORKS",
    workflow: [
      ["Upload records", "Add the company profile and supporting documents."],
      ["Review evidence", "Accept, correct or reject facts with page-level sources."],
      ["Run intelligence", "Find gaps, conflicts and likely reviewer questions."],
      ["Prepare the draft", "Generate traceable sections for merchant banker review."],
    ],
    boundaryTitle: "Preparation aid, not regulatory approval",
    boundaryBody: "SIIM does not approve an IPO or replace a SEBI-registered merchant banker, legal counsel or auditor. Every score and draft requires professional verification.",
  },
  hi: {
    title: "SIIM को समझें",
    subtitle: "आपका SME IPO तैयारी कार्यक्षेत्र, आसान भाषा में",
    scoreEyebrow: "आपका तैयारी स्कोर",
    whatTitle: "यह क्या है?",
    whatBody: "कंपनी प्रोफ़ाइल, अपलोड किए गए दस्तावेज़ों, स्वीकृत तथ्यों और 37 निश्चित जाँचों से तैयार 0–100 का तैयारी संकेतक।",
    greenTitle: "हरा · 75–100",
    greenBody: "तैयारी मजबूत है। पेशेवर सत्यापन जारी रखें और शेष अपवादों को पूरा करें।",
    amberTitle: "पीला · 50–74",
    amberBody: "महत्वपूर्ण कमियाँ बाकी हैं। सुधार कतार देखें और हर काम सही व्यक्ति को सौंपें।",
    redTitle: "लाल · 50 से कम",
    redBody: "मूल साक्ष्य उपलब्ध नहीं हैं। ड्राफ्ट पर भरोसा करने से पहले गंभीर बाधाएँ दूर करें।",
    dimensionsEyebrow: "स्कोर के 5 भाग",
    dimensions: [
      ["पात्रता", "30%", "कंपनी प्रोफ़ाइल और निर्धारित SME IPO तैयारी नियम।"],
      ["प्रकटीकरण पूर्णता", "25%", "महत्वपूर्ण ऑफर दस्तावेज़ अनुभागों के लिए उपलब्ध तथ्य।"],
      ["वित्तीय संगति", "20%", "अपलोड किए गए रिकॉर्ड में आँकड़ों और रुझानों की जाँच।"],
      ["गवर्नेंस", "15%", "प्रमोटर, बोर्ड, RPT, अनुमोदन और अनुपालन इनपुट।"],
      ["दस्तावेज़ गुणवत्ता", "10%", "पठनीय और वर्गीकृत दस्तावेज़, जो साक्ष्य से जुड़े हों।"],
    ],
    workflowEyebrow: "SIIM कैसे काम करता है",
    workflow: [
      ["रिकॉर्ड अपलोड करें", "कंपनी प्रोफ़ाइल और सहायक दस्तावेज़ जोड़ें।"],
      ["साक्ष्य की समीक्षा करें", "पेज-स्तरीय स्रोत के साथ तथ्य स्वीकारें, सुधारें या अस्वीकारें।"],
      ["इंटेलिजेंस चलाएँ", "कमियाँ, विरोधाभास और संभावित समीक्षक प्रश्न खोजें।"],
      ["ड्राफ्ट तैयार करें", "मर्चेंट बैंकर समीक्षा के लिए स्रोत-समर्थित अनुभाग बनाएँ।"],
    ],
    boundaryTitle: "तैयारी सहायक, नियामक स्वीकृति नहीं",
    boundaryBody: "SIIM किसी IPO को स्वीकृति नहीं देता और SEBI-पंजीकृत मर्चेंट बैंकर, कानूनी सलाहकार या ऑडिटर का स्थान नहीं लेता। हर स्कोर और ड्राफ्ट का पेशेवर सत्यापन आवश्यक है।",
  },
} satisfies Record<ModalLang, {
  title: string;
  subtitle: string;
  scoreEyebrow: string;
  whatTitle: string;
  whatBody: string;
  greenTitle: string;
  greenBody: string;
  amberTitle: string;
  amberBody: string;
  redTitle: string;
  redBody: string;
  dimensionsEyebrow: string;
  dimensions: string[][];
  workflowEyebrow: string;
  workflow: string[][];
  boundaryTitle: string;
  boundaryBody: string;
}>;

const dimensionIcons: LucideIcon[] = [Target, FileText, BarChart3, ShieldCheck, Files];
const dimensionTones = [
  "bg-blue-100 text-blue-700",
  "bg-violet-100 text-violet-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-cyan-100 text-cyan-700",
];
const workflowIcons: LucideIcon[] = [Files, FileSearch, BrainCircuit, Sparkles];

export default function LearnAboutSiimModal({
  open,
  onClose,
  lang = "en",
}: {
  open: boolean;
  onClose: () => void;
  lang?: ModalLang;
}) {
  const [selectedLang, setSelectedLang] = useState<ModalLang>(lang);
  const t = COPY[selectedLang];

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose, open]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/55 p-4 backdrop-blur-[2px]"
      role="presentation"
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
      data-no-translate
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="learn-siim-title"
        className="flex max-h-[86vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-white/50 bg-[#f7f9fb] shadow-2xl shadow-slate-950/35"
      >
        <header className="relative shrink-0 overflow-hidden bg-gradient-to-r from-[#12345b] via-[#174c76] to-[#0f766e] px-5 py-4 text-white md:px-6">
          <div className="pointer-events-none absolute -right-10 -top-16 h-40 w-40 rounded-full bg-cyan-300/20 blur-3xl" />
          <div className="relative flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/15 bg-white/10"><BrainCircuit size={20} /></span>
            <div className="min-w-0 flex-1">
              <h2 id="learn-siim-title" className="font-serif text-xl font-semibold">{t.title}</h2>
              <p className="mt-0.5 text-xs text-cyan-100">{t.subtitle}</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={selectedLang === "hi"}
              aria-label="Switch popup language"
              onClick={() => setSelectedLang((current) => current === "en" ? "hi" : "en")}
              className="relative grid shrink-0 grid-cols-2 items-center rounded-full border border-white/20 bg-white/10 p-1 text-[10px] font-semibold shadow-inner"
            >
              <span
                aria-hidden
                className={`absolute bottom-1 left-1 top-1 w-[calc(50%-4px)] rounded-full bg-white shadow-sm transition-transform duration-300 ${selectedLang === "hi" ? "translate-x-full" : ""}`}
              />
              <span className={`relative z-10 px-2.5 py-1 transition-colors ${selectedLang === "en" ? "text-[#174376]" : "text-blue-100"}`}>English</span>
              <span className={`relative z-10 px-2.5 py-1 transition-colors ${selectedLang === "hi" ? "text-[#174376]" : "text-blue-100"}`}>हिंदी</span>
            </button>
            <button type="button" onClick={onClose} aria-label="Close" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/15 text-white transition hover:bg-white/25"><X size={18} /></button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 md:px-6">
          <ModalSectionLabel>{t.scoreEyebrow}</ModalSectionLabel>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <InfoCard icon={Target} title={t.whatTitle} body={t.whatBody} tone="blue" />
            <InfoCard icon={CheckCircle2} title={t.greenTitle} body={t.greenBody} tone="green" />
            <InfoCard icon={AlertTriangle} title={t.amberTitle} body={t.amberBody} tone="amber" />
            <InfoCard icon={CircleDashed} title={t.redTitle} body={t.redBody} tone="red" />
          </div>

          <div className="mt-6"><ModalSectionLabel>{t.dimensionsEyebrow}</ModalSectionLabel></div>
          <div className="mt-3 grid gap-2.5 md:grid-cols-2">
            {t.dimensions.map(([title, weight, body], index) => {
              const Icon = dimensionIcons[index];
              return (
                <div key={title} className={`${index === t.dimensions.length - 1 ? "md:col-span-2" : ""} flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm`}>
                  <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${dimensionTones[index]}`}><Icon size={17} /></span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2"><h3 className="text-sm font-semibold text-[#15345b]">{title}</h3><span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">{weight}</span></div>
                    <p className="mt-1 text-xs leading-5 text-slate-600">{body}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6"><ModalSectionLabel>{t.workflowEyebrow}</ModalSectionLabel></div>
          <div className="mt-3 grid gap-2.5 md:grid-cols-2">
            {t.workflow.map(([title, body], index) => {
              const Icon = workflowIcons[index];
              return (
                <div key={title} className="relative overflow-hidden rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-3.5">
                  <span className="absolute right-3 top-1 text-3xl font-bold text-blue-100">{index + 1}</span>
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-blue-100 text-blue-700"><Icon size={15} /></span>
                  <h3 className="mt-2.5 text-sm font-semibold text-[#15345b]">{title}</h3>
                  <p className="mt-1 text-xs leading-5 text-slate-600">{body}</p>
                </div>
              );
            })}
          </div>

          <div className="mt-5 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-700"><Scale size={17} /></span>
            <div><h3 className="text-sm font-semibold text-amber-950">{t.boundaryTitle}</h3><p className="mt-1 text-xs leading-5 text-amber-900/80">{t.boundaryBody}</p></div>
          </div>
        </div>
      </section>
    </div>,
    document.body,
  );
}

function ModalSectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#0f766e]">{children}</span>
      <span className="h-px flex-1 bg-gradient-to-r from-teal-300 to-transparent" />
    </div>
  );
}

function InfoCard({ icon: Icon, title, body, tone }: { icon: LucideIcon; title: string; body: string; tone: "blue" | "green" | "amber" | "red" }) {
  const styles = {
    blue: "border-blue-100 bg-blue-50/70 text-blue-700",
    green: "border-emerald-100 bg-emerald-50/70 text-emerald-700",
    amber: "border-amber-100 bg-amber-50/70 text-amber-700",
    red: "border-red-100 bg-red-50/70 text-red-700",
  }[tone];
  return (
    <div className={`flex items-start gap-3 rounded-xl border p-4 ${styles}`}>
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/80 shadow-sm"><Icon size={17} /></span>
      <div><h3 className="text-sm font-semibold text-slate-800">{title}</h3><p className="mt-1 text-xs leading-5 text-slate-600">{body}</p></div>
    </div>
  );
}
