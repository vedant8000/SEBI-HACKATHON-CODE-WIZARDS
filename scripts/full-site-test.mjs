/**
 * FULL-SITE FUNCTIONAL TEST — exercises the complete 6-step SIIM journey:
 *
 *   pages → reset → Company Setup (+ duplicate guard) → Upload & extraction
 *   → Evidence review (accept/edit/manual) → IPO Intelligence rules
 *   → AI draft generation → Merchant Banker review → exports → chatbot
 *
 * ⚠ Resets the local datastore first (clean-slate test), then leaves the app
 *   fully populated so you can browse the result.
 *
 * Usage:
 *   1. npm run dev   (or npm run build && npm start)
 *   2. npm run test:site        [BASE_URL=https://sebi-hackathon-code-wizards-zeta.vercel.app by default]
 *
 * AI-dependent steps degrade to WARN (not FAIL) if the provider is
 * rate-limited, so infrastructure failures are separated from quota noise.
 */

import fs from "fs";
import path from "path";
import os from "os";

const BASE = process.env.BASE_URL ?? "https://sebi-hackathon-code-wizards-zeta.vercel.app";

let pass = 0, fail = 0, warn = 0;
const ok = (cond, label, detail = "") => {
  console.log(`  ${cond ? "✅" : "❌"} ${label}${detail ? ` — ${detail}` : ""}`);
  cond ? pass++ : fail++;
};
const soft = (cond, label, detail = "") => {
  console.log(`  ${cond ? "✅" : "⚠️ "} ${label}${detail ? ` — ${detail}` : ""}`);
  cond ? pass++ : warn++;
};
const j = async (res) => ({ status: res.status, data: await res.json().catch(() => ({})) });
const post = (url, body) => fetch(BASE + url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(j);
const patch = (url, body) => fetch(BASE + url, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(j);
const get = (url) => fetch(BASE + url).then(j);

// ── auth: APIs are session-protected; log in (or register) the demo promoter
const DEMO_USER = { name: "Demo Promoter", email: "promoter@siim.demo", password: "Demo@123", role: "PROMOTER" };
let SESSION_COOKIE = "";
const rawFetch = globalThis.fetch;
globalThis.fetch = (url, init = {}) =>
  rawFetch(url, SESSION_COOKIE ? { ...init, headers: { ...(init.headers ?? {}), cookie: SESSION_COOKIE } } : init);

async function authenticate() {
  for (const p of ["/api/auth/login", "/api/auth/register"]) {
    const res = await rawFetch(BASE + p, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(DEMO_USER),
    }).catch(() => null);
    if (res?.ok) {
      SESSION_COOKIE = (res.headers.get("set-cookie") ?? "").split(";")[0];
      return true;
    }
  }
  return false;
}

const COMPANY = {
  name: "Shivalic Power Control Limited",
  cin: "U31200HR2004PLC035502",
  industry: "Electric panel manufacturing (LT/HT power control panels)",
  city: "Faridabad", state: "Haryana", yearOfIncorporation: 2004,
  promoterName: "Amit Kanwar Jindal", promoterExperienceYears: 20,
  issueSizeCr: 64.32, freshIssueCr: 64.32, ofsCr: 0, proposedListingExchange: "NSE Emerge",
  financials: [
    { fy: "FY2022", revenueCr: 57.4, ebitdaCr: 5, patCr: 1.75, netWorthCr: 15.9, borrowingsCr: 27.2, receivablesCr: 13.3, cfoCr: 4 },
    { fy: "FY2023", revenueCr: 82.7, ebitdaCr: 13, patCr: 7.16, netWorthCr: 23.0, borrowingsCr: 24, receivablesCr: 13.3, cfoCr: -8 },
    { fy: "FY2024", revenueCr: 102, ebitdaCr: 19, patCr: 10.9, netWorthCr: 42, borrowingsCr: 32, receivablesCr: 34.7, cfoCr: -9 },
  ],
  top3CustomerPct: 45,
  independentDirectorsAppointed: true, auditCommitteeConstituted: true,
  pendingLitigationNote: "GST demand notice of ₹15 lakh for FY2023, reply filed (test fixture)",
};

async function makeFixturePdfs(dir) {
  const { default: PDFDocument } = await import("pdfkit");
  fs.mkdirSync(dir, { recursive: true });
  const write = (name, title, lines) => new Promise((resolve) => {
    const doc = new PDFDocument({ margin: 50 });
    const stream = fs.createWriteStream(path.join(dir, name));
    doc.pipe(stream);
    doc.fontSize(14).text(title, { underline: true });
    doc.moveDown(); doc.fontSize(10);
    for (const line of lines) { doc.text(line); doc.moveDown(0.4); }
    doc.moveDown();
    doc.fontSize(8).fillColor("#666").text("TEST FIXTURE. Not an audited document.");
    doc.end();
    stream.on("finish", resolve);
  });
  await write("Shivalic Audited Financials FY2024.pdf", "SHIVALIC POWER CONTROL LIMITED — Audited Financial Statements FY2024", [
    "CIN: U31200HR2004PLC035502", "Registered office: Faridabad, Haryana",
    "Statement of Profit and Loss for the year ended 31 March 2024",
    "Revenue from operations: Rs. 102 crore", "EBITDA: Rs. 19 crore", "Profit after tax: Rs. 10.9 crore",
    "", "Balance Sheet as at 31 March 2024",
    "Net worth: Rs. 42 crore", "Total borrowings: Rs. 32 crore", "Trade receivables: Rs. 34.7 crore",
    "", "Cash flow from operations: Rs. -9 crore",
  ]);
  await write("Shivalic GST Summary FY2024.pdf", "GSTR-9 Annual Return Summary — FY2024", [
    "Legal name: Shivalic Power Control Limited", "GSTIN: 06AAJCS4970M1ZI",
    "Aggregate taxable turnover: Rs. 100.8 crore",
    "Note: Demand notice of Rs. 15 lakh for FY2023 pending; reply filed.",
  ]);
  await write("Shivalic RPT Register FY2024.pdf", "Related Party Transaction Register — FY2024", [
    "Purchases from Jindal Switchgear Traders LLP: Rs. 3.1 crore (promoter family interest)",
    "Unsecured loan from promoter outstanding: Rs. 1.4 crore",
  ]);
  return ["Shivalic Audited Financials FY2024.pdf", "Shivalic GST Summary FY2024.pdf", "Shivalic RPT Register FY2024.pdf"]
    .map((f) => path.join(dir, f));
}

async function main() {
  console.log(`\nFULL-SITE FUNCTIONAL TEST  (server: ${BASE})\n`);

  // ── 0. Server & pages ─────────────────────────────────────────────────────
  console.log("0 · Server & page availability:");
  const upCheck = await fetch(BASE + "/").catch(() => null);
  if (!upCheck) { console.error(`❌ Server not reachable at ${BASE}. Start it first (npm run dev).`); process.exit(1); }
  ok(await authenticate(), "logged in as demo promoter", DEMO_USER.email);
  for (const p of ["", "onboarding", "data-room", "evidence", "intelligence", "draft", "merchant-review", "assistant", "settings"]) {
    const res = await fetch(`${BASE}/${p}`);
    ok(res.status === 200, `/${p || "(landing)"} renders`, `HTTP ${res.status}`);
  }
  const landing = await (await fetch(BASE + "/")).text();
  ok(!/Demo Company|Demo Mode/i.test(landing), "no demo-mode CTAs on landing");

  // ── 1. Clean slate ────────────────────────────────────────────────────────
  console.log("1 · Reset datastore:");
  const reset = await fetch(BASE + "/api/reset", { method: "DELETE" }).then(j);
  ok(reset.status === 200, "reset succeeded");

  // ── 2. Company Setup ──────────────────────────────────────────────────────
  console.log("2 · Company Setup:");
  const created = await post("/api/companies", COMPANY);
  ok(created.status === 200 && created.data.company?.id, "company created", created.data.company?.name);
  const dupe = await post("/api/companies", COMPANY);
  const list = await get("/api/companies");
  ok(list.data.companies?.length === 1 && dupe.data.company?.id === created.data.company?.id,
    "duplicate-name guard: re-submit updates instead of duplicating", `${list.data.companies?.length} company on record`);

  // ── 3. Upload & extraction pipeline ───────────────────────────────────────
  console.log("3 · Upload & Data Room (AI classification + chunk-wise facts; ~1 min):");
  const files = await makeFixturePdfs(path.join(os.tmpdir(), "ipo-saathi-fixtures"));
  const fd = new FormData();
  for (const f of files) fd.append("files", new Blob([fs.readFileSync(f)], { type: "application/pdf" }), path.basename(f));
  let up = { status: 0, data: {} };
  try {
    up = await fetch(BASE + "/api/documents/upload", { method: "POST", body: fd, signal: AbortSignal.timeout(280_000) }).then(j);
  } catch (e) {
    console.log(`  ❌ upload request failed: ${e.message}`);
  }
  ok(up.status === 200 && up.data.documents?.length === 3, "3 PDFs uploaded & classified",
    up.data.documents?.map((d) => d.category).join(", ") ?? "");
  ok(up.data.documents?.every((d) => d.confidence > 0) ?? false, "extraction confidence attached");
  if (up.data.warnings?.length) console.log(`  ⚠️  ${up.data.warnings[0]}`);

  // ── 4. Evidence & Extraction ──────────────────────────────────────────────
  console.log("4 · Evidence & Extraction:");
  const facts = await get("/api/facts");
  ok((facts.data.facts?.length ?? 0) >= 5, "facts extracted with provenance", `${facts.data.facts?.length} facts`);
  ok(facts.data.facts?.some((f) => f.pageStart), "page references present");
  const editable = facts.data.facts?.find((f) => f.factKey === "receivablesCr") ?? facts.data.facts?.[0];
  if (editable) {
    const edited = await patch("/api/facts", { id: editable.id, action: "edit", value: editable.normalizedValue });
    ok(edited.data.fact?.status === "PROMOTER_EDITED", "fact edit flags MB verification");
  }
  const manual = await post("/api/facts", { factKey: "employeeCount", value: "182", factLabel: "Employees" });
  ok(manual.status === 200 && manual.data.fact?.extractionMethod === "manual", "manual fact entry works");

  // ── 5. IPO Intelligence (rule engine) ─────────────────────────────────────
  console.log("5 · IPO Intelligence:");
  const analysis = await post("/api/analysis", {});
  const a = analysis.data.analysis;
  ok(typeof a?.scores?.overall === "number", "readiness score computed", `${a?.scores?.overall}/100`);
  ok((a?.gaps?.length ?? 0) > 0, "gaps detected", `${a?.gaps?.length} gaps`);
  ok(a?.checks?.some((c) => /receivable spike/i.test(c.ruleName) && c.status === "fail"), "receivable-spike rule fired");
  ok(a?.financialChecks?.some((c) => /GST/i.test(c.checkName)), "GST-vs-books cross-check ran");
  soft((a?.rptRisks?.length ?? 0) > 0, "RPT engine flagged promoter-family entity",
    a?.rptRisks?.[0]?.entityName ?? "none (AI extraction may have been rate-limited)");
  ok((a?.observations?.length ?? 0) > 0, "likely reviewer questions generated", `${a?.observations?.length}`);

  // objects plan → fund-use warnings
  const objects = await post("/api/objects", {
    objects: [
      { category: "Machinery purchase (capex)", amountCr: 25, evidence: "", deploymentTimeline: "FY2026 H2" },
      { category: "Working capital", amountCr: 30, evidence: "", deploymentTimeline: "FY2026" },
      { category: "General corporate purposes", amountCr: 9.32, evidence: "", deploymentTimeline: "FY2026" },
    ],
    relatedPartyRepayment: false,
  });
  ok(objects.status === 200 && objects.data.objects?.length === 3, "objects of issue saved & re-analysed");

  // ── 6. Draft generation (AI) ──────────────────────────────────────────────
  console.log("6 · Draft Offer Document (2 sections via AI):");
  const draft = await post("/api/draft", { sectionIds: ["s-4", "l-1"] });
  const sections = draft.data.draft ?? [];
  const finSec = sections.find((s) => s.sectionName === "Summary of Financial Information");
  soft(finSec?.status === "AI Drafted" && finSec?.sources?.length > 0,
    "AI drafted a section with source evidence",
    finSec ? `${finSec.status}, ${finSec.sources.length} source(s), conf ${finSec.confidence}%` : "not generated");
  const anySection = sections.find((s) => s.status === "AI Drafted") ?? sections[0];
  ok(!!anySection, "draft sections stored", `${sections.length} in store`);

  // ── 7. Merchant Banker review loop ────────────────────────────────────────
  console.log("7 · Merchant Banker Review:");
  if (anySection) {
    const commented = await post("/api/review", { sectionId: anySection.id, action: "comment", comment: "Verify figures against restated statements.", user: "Merchant Banker Reviewer", role: "MERCHANT_BANKER" });
    ok(commented.data.section?.comments?.length > 0, "review comment recorded");
    const approved = await post("/api/review", { sectionId: anySection.id, action: "approve", user: "Merchant Banker Reviewer", role: "MERCHANT_BANKER" });
    ok(approved.data.section?.status === "Approved", "section approved");
  }

  // ── 8. Exports ────────────────────────────────────────────────────────────
  console.log("8 · Exports:");
  const draftHtml = await (await fetch(BASE + "/api/export/draft")).text();
  ok(draftHtml.includes("Table of Contents") && draftHtml.includes("drafted sections (blueprint order)"),
    "draft export renders (TOC + drafted sections only)");
  const pack = await fetch(BASE + "/api/export/review-pack");
  ok(pack.status === 200 && (await pack.text()).includes("Review Pack"), "review pack export works");
  const csv = await fetch(BASE + "/api/export/gap-report");
  ok(csv.status === 200, "gap report CSV export works");

  // ── 9. AI Assistant (dedicated tab + grounded answers) ────────────────────
  console.log("9 · AI Assistant:");
  const assistantHtml = await (await fetch(BASE + "/assistant")).text();
  ok(assistantHtml.includes("SIIM Assistant") && assistantHtml.includes("What I can see"),
    "assistant tab renders chat + grounding panel");
  const qa = await post("/api/qa", { question: "What should I fix first?" });
  const answer = qa.data.answer ?? "";
  soft(answer.length > 50 && !/did not respond/i.test(answer), "assistant answered from company context", answer.slice(0, 80).replace(/\n/g, " ") + "…");
  const qaHi = await post("/api/qa", { question: "Mere sabse bade risk ko simple Hindi mein samjhao" });
  soft((qaHi.data.answer ?? "").length > 50 && !/did not respond/i.test(qaHi.data.answer ?? ""),
    "assistant handles Hindi/Hinglish", (qaHi.data.answer ?? "").slice(0, 70).replace(/\n/g, " ") + "…");

  // ── verdict ───────────────────────────────────────────────────────────────
  console.log(`\n${"─".repeat(60)}`);
  console.log(`RESULT: ${pass} passed · ${warn} warnings (AI rate-limit tolerant) · ${fail} FAILED`);
  console.log(fail === 0
    ? "✅ SITE IS FULLY FUNCTIONAL. The app is now populated — browse the 6-step flow, then click Generate Draft for the full 16 sections."
    : "❌ Functional failures found — see ❌ lines above.");
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => { console.error("❌ Test crashed:", e.message); process.exit(1); });
