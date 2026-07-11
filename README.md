# SIIM — AI Disclosure Intelligence Platform for SME IPOs

**SEBI Hackathon · Problem Statement 4: Simplifying IPO Offer Document Preparation for SMEs**

SIIM lets an SME promoter upload whatever IPO-related documents they currently have and generates a
substantially complete, **SEBI/SME-framework-aligned draft offer document** — while dynamically identifying missing
information, cross-document inconsistencies, financial/legal/governance risks, and every item that needs merchant
banker / legal / auditor review.

> **Important:** SIIM is an AI-assisted draft preparation tool. It does not produce SEBI-approved or
> guaranteed-compliant documents and never claims "ready to file". Its ceiling is **"ready for merchant banker
> review"**. It does not replace SEBI-registered intermediaries, legal counsel or auditors.

---

## How it works (upload-driven — nothing is hardcoded)

1. **Company Setup** — a guided, plain-language profile (rough numbers welcome; everything is cross-checked later).
2. **Upload any documents** (PDF, TXT, CSV; scans accepted with manual entry fallback). Files are:
   - read **page-by-page** (pdfjs-dist) and split into **chunks** (≤3 pages / ~4k tokens),
   - **classified by AI** (Gemini/Claude/OpenAI) with keyword fallback,
   - mined for **structured facts** — pattern extraction + **chunk-wise AI extraction** — each fact stored with
     source file, page range, extraction method, confidence and review status.
3. **Extraction & Evidence** — accept / reject / edit every fact (edits are flagged *"Promoter edited — merchant
   banker verification required"*). Manual fact entry for missing data. Cross-document **fact conflicts** are
   detected automatically (e.g. audited revenue vs GST turnover).
4. **Deterministic rule engine** computes the readiness score (Eligibility 30% · Disclosure 25% · Financial 20% ·
   Governance 15% · Document Quality 10%), gaps, RPT/fund-diversion risks, financial-consistency red flags and
   likely exchange observations. **The LLM never decides scores or compliance — only the rule engine does.**
5. **IPO Coverage Matrix** — all **51 sections of the real SME Draft Prospectus blueprint** (NSE Emerge / BSE SME
   structure: Front Matter → Sections I–X → Declaration) scored against your extracted facts: what can be generated,
   partially generated, or is blocked.
6. **Draft Offer Document** — generated **section-by-section** from the blueprint. Each AI call receives *only* that
   section's facts (with provenance) and gaps; missing data becomes `[Promoter confirmation required: …]`
   placeholders — never invented content. Every section shows source-evidence badges, confidence, and review status.
7. **Merchant Banker Review Room** — approve / request changes / assign back / needs-legal, comments, full audit
   trail. "Final Draft Ready" is blocked while critical gaps are open.
8. **Promoter Assistant** — answers only from your uploaded context, facts, gaps and draft; says so when it can't.
9. **Export Center** — draft (blueprint order, printable → PDF), gap report CSV, evidence pack JSON, review pack.

## Tech stack

Next.js 16 (App Router) · TypeScript · Tailwind v4 · Recharts · Lucide · pdfjs-dist (page-wise PDF text) ·
JSON-file datastore (swap for Prisma/Postgres in production) · AI provider abstraction (Gemini / Anthropic / OpenAI).

## Setup

```bash
cd ipo-saathi
npm install
cp .env.example .env.local   # add your API key (see below)
npm run dev                  # or: npm run build && npm start
```

`.env.local`:

```
AI_PROVIDER=gemini
GEMINI_API_KEY=<your key>
GEMINI_MODEL=gemini-2.5-flash-lite   # optional
# or: AI_PROVIDER=anthropic + ANTHROPIC_API_KEY / AI_PROVIDER=openai + OPENAI_API_KEY
```

**Without an API key:** pattern-based extraction and the full rule engine still run, but AI classification,
chunk-wise fact extraction, draft generation and the assistant are disabled with a clear setup message — the app
never fabricates AI output.

## Demo credentials (authentication is mocked for the MVP)

| Role | Email | Password |
|---|---|---|
| Promoter | promoter@iposaathi.demo | demo123 |
| Merchant Banker | banker@iposaathi.demo | demo123 |
| Admin | admin@iposaathi.demo | demo123 |

## Demo flow

1. **Company Setup** → enter company + 3-year financial snapshot.
2. **Upload & Data Room** → drop your PDFs (sample PDFs in `public/demo-assets/` if you need test files —
   regenerate with `node scripts/make-sample-docs.js`).
3. Watch **Extraction & Evidence** fill with sourced facts (accept/correct as needed).
4. Check **Coverage Matrix → Readiness → Heatmap → Gap Report → RPT Risk → Financial Consistency**.
5. **Objects of Issue** → build the fund utilisation plan (warnings compute live).
6. **Generate Draft** (top bar) → section-wise, source-linked draft (~1–2 min on free-tier rate limits).
7. **Merchant Banker Review** → approve/comment; **Export Center** → download everything.

## Folder structure

```
app/(portal)/…        pages (dashboard, data-room, evidence, coverage, readiness, heatmap,
                      gap-report, financial-checks, rpt-risk, objects-builder, draft,
                      observations, summary(assistant), merchant-review, exports, valuation, settings)
app/api/…             companies, documents(+upload), facts, analysis, draft(+section), review,
                      objects, qa, reset, export/{draft,gap-report,evidence,readiness}
lib/ipo-blueprint/    SME prospectus blueprint (structure only — 51 sections)
lib/document-processing/  page-wise reading, chunking, classification, pattern + AI facts, conflicts
lib/engine/           deterministic rule engine, coverage matrix, draft generator, summaries
lib/ai/provider.ts    Gemini/Anthropic/OpenAI abstraction (extraction & language only)
lib/rules/            scoring weights & bands (tunable config)
data/                 local datastore + uploaded files (gitignored)
```

## Known limitations

- DOCX/XLSX are stored and classified by filename but not text-parsed yet (roadmap: mammoth/xlsx); scanned PDFs need
  OCR (roadmap) — both fall back to manual fact entry.
- Free-tier Gemini rate limits make full-draft generation take a couple of minutes (calls are paced and retried).
- JSON-file datastore and mocked authentication are MVP simplifications.
- Peer benchmarking requires manually entered peer data (no live market feed).

## Future scope

MCA/GSTN/PAN/DIN integrations · OCR for scanned documents · auditor & legal counsel portals · DRHP/RHP version
comparison · XBRL/structured filing support · multi-language assistant · market-maker workflow · post-listing
compliance automation · secure due-diligence repository with hash-trail document integrity.

---

*Disclaimer: This is a hackathon MVP. It does not constitute legal, investment, accounting or regulatory advice.
All generated content requires review by SEBI-registered intermediaries before any regulatory use.*
