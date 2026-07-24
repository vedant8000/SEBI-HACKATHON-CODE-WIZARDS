"use client";

/**
 * Compatibility shim. Landing-page language state now lives in the app-wide
 * provider (components/i18n/LanguageProvider) so the toggle converts the whole
 * site, not just the hero. Re-exported here so existing landing imports keep
 * working; the actual <LanguageProvider> is mounted once at the root layout.
 */

export { default, useLanguage } from "@/components/i18n/LanguageProvider";
export type { Lang } from "@/lib/i18n/dictionary";
