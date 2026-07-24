"use client";

import { useLanguage } from "./LanguageProvider";
import type { Lang } from "@/lib/i18n/dictionary";

/**
 * English ⇄ हिन्दी pill switch for the sidebar. Shares the app-wide language
 * state, so flipping it converts the entire site at once. Styled for the dark
 * navy sidebar (compare the light variant inside the landing AuthCard).
 */
export default function LangToggle() {
  const ctx = useLanguage();
  const lang: Lang = ctx?.lang ?? "en";
  const setLang = ctx?.setLang ?? (() => {});

  return (
    <div className="flex items-center gap-2 px-2.5 py-1.5">
      <button
        type="button"
        role="switch"
        aria-checked={lang === "hi"}
        aria-label="Switch language"
        onClick={() => setLang(lang === "en" ? "hi" : "en")}
        className="relative grid flex-1 grid-cols-2 items-center rounded-full border border-white/15 bg-white/10 p-0.5 text-[11px] font-semibold select-none cursor-pointer"
      >
        {/* sliding thumb */}
        <span
          aria-hidden
          className={`absolute top-0.5 bottom-0.5 left-0.5 w-[calc(50%-2px)] rounded-full bg-white shadow-sm transition-transform duration-300 ease-out ${
            lang === "hi" ? "translate-x-full" : ""
          }`}
        />
        <span
          className={`relative z-10 py-1 text-center transition-colors duration-300 ${
            lang === "en" ? "text-[#1e3a5f]" : "text-sky-100/70"
          }`}
        >
          English
        </span>
        <span
          className={`relative z-10 py-1 text-center transition-colors duration-300 ${
            lang === "hi" ? "text-[#1e3a5f]" : "text-sky-100/70"
          }`}
        >
          हिन्दी
        </span>
      </button>
    </div>
  );
}
