import { NextResponse } from "next/server";
import { getContext } from "@/lib/server/context";
import { SME_PROSPECTUS_BLUEPRINT } from "@/lib/ipo-blueprint/sme-prospectus-blueprint";
import { generateSectionDeterministic } from "@/lib/engine/draft-template";
import { mdToHtml } from "@/lib/utils/markdown";

const esc = (s: string) =>
  (s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const PH = "[●]"; // the "[●]" placeholder used by real offer documents

/**
 * Draft Offer Document as printable HTML (print → Save as PDF), formatted to
 * mimic a real DRHP/Draft Prospectus:
 *  - composite cover page (issuer block, offer table, risk/responsibility/
 *    listing legends, intermediaries) with [●] placeholders like real filings,
 *  - table-of-contents with dotted leaders,
 *  - centered ALL-CAPS section headings, justified serif body, bordered
 *    tables that split naturally across pages (no forced gaps),
 *  - page breaks only between major Sections.
 *
 * Sections drafted in the app show their stored content; anything missing is
 * composed on the fly by the deterministic rule-based generator, so the
 * export is always complete. The blueprint's Front Matter items are absorbed
 * into the cover page, exactly as in a real offer document.
 */
export async function GET() {
  const { company, draft, docs, facts, objects, analysis, coverage } = await getContext();
  const name = company?.name ?? "Company";
  const byName = new Map(draft.map((s) => [s.sectionName, s]));
  const rowById = new Map(coverage.map((r) => [r.sectionId, r]));

  /** Stored section text, or deterministic composition when missing/failed. */
  const resolve = (bp: (typeof SME_PROSPECTUS_BLUEPRINT)[number]) => {
    const s = byName.get(bp.sectionName);
    if (s && s.status !== "Not Started" && s.generatedText.trim() && !/^\[(Generation failed|Cannot generate|Not generated)/.test(s.generatedText))
      return { text: s.generatedText, meta: s, composed: false };
    if (!company) return null;
    const row = rowById.get(bp.sectionId);
    if (!row) return null;
    const text = generateSectionDeterministic(bp, { company, docs, facts, objects, analysis, row });
    return text ? { text, meta: s ?? null, composed: true } : null;
  };

  // Front Matter is folded into the composite cover page (like a real DRHP).
  const bodySections = SME_PROSPECTUS_BLUEPRINT.filter((bp) => !bp.sectionId.startsWith("fm-"));

  // ── cover page data ────────────────────────────────────────────────────────
  const c = company;
  const cin = c?.cin || facts.find((f) => f.factKey === "cin" && f.status !== "REJECTED")?.normalizedValue || PH;
  const regOffice = [c?.city, c?.state].filter(Boolean).join(", ") || PH;
  const crx = (n: number | null | undefined) => (n == null ? `₹${PH}` : `₹${n} crore`);
  const hasOfs = (c?.ofsCr ?? 0) > 0;
  const issueType = hasOfs ? "Fresh Issue and Offer for Sale" : "Fresh Issue";
  const dateStr = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });

  const cover = `
<section class="cover">
  <div class="ai-note">AI-ASSISTED DRAFT PREPARED BY SIIM FOR REVIEW BY SEBI-REGISTERED MERCHANT BANKERS AND LEGAL COUNSEL ·
  NOT AN OFFER DOCUMENT · NOT FILED WITH SEBI OR ANY STOCK EXCHANGE · MUST NOT BE USED TO INVITE SUBSCRIPTION</div>
  <p class="cv-legend">DRAFT PROSPECTUS<br>Dated: ${esc(dateStr)}<br>Please read Section 26 of the Companies Act, 2013<br>
  (This Draft will be updated and completed by the issuer and its intermediaries prior to filing)<br>Fixed Price / Book Built Issue (to be finalised with the Lead Manager)</p>
  <h1 class="cv-name">${esc(name.toUpperCase())}</h1>
  <p class="cv-cin">CORPORATE IDENTITY NUMBER: ${esc(cin)}</p>
  <table class="cv-table">
    <thead><tr><th>REGISTERED OFFICE</th><th>CONTACT PERSON</th><th>EMAIL AND TELEPHONE</th><th>WEBSITE</th></tr></thead>
    <tbody><tr>
      <td>${esc(regOffice)}</td>
      <td>${PH} (Company Secretary and Compliance Officer)</td>
      <td>Email: ${PH}<br>Tel: ${PH}</td>
      <td>${PH}</td>
    </tr></tbody>
  </table>
  <p class="cv-promoter">OUR PROMOTER: ${esc((c?.promoterName || PH).toUpperCase())}</p>
  <p class="cv-head">DETAILS OF THE ISSUE TO THE PUBLIC</p>
  <table class="cv-table">
    <thead><tr><th>TYPE</th><th>FRESH ISSUE SIZE</th><th>OFFER FOR SALE SIZE</th><th>TOTAL ISSUE SIZE</th><th>ELIGIBILITY</th></tr></thead>
    <tbody><tr>
      <td>${esc(issueType)}</td>
      <td>Up to ${crx(c?.freshIssueCr)}</td>
      <td>${hasOfs ? `Up to ${crx(c?.ofsCr)}` : "Not applicable"}</td>
      <td>Up to ${crx(c?.issueSizeCr)}</td>
      <td>The Issue is being made pursuant to Chapter IX of the SEBI (Issue of Capital and Disclosure Requirements) Regulations, 2018, as amended, for issues on the SME platform</td>
    </tr></tbody>
  </table>
  ${c?.yearOfIncorporation || c?.industry ? `<p class="cv-history">${esc(name)}${c?.yearOfIncorporation ? ` was incorporated in ${c.yearOfIncorporation} under the Companies Act` : ""}${cin !== PH ? ` bearing Corporate Identity Number ${esc(cin)}` : ""}${c?.industry ? `, and is engaged in ${esc(c.industry)}` : ""}. For details of the incorporation and changes, see <i>"History and Certain Corporate Matters"</i>.</p>` : ""}
  <p class="cv-head">GENERAL RISKS</p>
  <p class="cv-block">Investment in equity and equity-related securities involves a degree of risk and investors should not invest any funds in this Issue unless they can afford to take the risk of losing their investment. Investors are advised to read the risk factors carefully before taking an investment decision in this Issue. For taking an investment decision, investors must rely on their own examination of the Issuer and the Issue, including the risks involved. The Equity Shares have not been recommended or approved by the Securities and Exchange Board of India, nor does SEBI guarantee the accuracy or adequacy of the contents of this document. Specific attention of the investors is invited to <i>"Risk Factors"</i>.</p>
  <p class="cv-head">ISSUER'S ABSOLUTE RESPONSIBILITY</p>
  <p class="cv-block">The Issuer, having made all reasonable inquiries, accepts responsibility for and confirms that this document contains all information with regard to the Issuer and the Issue which is material in the context of the Issue, that the information contained in this document is true and correct in all material aspects and is not misleading in any material respect, that the opinions and intentions expressed herein are honestly held and that there are no other facts, the omission of which makes this document as a whole or any of such information or the expression of any such opinions or intentions misleading in any material respect.</p>
  <p class="cv-head">LISTING</p>
  <p class="cv-block">The Equity Shares offered through this document are proposed to be listed on the ${esc(c?.proposedListingExchange || "SME platform (NSE Emerge / BSE SME)")}. For the purposes of the Issue, the Designated Stock Exchange shall be ${PH}.</p>
  <table class="cv-table">
    <thead><tr><th>LEAD MANAGER TO THE ISSUE</th><th>REGISTRAR TO THE ISSUE</th><th>MARKET MAKER</th></tr></thead>
    <tbody><tr><td>${PH} (to be appointed)</td><td>${PH} (to be appointed)</td><td>${PH} (to be appointed)</td></tr></tbody>
  </table>
  <table class="cv-table">
    <thead><tr><th>ISSUE OPENS ON</th><th>ISSUE CLOSES ON</th></tr></thead>
    <tbody><tr><td>${PH}</td><td>${PH}</td></tr></tbody>
  </table>
</section>`;

  // ── table of contents (dotted leaders + page numbers, like a real DRHP) ──
  // Page numbers are filled in by the pagination script below; [●] is the
  // server-side fallback. Anchor ids: parts use the id of their first section.
  const toc = (() => {
    let lp = "";
    const lines: string[] = [];
    for (const bp of bodySections) {
      if (bp.parentSection !== lp) {
        lp = bp.parentSection;
        lines.push(`<div class="toc-line toc-part"><span>${esc(lp.toUpperCase())}</span><span class="dots"></span><span class="pg" data-for="p-${esc(bp.sectionId)}">${PH}</span></div>`);
      }
      lines.push(`<div class="toc-line"><span>${esc(bp.sectionName.toUpperCase())}</span><span class="dots"></span><span class="pg" data-for="s-${esc(bp.sectionId)}">${PH}</span></div>`);
    }
    return lines.join("\n");
  })();

  // ── body: SECTION headings centered caps, sections flow continuously ──────
  let lastParent = "";
  const body = bodySections.map((bp) => {
    const partHeader = bp.parentSection !== lastParent
      ? `<h2 class="part" id="p-${esc(bp.sectionId)}">${esc((lastParent = bp.parentSection).toUpperCase())}</h2>` : "";
    const secTitle = `<h3 class="sec-title" id="s-${esc(bp.sectionId)}">${esc(bp.sectionName.toUpperCase())}</h3>`;
    const r = resolve(bp);
    if (!r) {
      return `${partHeader}\n${secTitle}\n<p class="pending-note">[To be prepared: ${esc(bp.purpose)}${bp.requiredDocumentTypes.length ? ` Requires: ${bp.requiredDocumentTypes.map(esc).join(", ")}.` : ""}]</p>`;
    }
    const sources = !r.composed && r.meta?.sources.length
      ? `<p class="src">Source evidence: ${r.meta.sources.map((x) => `${esc(x.document)} (${esc(x.detail)})`).join("; ")}.</p>` : "";
    return `${partHeader}
${secTitle}
<div class="body">${mdToHtml(r.text)}</div>
${sources}`;
  }).join("\n");

  const html = `<!doctype html><html><head><meta charset="utf-8">
<title>Draft Offer Document — ${esc(name)}</title>
<style>
  @page {
    size: A4; margin: 17mm 15mm;
    @bottom-center { content: counter(page); font-family: "Times New Roman", Georgia, serif; font-size: 9pt; }
  }
  * { box-sizing: border-box; }
  /* body width = A4 content width (210mm − 2×15mm) on screen too, so the
     pagination script measures the same layout the printer will produce */
  body { font-family: "Times New Roman", Georgia, serif; font-size: 10.5pt; line-height: 1.42; color: #000; margin: 0; width: 180mm; orphans: 1; widows: 1; }
  @media screen { body { margin: 28px auto; background: #fff; } }

  /* ── cover page ── */
  .ai-note { border: 1.2pt solid #000; padding: 5pt 8pt; font-size: 7.5pt; text-align: center; letter-spacing: .2px; margin-bottom: 10pt; font-family: Arial, sans-serif; }
  .cv-legend { text-align: center; font-size: 9pt; margin: 4pt 0 10pt; }
  .cv-name { text-align: center; font-size: 17pt; font-weight: bold; letter-spacing: 1px; margin: 6pt 0 2pt; }
  .cv-cin { text-align: center; font-size: 9.5pt; font-weight: bold; margin: 0 0 8pt; }
  .cv-promoter { text-align: center; font-size: 9.5pt; font-weight: bold; margin: 8pt 0; }
  .cv-head { text-align: center; font-size: 10pt; font-weight: bold; margin: 10pt 0 3pt; letter-spacing: .4px; }
  .cv-block { font-size: 8.8pt; text-align: justify; margin: 0 0 6pt; }
  .cv-history { font-size: 8.2pt; text-align: justify; margin: 6pt 0; color: #111; }
  .cv-table { width: 100%; border-collapse: collapse; font-size: 8.6pt; margin: 4pt 0 8pt; }
  .cv-table th, .cv-table td { border: 0.6pt solid #000; padding: 3pt 5pt; text-align: left; vertical-align: top; }
  .cv-table th { background: #efefef; font-size: 8pt; }
  .cover { page-break-after: always; }

  /* ── table of contents ── */
  .toc-title { text-align: center; font-size: 12pt; font-weight: bold; margin: 0 0 10pt; letter-spacing: .6px; }
  .toc-line { display: flex; align-items: baseline; font-size: 9.5pt; padding: 1pt 0; }
  .toc-line.toc-part { font-weight: bold; margin-top: 6pt; }
  .toc-line .dots { flex: 1; border-bottom: 1pt dotted #333; margin: 0 4pt 2pt; }
  .toc-line .pg { min-width: 18pt; text-align: right; }
  .toc-wrap { page-break-after: always; }

  /* ── body ── */
  h2.part { text-align: center; font-size: 12.5pt; font-weight: bold; letter-spacing: .6px; margin: 0 0 8pt; page-break-before: always; page-break-after: avoid; }
  h3.sec-title { text-align: center; font-size: 11pt; font-weight: bold; letter-spacing: .4px; margin: 14pt 0 5pt; page-break-after: avoid; }
  .body { text-align: justify; }
  .body p { margin: 4pt 0; }
  .body .md-h { font-size: 10.5pt; font-weight: bold; margin: 8pt 0 3pt; text-align: left; }
  .body ul.md-ul { margin: 4pt 0 4pt 16pt; padding: 0; }
  .body ul.md-ul li { margin: 2pt 0; }
  .body table.md-table { width: 100%; border-collapse: collapse; font-size: 9.3pt; margin: 6pt 0; }
  .body table.md-table thead { display: table-header-group; }
  .body table.md-table th, .body table.md-table td { border: 0.6pt solid #000; padding: 3pt 6pt; text-align: left; vertical-align: top; }
  .body table.md-table th { background: #efefef; font-weight: bold; }
  .body table.md-table th.num, .body table.md-table td.num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
  .src { font-size: 8pt; font-style: italic; color: #333; margin: 2pt 0 0; text-align: left; }
  .pending-note { font-size: 9pt; font-style: italic; color: #444; }

  .print-btn { position: fixed; top: 14px; right: 14px; padding: 8px 18px; background: #1e3a5f; color: #fff; border: 0; border-radius: 6px; cursor: pointer; font-size: 13px; font-family: Arial, sans-serif; }
  .footer-note { font-size: 8pt; color: #333; text-align: center; border-top: 0.6pt solid #000; margin-top: 14pt; padding-top: 5pt; }
  @media print { .print-btn { display: none; } }
</style></head><body>
<button class="print-btn" onclick="print()">Print / Save as PDF</button>
${cover}
<div class="toc-wrap">
  <div class="toc-title">TABLE OF CONTENTS</div>
  ${toc}
</div>
${body}
<p class="footer-note">${esc(name)} — Draft Offer Document (AI-assisted preparation by SIIM, ${esc(dateStr)}). ${PH} denotes information to be finalised with the merchant banker prior to filing. This draft is for professional review only; final responsibility rests with the issuer and its authorised intermediaries.</p>
<script>
/* Fill the table of contents with page numbers by simulating A4 pagination.
   The on-screen layout is locked to the print content width (180mm), so
   measured block heights match what the printer produces; forced breaks
   (cover, TOC, each SECTION) reset the page cursor exactly as in print. */
window.addEventListener("load", function () {
  var probe = document.createElement("div");
  probe.style.cssText = "position:absolute;visibility:hidden;height:100mm;width:10px";
  document.body.appendChild(probe);
  var pxPerMm = probe.offsetHeight / 100;
  document.body.removeChild(probe);
  var PAGE = (297 - 17 - 17) * pxPerMm; // A4 content height per page

  var blocks = Array.prototype.filter.call(document.body.children, function (el) {
    return el.tagName !== "SCRIPT" && el.tagName !== "BUTTON";
  });
  // flowed height of each block = distance to the next block's top (captures
  // collapsed margins exactly); last block uses its own height
  var tops = blocks.map(function (el) { return el.offsetTop; });
  var page = 1, y = 0, pages = {};
  for (var i = 0; i < blocks.length; i++) {
    var el = blocks[i];
    var h = i < blocks.length - 1 ? tops[i + 1] - tops[i] : el.offsetHeight;
    var breakBefore = el.classList.contains("part");
    var breakAfter = el.classList.contains("cover") || el.classList.contains("toc-wrap");
    if (breakBefore && y > 0) { page++; y = 0; }
    var isHeading = el.matches("h2.part,h3.sec-title");
    if (isHeading) {
      // page-break-after:avoid — the heading needs room for itself + a couple
      // of lines of the following block, else it moves to the next page
      if (y + el.offsetHeight + 30 > PAGE) { page++; y = 0; }
      pages[el.id] = page;
      y += h;
      if (y >= PAGE) { page += Math.floor(y / PAGE); y = y % PAGE; }
    } else if (y + h <= PAGE) {
      y += h;
    } else {
      var rest = h - (PAGE - y);
      page += 1 + Math.floor(rest / PAGE);
      y = rest % PAGE;
    }
    if (breakAfter && y > 0) { page++; y = 0; }
  }
  document.querySelectorAll(".toc-line .pg[data-for]").forEach(function (s) {
    var p = pages[s.getAttribute("data-for")];
    if (p) s.textContent = p;
  });
});
</script>
</body></html>`;
  return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
