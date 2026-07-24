"use client";

import { createContext, useContext, useMemo, useState } from "react";

/**
 * Landing-page language state (English / हिन्दी). Lives above the hero and
 * the auth card so the toggle inside AuthCard switches the whole page. The
 * choice is mirrored to localStorage ("siim.lang") for other surfaces.
 */

export type Lang = "en" | "hi";

const LanguageContext = createContext<{ lang: Lang; setLang: (l: Lang) => void } | null>(null);

/** Null outside the provider — callers should fall back to local state. */
export function useLanguage() {
  return useContext(LanguageContext);
}

export default function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>("en");
  const ctx = useMemo(() => ({ lang, setLang }), [lang]);
  return <LanguageContext.Provider value={ctx}>{children}</LanguageContext.Provider>;
}
