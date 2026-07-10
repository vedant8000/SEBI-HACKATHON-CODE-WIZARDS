/**
 * Minimal, dependency-free renderer for the markdown subset the AI emits in
 * draft sections: **bold**, markdown tables, headings-in-bold lines and
 * paragraphs. Escapes HTML first, so it is safe to inject. Shared by the
 * draft viewer and the HTML/PDF exports.
 */

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const inline = (s: string) =>
  s.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/(?<!\*)\*(?!\s)([^*]+?)\*(?!\*)/g, "<em>$1</em>");

function isTableLine(line: string) {
  const t = line.trim();
  return t.startsWith("|") && t.endsWith("|") && t.length > 2;
}
const isSeparatorRow = (line: string) => /^\s*\|[\s:|-]+\|\s*$/.test(line);

function splitRow(line: string): string[] {
  const t = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  return t.split("|").map((c) => c.trim());
}

/** Numeric-looking cells ("102", "₹ 64.32", "45%", "20.1x", "(9)") get right-aligned. */
const isNumericCell = (s: string) =>
  /^\(?[₹$]?\s*-?[\d,]+(\.\d+)?\)?\s*(crore|cr\.?|lakh|%|x)?$/i.test(s.trim()) && /\d/.test(s);

export function mdToHtml(raw: string): string {
  const text = escapeHtml(raw ?? "");
  const lines = text.split(/\r?\n/);
  const out: string[] = [];
  let i = 0;
  let para: string[] = [];

  const flushPara = () => {
    if (!para.length) return;
    out.push(`<p>${inline(para.join("<br>"))}</p>`);
    para = [];
  };

  while (i < lines.length) {
    const line = lines[i];

    // table block
    if (isTableLine(line) && i + 1 < lines.length && isSeparatorRow(lines[i + 1])) {
      flushPara();
      const header = splitRow(line);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && isTableLine(lines[i])) {
        if (!isSeparatorRow(lines[i])) rows.push(splitRow(lines[i]));
        i++;
      }
      // a column is numeric if most of its body cells are numeric → right-align whole column
      const numericCol = header.map((_, ci) => {
        const cells = rows.map((r) => r[ci] ?? "").filter((c) => c !== "" && c !== "—" && c !== "-");
        return cells.length > 0 && cells.filter(isNumericCell).length >= Math.ceil(cells.length * 0.6);
      });
      out.push(
        `<table class="md-table"><thead><tr>${header.map((h, ci) => `<th${numericCol[ci] ? ' class="num"' : ""}>${inline(h)}</th>`).join("")}</tr></thead>` +
        `<tbody>${rows.map((r) => `<tr>${r.map((c, ci) => `<td${numericCol[ci] ? ' class="num"' : ""}>${inline(c)}</td>`).join("")}</tr>`).join("")}</tbody></table>`
      );
      continue;
    }

    const trimmed = line.trim();
    if (trimmed === "") {
      flushPara();
    } else if (/^\*\*[^*]+\*\*:?$/.test(trimmed)) {
      // a lone bold line acts as a sub-heading
      flushPara();
      out.push(`<h4 class="md-h">${inline(trimmed.replace(/:$/, ""))}</h4>`);
    } else if (/^[-•*]\s+/.test(trimmed)) {
      // bullet list block
      flushPara();
      const items: string[] = [];
      while (i < lines.length && /^[-•*]\s+/.test(lines[i].trim())) {
        items.push(`<li>${inline(lines[i].trim().replace(/^[-•*]\s+/, ""))}</li>`);
        i++;
      }
      out.push(`<ul class="md-ul">${items.join("")}</ul>`);
      continue;
    } else {
      para.push(trimmed);
    }
    i++;
  }
  flushPara();
  return out.join("\n");
}
