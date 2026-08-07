/**
 * Render-time humanizer for internal fact keys/labels (e.g. "patCr" → "PAT (₹ Cr)",
 * "netWorthCr" → "Net Worth (₹ Cr)"). Used wherever a stored factKey/factLabel is
 * shown to a user, so the UI never leaks camelCase internal identifiers. Facts
 * that already carry a human label (containing spaces, no camelCase) pass through
 * unchanged.
 */
export function prettyLabel(label: string): string {
  if (!label) return label;
  if (/\s/.test(label) && !/[a-z][A-Z]/.test(label)) return label;
  let t = label.replace(/Cr$/, "").replace(/[_-]+/g, " ")
    .replace(/([a-z\d])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2").trim();
  t = t.charAt(0).toUpperCase() + t.slice(1);
  t = t.replace(/\b(cin|gst|gstin|pan|din|ipo|rpt|ebitda|pat|cfo|fy|moa|aoa|kyc)\b/gi, (m) => m.toUpperCase());
  return /Cr$/.test(label) ? `${t} (₹ Cr)` : t;
}
