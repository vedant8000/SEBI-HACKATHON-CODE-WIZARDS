/**
 * Generates full supporting-document sets for additional fictional SME
 * companies, so the upload pipeline and the company-profile parser can be
 * tested with data other than the built-in Shivalic fixtures.
 *
 * All figures and identifiers are fictional test data. Each company gets a
 * complete set (COI, MOA, KYC, board resolution, three yearly audited
 * financials, GST summary, RPT register, litigation declaration, governance
 * consents, supply agreements, machinery quotation, working-capital note,
 * factory licenses) so every field the parser fills has a source.
 *
 * Usage:
 *   node scripts/make-sample-companies.mjs [outDir]
 * Default outDir: ../test-documents (a subfolder is created per company).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const baseOut = process.argv[2] ?? path.join(__dirname, "..", "..", "test-documents");
const { default: PDFDocument } = await import("pdfkit");

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const writePdf = (dir, name, title, lines) =>
  new Promise((resolve) => {
    const doc = new PDFDocument({ margin: 50 });
    const stream = fs.createWriteStream(path.join(dir, name));
    doc.pipe(stream);
    doc.fontSize(14).text(title, { underline: true });
    doc.moveDown();
    doc.fontSize(10);
    for (const line of lines) { doc.text(line); doc.moveDown(0.4); }
    doc.moveDown();
    doc.fontSize(8).fillColor("#666")
      .text("TEST FIXTURE for SIIM demo. All identifiers and figures are fictional. Not an original company record.");
    doc.end();
    stream.on("finish", resolve);
  });

/** One financial-year audited statement per FY (parser keys financials by FY). */
const financialsDoc = (co, fy, f) => [
  `${co.name.toUpperCase()} — Audited Financial Statements ${fy}`,
  `CIN: ${co.cin}`,
  `Registered office: ${co.city}, ${co.state}`,
  `Statement of Profit and Loss for the year ended 31 March ${fy.replace("FY", "")}`,
  `Revenue from operations: Rs. ${f.revenue} crore`,
  `EBITDA: Rs. ${f.ebitda} crore`,
  `Profit after tax: Rs. ${f.pat} crore`,
  `Balance Sheet as at 31 March ${fy.replace("FY", "")}`,
  `Net worth: Rs. ${f.netWorth} crore`,
  `Total borrowings: Rs. ${f.borrowings} crore`,
  `Trade receivables: Rs. ${f.receivables} crore`,
  `Cash flow from operations: Rs. ${f.cfo} crore`,
];

async function generateCompany(co) {
  const dir = path.join(baseOut, slug(co.name));
  fs.mkdirSync(dir, { recursive: true });

  await writePdf(dir, `${co.short} Certificate of Incorporation.pdf`,
    "CERTIFICATE OF INCORPORATION", [
      `Corporate Identity Number: ${co.cin}`,
      `${co.name} was incorporated on ${co.incorpDate}`,
      `under the Companies Act, with the Registrar of Companies, ${co.roc}.`,
      `Registered office: ${co.regOffice}`,
      `Converted to a public limited company in ${co.publicYear}.`,
    ]);

  await writePdf(dir, `${co.short} MOA-AOA.pdf`,
    `MEMORANDUM AND ARTICLES OF ASSOCIATION — ${co.name.toUpperCase()}`, [
      `Main object: ${co.mainObject}.`,
      `Authorised share capital: Rs. ${co.authCapital} crore.`,
      `Articles amended in ${co.publicYear} to permit a public issue of equity shares.`,
    ]);

  await writePdf(dir, `${co.short} Promoter KYC.pdf`,
    "PROMOTER & DIRECTOR KYC SUMMARY", [
      `Promoter 1: ${co.promoter.name}, Managing Director. DIN: ${co.promoter.din}. PAN: ${co.promoter.pan}.`,
      `Experience: ${co.promoter.experience} years in ${co.sector}. No debarment or disqualification.`,
      `Promoter 2: ${co.promoter2.name}, Whole-time Director. DIN: ${co.promoter2.din}. PAN: ${co.promoter2.pan}.`,
      `Address proof and identity verified. No pending regulatory prohibition on either promoter.`,
    ]);

  // fresh issue and OFS on separate lines so amounts map cleanly
  const brLines = [
    `At the meeting of the Board of Directors of ${co.name} held on`,
    `${co.boardDate} at the registered office, the Board resolved:`,
    `RESOLVED THAT consent be and is hereby accorded for an initial public offering of equity shares`,
    `aggregating up to Rs. ${co.issueSize} crore, comprising:`,
    `a fresh issue of equity shares aggregating up to Rs. ${co.freshIssue} crore, and`,
    co.ofs > 0
      ? `an offer for sale of up to Rs. ${co.ofs} crore by the promoters,`
      : `with no offer for sale component,`,
    `and listing on the ${co.exchange}.`,
    `Shareholders' special resolution passed at the EGM held on ${co.egmDate}.`,
  ];
  await writePdf(dir, `${co.short} Board Resolution IPO.pdf`,
    "CERTIFIED TRUE COPY OF BOARD RESOLUTION", brLines);

  for (const [fy, f] of Object.entries(co.financials))
    await writePdf(dir, `${co.short} Audited Financials ${fy}.pdf`,
      `Audited Financials ${fy}`, financialsDoc(co, fy, f));

  await writePdf(dir, `${co.short} GST Summary ${co.latestFy}.pdf`,
    `GSTR-9 Annual Return Summary — ${co.latestFy}`, [
      `Legal name: ${co.name}`,
      `GSTIN: ${co.gstin}`,
      `Aggregate taxable turnover: Rs. ${co.gstTurnover} crore`,
      co.demandNote
        ? `Note: ${co.demandNote}`
        : `Note: No demand or penalty outstanding as on date.`,
    ]);

  await writePdf(dir, `${co.short} RPT Register ${co.latestFy}.pdf`,
    `Related Party Transaction Register — ${co.latestFy}`, co.rptLines);

  await writePdf(dir, `${co.short} Litigation Declaration.pdf`,
    "DECLARATION ON LITIGATION AND PROCEEDINGS", co.litigationLines);

  await writePdf(dir, `${co.short} Independent Director Consents.pdf`,
    "CORPORATE GOVERNANCE — INDEPENDENT DIRECTOR CONSENTS & COMMITTEES", [
      `Consent letters under Section 152 received from two independent directors appointed on ${co.idDate}:`,
      `1. Independent Director A — DIN: ${co.idDin1} (fictional test identifier).`,
      `2. Independent Director B — DIN: ${co.idDin2} (fictional test identifier).`,
      `Audit Committee constituted on ${co.acDate} (2 independent directors + 1 executive director).`,
      `Nomination & Remuneration Committee and Stakeholders' Relationship Committee constituted on ${co.acDate}.`,
    ]);

  await writePdf(dir, `${co.short} Supply Agreements Summary.pdf`,
    "MATERIAL CONTRACTS — SUPPLY AGREEMENT SUMMARY", [
      `Long-term supply agreements with the principal customers of ${co.name}.`,
      `Factory premises: ${co.regOffice.split(",").slice(0, 2).join(",")} — lease deed valid until ${co.leaseTill}.`,
      `Top 3 customers contributed approximately ${co.top3Pct}% of revenue in ${co.latestFy}.`,
    ]);

  await writePdf(dir, `${co.short} Machinery Quotation.pdf`,
    `QUOTATION — ${co.capexTitle}`, [
      `To: ${co.name}, ${co.city}`,
      `From: ${co.vendor} (GSTIN: ${co.vendorGstin})`,
      `Quotation for ${co.capexDesc}.`,
      `Basic price total: Rs. ${co.capexAmount} crore plus applicable GST.`,
      `Validity: 120 days. Delivery: 20 weeks from purchase order. Installation included.`,
    ]);

  await writePdf(dir, `${co.short} Working Capital Assessment.pdf`,
    `WORKING CAPITAL REQUIREMENT ASSESSMENT — ${co.latestFy}`, [
      `Basis: holding-period method consistent with historical operating cycle.`,
      `Incremental working capital requirement: Rs. ${co.wcAmount} crore for the projected year.`,
      `Month-wise deployment schedule enclosed; to be funded from IPO proceeds.`,
      `Certified by management; subject to merchant banker review.`,
    ]);

  await writePdf(dir, `${co.short} Factory License and Approvals.pdf`,
    "GOVERNMENT LICENSES AND APPROVALS REGISTER", [
      `GST registration: GSTIN ${co.gstin} (${co.state}), active.`,
      `Factory license under the Factories Act, 1948 — valid until ${co.factoryTill}.`,
      `Consent to Operate from the State Pollution Control Board, valid until ${co.pcbTill}.`,
      `Udyam registration on record (medium enterprise).`,
      ...co.extraLicenses,
    ]);

  return { name: co.name, dir, files: fs.readdirSync(dir).length };
}

// ── company data (fictional) ─────────────────────────────────────────────────

const COMPANIES = [
  {
    name: "GreenLeaf Agro Foods Limited",
    short: "GreenLeaf",
    cin: "U15400GJ2012PLC071234",
    incorpDate: "18 March 2012",
    roc: "Gujarat",
    publicYear: "2023",
    regOffice: "Plot No. 45, GIDC Estate, Ahmedabad, Gujarat",
    city: "Ahmedabad",
    state: "Gujarat",
    mainObject:
      "processing, packaging and sale of frozen and dehydrated fruits, vegetables and ready-to-cook food products",
    sector: "food processing",
    authCapital: 20,
    promoter: { name: "Rakesh Bhai Patel", din: "02345670", pan: "AACPP2345M", experience: 18 },
    promoter2: { name: "Nita Patel", din: "02345671", pan: "AACPP2345N" },
    boardDate: "12-Jan-2025",
    egmDate: "08-Feb-2025",
    issueSize: 48.5,
    freshIssue: 40,
    ofs: 8.5,
    exchange: "SME platform of the National Stock Exchange (NSE Emerge)",
    financials: {
      FY2023: { revenue: 68, ebitda: 9.2, pat: 4.1, netWorth: 22, borrowings: 15, receivables: 14, cfo: 5.5 },
      FY2024: { revenue: 84, ebitda: 12.1, pat: 6.0, netWorth: 28, borrowings: 18, receivables: 19, cfo: 6.8 },
      FY2025: { revenue: 108, ebitda: 16.5, pat: 8.9, netWorth: 37, borrowings: 21, receivables: 27, cfo: 7.9 },
    },
    latestFy: "FY2025",
    gstin: "24AACPG1234F1Z5",
    gstTurnover: 106.4,
    demandNote: "GST demand notice of Rs. 22 lakh for FY2024 pending; reply filed on 15-Dec-2024. The demand is disputed.",
    rptLines: [
      "Purchases from Patel Cold Storage LLP: Rs. 4.6 crore (promoter family interest)",
      "Unsecured loan from promoter outstanding: Rs. 2.2 crore",
    ],
    litigationLines: [
      "We declare that other than the matter below, there is no pending litigation, arbitration or",
      "regulatory proceeding against the Company, its promoters or directors:",
      "1. GST demand notice of Rs. 22 lakh for FY2024 received from the jurisdictional officer;",
      "   reply filed on 15-Dec-2024; personal hearing awaited. The demand is disputed.",
      "Signed: Rakesh Bhai Patel, Managing Director.",
    ],
    idDate: "06-Mar-2025",
    idDin1: "03345678",
    idDin2: "03345679",
    acDate: "14-Mar-2025",
    top3Pct: 52,
    leaseTill: "2031",
    capexTitle: "IQF FREEZING & PACKAGING LINE",
    vendor: "FrostTech Systems India Private Limited",
    vendorGstin: "24AABCF7654Q1Z3",
    capexDesc: "individual quick freezing (IQF) tunnel, blanchers and automated packaging line",
    capexAmount: 30,
    wcAmount: 12,
    factoryTill: "31-Dec-2028",
    pcbTill: "30-Sep-2027",
    extraLicenses: [
      "FSSAI central license no. 10012345000123, valid until 31-Aug-2027.",
      "ISO 22000:2018 food safety management certification.",
    ],
  },
  {
    name: "Nimbus Textile Mills Limited",
    short: "Nimbus",
    cin: "U17111MH2009PLC198765",
    incorpDate: "05 August 2009",
    roc: "Maharashtra",
    publicYear: "2022",
    regOffice: "Unit No. 12, MIDC Tarapur, Boisar, Maharashtra",
    city: "Boisar",
    state: "Maharashtra",
    mainObject: "manufacture of cotton yarn, blended yarn and knitted fabric for apparel and home textiles",
    sector: "textile manufacturing",
    authCapital: 30,
    promoter: { name: "Suresh Kumar Agarwal", din: "03456781", pan: "ABGPA6789N", experience: 25 },
    promoter2: { name: "Meena Agarwal", din: "03456782", pan: "ABGPA6789P" },
    boardDate: "20-Jan-2025",
    egmDate: "18-Feb-2025",
    issueSize: 55,
    freshIssue: 55,
    ofs: 0,
    exchange: "SME platform of BSE (BSE SME)",
    financials: {
      FY2023: { revenue: 120, ebitda: 14, pat: 6.5, netWorth: 45, borrowings: 40, receivables: 30, cfo: 8 },
      FY2024: { revenue: 132, ebitda: 15.5, pat: 7.2, netWorth: 51, borrowings: 44, receivables: 33, cfo: 9.2 },
      FY2025: { revenue: 141, ebitda: 16.8, pat: 8.0, netWorth: 58, borrowings: 46, receivables: 35, cfo: 10.1 },
    },
    latestFy: "FY2025",
    gstin: "27ABGPA6789N1Z4",
    gstTurnover: 140.2,
    demandNote: "",
    rptLines: [
      "No material related-party transactions during the year other than director remuneration",
      "of Rs. 0.6 crore, approved by the Board and within statutory limits.",
    ],
    litigationLines: [
      "We declare that there is no pending litigation, NIL, against the Company,",
      "its promoters or directors, as on the date of this declaration.",
      "Signed: Suresh Kumar Agarwal, Managing Director.",
    ],
    idDate: "10-Mar-2025",
    idDin1: "04456781",
    idDin2: "04456782",
    acDate: "17-Mar-2025",
    top3Pct: 28,
    leaseTill: "2034",
    capexTitle: "RING-FRAME SPINNING & AUTOCONER LINE",
    vendor: "SpinTech Machinery Private Limited",
    vendorGstin: "27AACSS8765R1Z6",
    capexDesc: "ring-frame spinning machines, autoconers and humidification plant",
    capexAmount: 35,
    wcAmount: 18,
    factoryTill: "31-Dec-2029",
    pcbTill: "31-Mar-2028",
    extraLicenses: [
      "TUV textile quality certification on record.",
      "ISO 9001:2015 certified.",
    ],
  },
];

const results = [];
for (const co of COMPANIES) results.push(await generateCompany(co));
console.log("Generated document sets:");
for (const r of results) console.log(`  • ${r.name}: ${r.files} PDFs → ${r.dir}`);
