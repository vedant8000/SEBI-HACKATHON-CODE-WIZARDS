import type { AuthenticitySignal, DocumentAuthenticity } from "../types";
import { uid } from "../store";

/**
 * Document-authenticity forensics — layer one.
 *
 * A deterministic, dependency-free structural check on a PDF's raw bytes. It
 * looks for the fingerprints that EDITING a PDF leaves behind: incremental
 * saves, a modification date after the creation date, known PDF-editor tools in
 * the metadata, a missing text layer, and the presence/absence of a digital
 * signature. It is NOT proof of forgery and never claims a document is fake — it
 * surfaces "signs warranting review" so a human verifies the original before its
 * numbers are relied upon. A deep-learning image-forensics layer (splice /
 * copy-move detection on scanned pages) can sit on top of this later.
 */

// Online / desktop PDF editors: audited financials and bank statements should
// arrive straight from the source, not routed through one of these.
const EDITOR_TOOLS =
  /ilove|smallpdf|sejda|pdfescape|pdf24|pdffiller|soda\s?pdf|nitro|foxit\s?phantom|pdf\s?candy|lightpdf|dochub|xodo|pdf-xchange|cam\s?scanner/i;

function pdfString(s: string, key: string): string | null {
  const m = s.match(new RegExp(`/${key}\\s*\\(([^)]{0,120})\\)`));
  return m ? m[1].replace(/\\(.)/g, "$1").trim() : null;
}

function pdfDate(s: string, key: string): string | null {
  const m = s.match(new RegExp(`/${key}\\s*\\(D:(\\d{8})`));
  return m ? m[1] : null; // YYYYMMDD
}

const fmtDate = (d: string) => `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;

export function analyzeDocumentAuthenticity(
  fileName: string, buf: Buffer, text: string, pageCount: number
): DocumentAuthenticity {
  const now = new Date().toISOString();
  const isPdf = /\.pdf$/i.test(fileName) || buf.subarray(0, 5).toString("latin1") === "%PDF-";
  if (!isPdf) {
    return {
      applicable: false, score: 100, level: "na",
      summary: "Structural authenticity forensics apply to PDF files; this file type was not analysed.",
      signals: [], checkedAt: now,
    };
  }

  const s = buf.toString("latin1");
  const signals: AuthenticitySignal[] = [];
  const add = (label: string, level: AuthenticitySignal["level"], detail: string) =>
    signals.push({ id: uid("auth"), label, level, detail });

  // 1. Incremental updates: a clean single-save PDF has ONE %%EOF. More than one
  //    (or a /Prev cross-reference) means the file was re-saved after creation.
  const eofs = (s.match(/%%EOF/g) ?? []).length;
  const prevs = (s.match(/\/Prev\s+\d+/g) ?? []).length;
  if (eofs > 1 || prevs > 0)
    add("Edited after creation", "flag",
      `The PDF carries ${Math.max(eofs, prevs + 1)} save generations (incremental updates), so it was modified after it was first created. Obtain the original, single-save file.`);

  // 2. Modification date later than creation date.
  const created = pdfDate(s, "CreationDate");
  const modified = pdfDate(s, "ModDate");
  if (created && modified && modified > created)
    add("Modified after creation date", "review",
      `Created ${fmtDate(created)}, last modified ${fmtDate(modified)}. Legitimate in some workflows, but worth confirming for a financial document.`);

  // 3. Producer / creator tool.
  const tool = [pdfString(s, "Producer"), pdfString(s, "Creator")].filter(Boolean).join(" / ");
  if (tool && EDITOR_TOOLS.test(tool))
    add("Processed by a PDF-editing tool", "flag",
      `Metadata shows "${tool}", a PDF editor / scanner app. Source financial documents should not pass through an editor before upload.`);
  else if (tool)
    add("Origin tool", "info", `Produced by "${tool}".`);

  // 4. Text layer present? (scans / flattened images hide edits and can't be verified)
  const perPage = pageCount ? text.trim().length / pageCount : text.trim().length;
  if (pageCount > 0 && perPage < 40)
    add("No machine-readable text layer", "review",
      "The pages carry little or no extractable text (a scan or flattened image), so figures cannot be verified against a text source and edits are harder to detect.");

  // 5. Digital signature (a positive signal, not penalised when absent).
  if (/\/(Sig|ByteRange)\b/.test(s) || /Adobe\.PPKLite/.test(s))
    add("Carries a digital signature", "info", "The document is digitally signed, which strengthens its authenticity.");

  const deduction = signals.reduce((n, x) => n + (x.level === "flag" ? 35 : x.level === "review" ? 15 : 0), 0);
  const score = Math.max(0, Math.min(100, 100 - deduction));
  const level: DocumentAuthenticity["level"] = score >= 85 ? "clean" : score >= 60 ? "review" : "flag";
  const flags = signals.filter((x) => x.level === "flag").length;
  const reviews = signals.filter((x) => x.level === "review").length;
  const summary =
    level === "clean" ? "No structural signs of tampering — the PDF looks like a single, unedited original."
      : level === "review" ? `${reviews + flags} item(s) to verify before relying on this document's figures.`
        : `${flags} structural sign(s) of post-creation editing — verify the original source document.`;

  return { applicable: true, score, level, summary, signals, checkedAt: now };
}
