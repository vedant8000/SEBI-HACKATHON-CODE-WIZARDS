"use client";

import { useT } from "./LanguageProvider";

/**
 * Renders a translated string for the active language. A client leaf so it can
 * be dropped straight into server components (page headings, empty states)
 * without turning the whole page into a client component.
 */
export default function Tr({
  id,
  params,
}: {
  id: string;
  params?: Record<string, string | number>;
}) {
  const t = useT();
  return <>{t(id, params)}</>;
}
