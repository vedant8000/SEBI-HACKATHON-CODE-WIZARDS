import { NextResponse } from "next/server";
import { getContext } from "@/lib/server/context";
import { mdToHtml } from "@/lib/utils/markdown";

const esc = (s: string) =>
  (s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/**
 * Merchant Banker Review Pack — printable HTML (print → Save as PDF):
 * draft sections with source references, review statuses, comments,
 * unresolved gaps and the standard disclaimer.
 */
export async function GET() {
  const { company, draft, analysis } = getContext();
  const gaps = (analysis?.gaps ?? []).filter((g) => g.status !== "Resolved");
  const name = company?.name ?? "Company";
  const html = `<!doctype html><html><head><meta charset="utf-8">
<title>Merchant Banker Review Pack — ${esc(name)}</title>
<style>
  body{font-family:system-ui,sans-serif;max-width:900px;margin:40px auto;padding:0 24px;color:#111;line-height:1.55}
  h1{color:#1e3a5f} h2{color:#1e3a5f;margin-top:30px;border-bottom:1px solid #cbd5e1;padding-bottom:5px}
  table{border-collapse:collapse;width:100%;font-size:13px;margin-top:8px}
  th,td{border:1px solid #d1d5db;padding:7px 10px;text-align:left;vertical-align:top}
  th{background:#f1f5f9}
  .banner{background:#fef3c7;border:1px solid #f59e0b;padding:12px 16px;border-radius:6px;font-size:13px}
  .meta{color:#555;font-size:12.5px}
  .src{background:#eff6ff;border-left:3px solid #2a78d6;padding:6px 10px;font-size:12px;margin-top:8px}
  .cmt{background:#f8fafc;border-left:3px solid #94a3b8;padding:6px 10px;font-size:12px;margin-top:6px}
  .warn{background:#fef2f2;border-left:3px solid #d03b3b;padding:6px 10px;font-size:12px;margin-top:6px}
  p{white-space:pre-wrap;font-size:13.5px}
  .body p{margin:.5em 0} .body .md-h{color:#1e3a5f;font-weight:700;margin:12px 0 3px}
  .body table.md-table{width:100%;border-collapse:collapse;margin:10px 0;font-size:12.5px;page-break-inside:avoid}
  .body table.md-table th{background:#eef2f7;font-weight:600;text-align:left}
  .body table.md-table th,.body table.md-table td{border:1px solid #c7d0dc;padding:5px 9px}
  .body table.md-table th.num,.body table.md-table td.num{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
  @media print {.noprint{display:none}}
</style></head><body>
<div class="banner"><b>MERCHANT BANKER REVIEW PACK — AI-ASSISTED DRAFT.</b> Prepared by SIIM for review by SEBI-registered
intermediaries. Not a filing; not legal, investment, accounting or regulatory advice. Facts carry source references to
the issuer's uploaded documents; placeholders mark data awaiting promoter confirmation.</div>
<h1>Merchant Banker Review Pack<br><span style="font-size:17px">${esc(name)}</span></h1>
<p class="meta">Generated ${new Date().toLocaleString("en-IN")} · ${draft.length} draft sections · ${gaps.length} unresolved gaps ·
Readiness ${analysis?.scores.overall ?? "—"}/100 · <button class="noprint" onclick="print()">Print / Save as PDF</button></p>

<h2>Unresolved Gaps (${gaps.length})</h2>
<table><tr><th>Severity</th><th>Gap</th><th>Affected Section</th><th>Owner</th><th>Suggested Fix</th></tr>
${gaps.map((g) => `<tr><td>${esc(g.severity)}</td><td>${esc(g.title)}</td><td>${esc(g.affectedSection)}</td><td>${esc(g.owner)}</td><td>${esc(g.suggestedFix)}</td></tr>`).join("")}
</table>

${draft.map((s) => `
<h2>${esc(s.sectionName)}</h2>
<p class="meta">Status: <b>${esc(s.status)}</b> · Confidence ${s.confidence}% · AI-generated, needs professional review</p>
<div class="body">${mdToHtml(s.generatedText)}</div>
${s.sources.length ? `<div class="src"><b>Source evidence:</b> ${s.sources.map((x) => `${esc(x.document)} (${esc(x.detail)})`).join(" · ")}</div>` : ""}
${s.missingData.length ? `<div class="warn"><b>Missing data:</b> ${s.missingData.map(esc).join(" · ")}</div>` : ""}
${s.comments.map((c) => `<div class="cmt"><b>${esc(c.author)}</b> (${esc(c.role.replaceAll("_", " ").toLowerCase())}, ${new Date(c.createdAt).toLocaleString("en-IN")}): ${esc(c.comment)}</div>`).join("")}
`).join("")}
<hr><p class="meta">© SIIM — AI-assisted preparation. Final responsibility rests with the issuer and its authorised intermediaries.</p>
</body></html>`;
  return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
