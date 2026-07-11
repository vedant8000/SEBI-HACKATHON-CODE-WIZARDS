// Generates realistic sample PDFs into public/demo-assets so anyone can test
// the real upload → extraction → analysis pipeline without their own files.
// Run: node scripts/make-sample-docs.js
const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

const outDir = path.join(__dirname, "..", "public", "demo-assets");
fs.mkdirSync(outDir, { recursive: true });

function write(name, title, lines) {
  const doc = new PDFDocument({ margin: 50 });
  doc.pipe(fs.createWriteStream(path.join(outDir, name)));
  doc.fontSize(14).text(title, { underline: true });
  doc.moveDown();
  doc.fontSize(10);
  for (const line of lines) {
    doc.text(line);
    doc.moveDown(0.4);
  }
  doc.moveDown();
  doc.fontSize(8).fillColor("#666").text("Sample document generated for SIIM demo/testing. Not a real company record.");
  doc.end();
}

write("Sample Audited Financials FY2026.pdf", "MEERA TEXTILES PRIVATE LIMITED — Audited Financial Statements FY2026", [
  "CIN: U17110GJ2016PTC093456",
  "Statement of Profit and Loss for the year ended 31 March 2026",
  "Revenue from operations: Rs. 41.8 crore",
  "EBITDA: Rs. 5.0 crore",
  "Profit after tax: Rs. 2.3 crore",
  "",
  "Balance Sheet as at 31 March 2026",
  "Net worth: Rs. 11.3 crore",
  "Total borrowings: Rs. 8.8 crore",
  "Trade receivables: Rs. 9.6 crore",
  "",
  "Cash flow from operations: Rs. 0.9 crore",
  "Auditor: M/s Shah & Co., Chartered Accountants (unqualified opinion)",
]);

write("Sample GST Summary FY2026.pdf", "GSTR-9 Annual Return Summary — FY2026", [
  "GSTIN: 24AAFCM1234H1Z7",
  "Legal name: Meera Textiles Private Limited",
  "Aggregate taxable turnover: Rs. 40.6 crore",
  "Tax paid (net): Rs. 2.1 crore",
  "Note: Demand notice of Rs. 22 lakh for FY2025 pending; reply filed with jurisdictional officer.",
]);

write("Sample Litigation Declaration.pdf", "Declaration on Litigation — Meera Textiles Private Limited", [
  "We, the undersigned, declare that there is no pending litigation, arbitration or",
  "regulatory proceeding against the Company, its promoter or directors, NIL.",
  "",
  "Signed: Suresh Meera, Promoter & Managing Director",
]);

write("Sample RPT Register FY2026.pdf", "Related Party Transaction Register — FY2026", [
  "Related party transactions during the year (as per books):",
  "Purchases from Meera Yarn Traders LLP: Rs. 2.1 crore (related party — promoter family interest)",
  "Unsecured loan from promoter outstanding: Rs. 0.8 crore",
  "Rent paid to promoter-owned premises: Rs. 0.12 crore",
]);

write("Sample Machinery Quotation.pdf", "Quotation — Rapier Weaving Machines", [
  "To: Meera Textiles Private Limited",
  "From: TexMach Engineering Private Limited",
  "Quotation for 6 rapier weaving machines with installation.",
  "Basic price total: Rs. 6.5 crore plus applicable GST.",
  "Validity: 90 days. Delivery: 16 weeks from purchase order.",
  "(GSTIN of vendor: 24AAACT5678K1Z3)",
]);

console.log("Sample PDFs written to public/demo-assets/");
