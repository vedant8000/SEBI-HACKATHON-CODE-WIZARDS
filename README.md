<div align="center">

<img src="public/landing/siim-logo.png" alt="SIIM logo" width="96" />

# SIIM: SME IPO Intelligence Mitra

**From scattered documents to a review ready, verifiable IPO offer document.**

An evidence backed platform that helps an SME promoter prepare a substantially complete draft offer document, while preserving the authorised intermediary's role in review and certification.

[![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-149ECA?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-7-47A248?logo=mongodb)](https://www.mongodb.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss)](https://tailwindcss.com/)

**SEBI Securities Market TechSprint at GFF 2026 · Problem Statement 4**
Simplifying IPO Offer Document Preparation for SMEs

[Live prototype](https://sebi-hackathon-code-wizards.vercel.app)

</div>

---

> **Positioning.** SIIM is a preparation and enablement aid, not a regulatory filing. Its ceiling is *ready for merchant banker review*, never *ready to file*. It does not replace SEBI registered merchant bankers, legal counsel or auditors, and it never presents its output as SEBI approved or guaranteed compliant.

## The problem

Preparing an IPO offer document is the single hardest step toward an SME listing. It is complex, expensive, runs across several months, and leaves lean promoter teams dependent on intermediaries from the very first day. Promoters rarely know which documents are enough, what will get flagged, or how close they are to being ready.

SIIM turns that scattered, opaque process into a guided, evidence backed workflow the promoter can run themselves, and hands a clean, source linked draft to the professionals who certify it.

## Screenshots

> Add your captures to `docs/screenshots/` using the file names below and they will render here.

<div align="center">

| Landing | IPO readiness cockpit |
|---|---|
| <img src="docs/screenshots/landing.png" alt="Landing page" width="420" /> | <img src="docs/screenshots/intelligence.png" alt="IPO Intelligence dashboard" width="420" /> |

| Evidence and extraction | Disclosure integrity and forensics |
|---|---|
| <img src="docs/screenshots/evidence.png" alt="Evidence and extraction" width="420" /> | <img src="docs/screenshots/integrity.png" alt="Disclosure integrity score" width="420" /> |

| Draft offer document | Merchant banker review |
|---|---|
| <img src="docs/screenshots/draft.png" alt="Draft offer document" width="420" /> | <img src="docs/screenshots/banker.png" alt="Merchant banker review" width="420" /> |

</div>

## How it works

1. **Company setup.** A guided, plain language profile with a three year financial snapshot.
2. **Upload anything.** The promoter drops in whatever documents they already hold, in any order, with no fixed bundle required. Each file is read page by page, split into chunks with page level provenance, classified, and mined for structured facts by pattern extraction and large language models. Every fact is stored with its source file, page, confidence and review status.
3. **Extraction and evidence.** Accept, reject or correct every fact. Conflicting figures across documents, such as audited revenue against GST turnover, are detected automatically.
4. **IPO intelligence.** A deterministic rule engine computes a live readiness score, gaps, related party and fund diversion risks, financial consistency red flags, framework obligations, and the questions an exchange reviewer is likely to raise. The AI never decides scores or compliance, only the rule engine does.
5. **Draft offer document.** The full SME prospectus blueprint of 57 sections is generated section by section, using only that section's evidence. Missing information is flagged rather than assumed, and every line stays traceable to a source.
6. **Send for review.** The completed draft moves to the SEBI registered merchant banker, who reviews and certifies inside their own workspace.

## What sets SIIM apart

SIIM does not merely draft, it verifies and protects.

- **Document authenticity forensics.** Structural analysis of the raw file flags edited or forged PDFs at the source, using incremental edit detection, metadata and creation history checks, and text layer analysis.
- **Disclosure Integrity Score.** Eight earnings quality and statistical signals, including a Benford's law test, surface the questions a reviewer will ask before filing.
- **Related party and fund diversion engine.** Exposes promoter group dealings and circular flows, the area SEBI scrutinises first.
- **Exchange Observation Simulator.** Predicts the clarifications an NSE Emerge or BSE SME reviewer is most likely to raise, each with why it is asked and the disclosure that pre empts it.
- **Basis for Issue Price.** Justifies valuation against a set of comparable listed peers.
- **Tamper evident, machine readable filing pack.** Exports a structured disclosure data model sealed with SHA-256 cryptographic hashing in a hash chain, so no version of the filing can be altered or backdated undetected. This is the tamper evidence principle used in blockchain and distributed ledger systems.
- **Evidence first drafting.** Every drafted line traces to a source document, page and confidence, with a human always in control.

## Technology

| Layer | Stack |
|---|---|
| Application and UI | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, Recharts |
| AI orchestration | Provider agnostic layer across Gemini, Claude and OpenAI, with multi key rotation, automatic failover and grounded prompting |
| Document intelligence | pdfjs page aware parsing, token budgeted chunking with page range provenance, hybrid pattern plus deep learning extraction, a bounded concurrency pool for low latency |
| Compliance core | Deterministic rule engine, cross document conflict detection, 57 section SME prospectus blueprint, weighted readiness scoring |
| Forensics and integrity | Structural document tamper forensics and Benford's law statistical anomaly detection |
| Data and evidence | MongoDB evidence store with full provenance, a tamper evident SHA-256 hash chain, human in the loop fact review |

## Getting started

**Prerequisites:** Node.js 20 or later, a MongoDB connection (Atlas or local), and optionally an AI key (Gemini, Anthropic or OpenAI). Without an AI key, pattern extraction and the full rule engine still run.

```bash
git clone https://github.com/vedant8000/SEBI-HACKATHON-CODE-WIZARDS.git
cd SEBI-HACKATHON-CODE-WIZARDS
npm install
```

Create `.env.local`:

```env
MONGODB_URI=your_mongodb_connection_string
AI_PROVIDER=gemini
GEMINI_API_KEY=your_key
# Optional: more keys mean higher throughput and faster extraction
GEMINI_API_KEY_2=your_second_key
GEMINI_MODEL=gemini-2.5-flash-lite
# Or use AI_PROVIDER=anthropic with ANTHROPIC_API_KEY
# Or use AI_PROVIDER=openai with OPENAI_API_KEY
```

Seed the demo accounts and sample companies, then run:

```bash
npm run seed:mongo                      # demo users
node scripts/make-sample-companies.mjs  # optional sample companies with documents
npm run dev                             # http://localhost:3000
```

## Demo credentials

| Role | Email | Password |
|---|---|---|
| Promoter (clean testing account) | promoter@siim.demo | Demo@123 |
| Merchant Banker | banker@siim.demo | Demo@123 |
| Sample company: GreenLeaf Agro Foods | promoter@greenleaf.com | GreenLeaf@2026 |
| Sample company: Nimbus | promoter@nimbus.com | Nimbus@2026 |

The promoter demo account always starts empty, so you can walk the full journey from a clean slate. The sample company accounts come pre loaded so you can explore the intelligence and draft immediately.

## Project structure

```
app/(portal)/          promoter and banker pages (onboarding, evidence, intelligence, draft, review)
app/api/               companies, documents and upload, facts, analysis, draft, review, export, qa
lib/ipo-blueprint/     SME prospectus blueprint (57 section structure)
lib/document-processing/  page wise reading, chunking, classification, extraction, authenticity, conflicts
lib/engine/            rule engine, coverage matrix, draft generator, forensics, peer benchmarking
lib/ai/provider.ts     Gemini, Anthropic and OpenAI abstraction with key rotation and failover
lib/utils/             hash chain, concurrency pool, shared helpers
lib/store.ts           MongoDB backed datastore with provenance and audit trail
```

## Roadmap

- Deep learning image forensics for splice and copy move detection on scanned pages
- Graph based analytics for hidden related party networks and circular transactions
- Retrieval augmented generation over SEBI regulations and past exchange observations
- XBRL aligned disclosure taxonomy for straight through supervisory ingestion
- Consent based verified data through MCA21, GSTN, DigiLocker and the Account Aggregator framework
- Auditor and legal counsel portals, and multilingual promoter assistance

## Team

**Code Wizards**, Birla Institute of Technology, Mesra.
Vedant Agarwal, Debspandan Chakraborty, Pratyush Mangal, Vivek Chandravanshi.

## Disclaimer

SIIM is an academic prototype built for the SEBI Securities Market TechSprint at GFF 2026. It assists preparation and does not produce a SEBI approved or filing ready document. Any integrations shown as simulated are clearly labelled and do not fetch live government data. Final responsibility for any offer document rests with the issuer and its SEBI registered intermediaries.
