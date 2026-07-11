import { NextResponse } from "next/server";
import { getContext } from "@/lib/server/context";

const esc = (s: string) =>
  (s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** IPO Readiness Report as printable HTML. */
export async function GET() {
  const { company, analysis } = getContext();
  const s = analysis?.scores;
  const badge = (st: string) =>
    st === "pass" ? "#0ca30c" : st === "warning" ? "#b45309" : st === "fail" ? "#d03b3b" : "#6b7280";
  const html = `<!doctype html><html><head><meta charset="utf-8">
<title>IPO Readiness Report — ${esc(company?.name ?? "")}</title>
<style>
  body{font-family:system-ui,sans-serif;max-width:900px;margin:40px auto;padding:0 24px;color:#111;line-height:1.5}
  h1{color:#1e3a5f} h2{color:#1e3a5f;margin-top:28px}
  table{border-collapse:collapse;width:100%;font-size:13px}
  th,td{border:1px solid #d1d5db;padding:7px 10px;text-align:left;vertical-align:top}
  th{background:#f1f5f9}
  .score{font-size:44px;font-weight:700;color:#1e3a5f}
  .banner{background:#fef3c7;border:1px solid #f59e0b;padding:10px 14px;border-radius:6px;font-size:13px}
  @media print {.noprint{display:none}}
</style></head><body>
<div class="banner"><b>AI-assisted assessment.</b> This report supports preparation only — it is not a regulatory opinion. All items require merchant banker / legal review.</div>
<h1>IPO Readiness Report — ${esc(company?.name ?? "No company selected")}</h1>
<p>Generated ${new Date().toLocaleString("en-IN")} · <button class="noprint" onclick="print()">Print / Save as PDF</button></p>
<p><span class="score">${s?.overall ?? "—"}/100</span><br><b>${esc(s?.statusLine ?? "Run the analysis first.")}</b></p>
<h2>Category Scores</h2>
<table><tr><th>Category</th><th>Score</th></tr>
${Object.entries(s?.byCategory ?? {}).map(([k, v]) => `<tr><td>${esc(k)}</td><td>${v}/100</td></tr>`).join("")}
<tr><td>RPT Risk (lower is better)</td><td>${s?.rptScore ?? "—"}/100</td></tr>
<tr><td>Financial Consistency</td><td>${s?.finConsistencyScore ?? "—"}/100</td></tr></table>
<h2>Rule-by-Rule Results</h2>
<table><tr><th>Category</th><th>Rule</th><th>Status</th><th>Explanation</th><th>Suggested Fix</th></tr>
${(analysis?.checks ?? []).map((c) => `<tr><td>${esc(c.category)}</td><td>${esc(c.ruleName)}</td>
<td style="color:${badge(c.status)};font-weight:600">${esc(c.status.toUpperCase())}</td>
<td>${esc(c.explanation)}</td><td>${esc(c.suggestedFix)}</td></tr>`).join("")}</table>
<h2>Open Gaps (${(analysis?.gaps ?? []).length})</h2>
<table><tr><th>Severity</th><th>Gap</th><th>Section</th><th>Owner</th><th>Suggested Fix</th></tr>
${(analysis?.gaps ?? []).map((g) => `<tr><td>${esc(g.severity)}</td><td>${esc(g.title)}</td><td>${esc(g.affectedSection)}</td><td>${esc(g.owner)}</td><td>${esc(g.suggestedFix)}</td></tr>`).join("")}</table>
<p style="color:#666;font-size:12px;margin-top:30px">© SIIM. Estimates and checks are illustrative; this platform does not replace SEBI-registered intermediaries.</p>
</body></html>`;
  return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
