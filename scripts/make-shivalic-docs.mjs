/**
 * Generates the full supporting-document set for the Shivalic test company
 * (test fixtures — figures consistent with public IPO disclosures where known,
 * fictional identifiers clearly marked). Writes PDFs to a temp dir and prints
 * the paths, so they can be uploaded through the real pipeline.
 *
 * Usage: node scripts/make-shivalic-docs.mjs [outDir]
 */
import fs from "fs";
import path from "path";
import os from "os";

const outDir = process.argv[2] ?? path.join(os.tmpdir(), "shivalic-docs");
const { default: PDFDocument } = await import("pdfkit");
fs.mkdirSync(outDir, { recursive: true });

const write = (name, title, lines) =>
  new Promise((resolve) => {
    const doc = new PDFDocument({ margin: 50 });
    const stream = fs.createWriteStream(path.join(outDir, name));
    doc.pipe(stream);
    doc.fontSize(14).text(title, { underline: true });
    doc.moveDown();
    doc.fontSize(10);
    for (const line of lines) { doc.text(line); doc.moveDown(0.4); }
    doc.moveDown();
    doc.fontSize(8).fillColor("#666")
      .text("TEST FIXTURE for IPO Saathi demo. Identifiers other than public disclosures are fictional. Not an original company record.");
    doc.end();
    stream.on("finish", resolve);
  });

await write("Shivalic Certificate of Incorporation.pdf",
  "CERTIFICATE OF INCORPORATION", [
    "Corporate Identity Number: U31200HR2004PLC035502",
    "Shivalic Power Control Private Limited was incorporated on 15 June 2004",
    "under the Companies Act, 1956, with the Registrar of Companies, NCT of Delhi and Haryana.",
    "Registered office: Plot No. 22, Sector 24, Faridabad, Haryana.",
    "Converted to a public limited company as Shivalic Power Control Limited in 2023.",
  ]);

await write("Shivalic MOA-AOA.pdf",
  "MEMORANDUM AND ARTICLES OF ASSOCIATION — SHIVALIC POWER CONTROL LIMITED", [
    "Main object: manufacture and sale of LT & HT electric control panels, PCC/MCC panels,",
    "smart panels, VFD panels, bus ducts and power distribution boards.",
    "Authorised share capital: Rs. 25 crore divided into 2,50,00,000 equity shares of Rs. 10 each.",
    "Articles amended in 2023 to permit a public issue of equity shares.",
  ]);

await write("Shivalic Promoter KYC.pdf",
  "PROMOTER & DIRECTOR KYC SUMMARY", [
    "Promoter 1: Amit Kanwar Jindal, Managing Director. DIN: 01234567. PAN: AAJPJ1234K.",
    "Experience: 20 years in electric panel manufacturing. No debarment or disqualification.",
    "Promoter 2: Sapna Jindal, Whole-time Director. DIN: 01234568. PAN: AAJPJ5678L.",
    "Address proof and identity verified. No pending regulatory prohibition on either promoter.",
  ]);

await write("Shivalic Board Resolution IPO.pdf",
  "CERTIFIED TRUE COPY OF BOARD RESOLUTION", [
    "At the meeting of the Board of Directors of Shivalic Power Control Limited held on",
    "15-Jan-2024 at the registered office, the Board resolved:",
    "RESOLVED THAT pursuant to Section 62(1)(c) of the Companies Act, 2013, consent be and is",
    "hereby accorded for an initial public offering of equity shares aggregating up to Rs. 64.32 crore",
    "as a fresh issue, and listing on the SME platform of the National Stock Exchange (NSE Emerge).",
    "FURTHER RESOLVED THAT the promoters be authorised to appoint intermediaries including the",
    "merchant banker, registrar and market maker.",
    "Shareholders' special resolution passed at the EGM held on 10-Feb-2024.",
  ]);

await write("Shivalic Supply Agreements Summary.pdf",
  "MATERIAL CONTRACTS — SUPPLY AGREEMENT SUMMARY", [
    "Long-term supply agreement with three principal industrial customers for LT/HT panels:",
    "1. Supply agreement with a leading EPC contractor — panels for infrastructure projects (renewable annually).",
    "2. Rate contract with a public-sector power distribution utility — PCC/MCC panels.",
    "3. Framework agreement with an industrial OEM — VFD panels and bus ducts.",
    "Factory premises: Plot No. 22, Sector 24, Faridabad — lease deed valid until 2032.",
    "Top 3 customers contributed approximately 45% of revenue in FY2024.",
  ]);

await write("Shivalic Factory License and Approvals.pdf",
  "GOVERNMENT LICENSES AND APPROVALS REGISTER", [
    "GST registration: GSTIN 06AAJCS4970M1ZI (Haryana), active.",
    "Factory license under the Factories Act, 1948 — license no. FBD/2004/1122, valid until 31-Dec-2027.",
    "Consent to Operate (air & water) from Haryana State Pollution Control Board, valid until 30-Sep-2026.",
    "Udyam registration: UDYAM-HR-05-0012345 (medium enterprise).",
    "BIS certification for LT switchgear assemblies. ISO 9001:2015 certified.",
  ]);

await write("Shivalic Machinery Quotation.pdf",
  "QUOTATION — CNC BUSBAR PROCESSING & PANEL FABRICATION LINE", [
    "To: Shivalic Power Control Limited, Faridabad",
    "From: PowerFab Machinery India Private Limited (GSTIN: 06AABCP9876Q1Z2)",
    "Quotation for CNC busbar processing machines, punching line and powder-coating plant.",
    "Basic price total: Rs. 24.6 crore plus applicable GST.",
    "Validity: 120 days. Delivery: 20 weeks from purchase order. Installation included.",
  ]);

await write("Shivalic Working Capital Assessment.pdf",
  "WORKING CAPITAL REQUIREMENT ASSESSMENT — FY2025-26", [
    "Basis: holding-period method consistent with historical operating cycle.",
    "Receivable days: 124 (FY2024 actual); inventory days: 48; creditor days: 62.",
    "Incremental working capital requirement: Rs. 30 crore for projected FY2026 revenue of Rs. 145 crore.",
    "Month-wise deployment schedule enclosed; to be funded from IPO proceeds.",
    "Certified by management; subject to merchant banker review.",
  ]);

await write("Shivalic Litigation Declaration.pdf",
  "DECLARATION ON LITIGATION AND PROCEEDINGS", [
    "We declare that other than the matter below, there is no pending litigation, arbitration or",
    "regulatory proceeding against the Company, its promoters or directors:",
    "1. GST demand notice of Rs. 15 lakh for FY2023 received from the jurisdictional officer;",
    "   reply filed on 20-Nov-2023; personal hearing awaited. The demand is disputed.",
    "Signed: Amit Kanwar Jindal, Managing Director.",
  ]);

await write("Shivalic Independent Director Consents.pdf",
  "CORPORATE GOVERNANCE — INDEPENDENT DIRECTOR CONSENTS & COMMITTEES", [
    "Consent letters under Section 152 received from two independent directors appointed on 05-Mar-2024:",
    "1. Independent Director A — DIN: 02345678 (fictional test identifier).",
    "2. Independent Director B — DIN: 02345679 (fictional test identifier).",
    "Audit Committee constituted on 12-Mar-2024 (2 independent directors + 1 executive director).",
    "Nomination & Remuneration Committee and Stakeholders' Relationship Committee constituted on 12-Mar-2024.",
  ]);

await write("Shivalic Industry Overview Note.pdf",
  "INDUSTRY OVERVIEW — ELECTRIC CONTROL PANEL MARKET (INDIA)", [
    "The Indian electric control panel industry serves power distribution, infrastructure, and",
    "industrial automation, driven by capex in renewables, data centres and grid modernisation.",
    "LT/HT panel demand is correlated with industrial capex and electrification programmes.",
    "Key demand drivers: solar EPC, railway electrification, commercial real estate and PLI-led manufacturing.",
    "The industry is fragmented, with organised players differentiating on type-tested designs and delivery.",
    "(Source basis: public industry commentary; replace with a licensed industry report before filing.)",
  ]);

console.log("Wrote 10 fixture PDFs to:", outDir);
