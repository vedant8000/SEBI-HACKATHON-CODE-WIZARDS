"use client";

import { mdToHtml } from "@/lib/utils/markdown";

/**
 * Renders an assistant reply inside a chat bubble. The model is instructed to
 * answer in plain prose, but anything that still arrives as markdown (bold,
 * bullet lists, tables — including the deterministic fallback answers) is
 * rendered properly instead of showing raw asterisks and dashes.
 * mdToHtml escapes HTML before converting, so this is safe to inject.
 */
export default function ChatMarkdown({ text }: { text: string }) {
  return (
    <div
      className={[
        "[&_p]:my-1 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0",
        "[&_ul]:my-1 [&_ul]:pl-4 [&_ul]:list-disc [&_li]:my-0.5",
        "[&_.md-h]:font-semibold [&_.md-h]:text-slate-800 [&_.md-h]:mt-2 [&_.md-h]:mb-0.5",
        "[&_strong]:font-semibold [&_strong]:text-slate-800",
        "[&_table]:my-1.5 [&_table]:w-full [&_table]:border-collapse [&_table]:text-[12px]",
        "[&_th]:border [&_th]:border-slate-300 [&_th]:bg-slate-200/60 [&_th]:px-2 [&_th]:py-1 [&_th]:text-left",
        "[&_td]:border [&_td]:border-slate-300 [&_td]:px-2 [&_td]:py-1 [&_td]:align-top",
      ].join(" ")}
      dangerouslySetInnerHTML={{ __html: mdToHtml(text) }}
    />
  );
}
