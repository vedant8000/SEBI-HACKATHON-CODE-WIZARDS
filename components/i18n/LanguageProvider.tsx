"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { LANG_KEY, translate, type Lang } from "@/lib/i18n/dictionary";

/**
 * App-wide language state (English / हिन्दी). Mounted once at the root layout so
 * the landing page, the sidebar toggle and every portal page share one choice.
 * The choice is persisted to localStorage ("siim.lang") and re-hydrated on load,
 * so switching on any surface converts the whole site and survives navigation.
 */

type Ctx = {
  lang: Lang;
  setLang: (l: Lang) => void;
  /** Translate a key for the active language, interpolating {placeholders}. */
  t: (id: string, params?: Record<string, string | number>) => string;
};

const LanguageContext = createContext<Ctx | null>(null);

/** Full context — null outside the provider. */
export function useLanguage() {
  return useContext(LanguageContext);
}

/** Active language, defaulting to English when no provider is mounted. */
export function useLang(): Lang {
  return useContext(LanguageContext)?.lang ?? "en";
}

/** Translation function bound to the active language. */
export function useT() {
  const ctx = useContext(LanguageContext);
  return ctx?.t ?? ((id: string, params?: Record<string, string | number>) => translate("en", id, params));
}

export default function LanguageProvider({ children }: { children: React.ReactNode }) {
  // Always start at "en" so the server-rendered HTML and the first client render
  // agree; the stored preference is applied in the effect below (post-hydration).
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(LANG_KEY);
      if (stored === "en" || stored === "hi") setLangState(stored);
    } catch {
      /* localStorage unavailable — stay on default */
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem(LANG_KEY, l);
    } catch {
      /* ignore */
    }
  }, []);

  const t = useCallback(
    (id: string, params?: Record<string, string | number>) => translate(lang, id, params),
    [lang],
  );

  const ctx = useMemo<Ctx>(() => ({ lang, setLang, t }), [lang, setLang, t]);
  return <LanguageContext.Provider value={ctx}>{children}</LanguageContext.Provider>;
}
