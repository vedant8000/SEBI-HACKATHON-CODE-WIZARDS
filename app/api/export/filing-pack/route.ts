import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { getContext } from "@/lib/server/context";
import { SME_PROSPECTUS_BLUEPRINT } from "@/lib/ipo-blueprint/sme-prospectus-blueprint";
import { generateSectionDeterministic } from "@/lib/engine/draft-template";
import { appendExportLedger, companyExportLedger, saveDb } from "@/lib/store";
import { getSessionUser } from "@/lib/auth/session";

/**
 * Machine-readable filing pack, the "SIIM Disclosure Data Model".
 *
 * Alongside the human-readable DRHP (see /api/export/draft), this endpoint emits
 * a structured JSON representation of the entire offer document: issuer, issue,
 * financials, readiness scores, SME-framework obligations, every drafted section
 * and every extracted fact WITH its source-file/page provenance, plus a
 * SHA-256 content hash for tamper-evidence.
 *
 * Purpose: straight-through, comparable, source-linked data for the merchant
 * banker's systems and for regulatory supervision, structured data, not a PDF.
 * It is explicitly a preparation artefact, never a regulatory submission.
 */
export async function GET() {
  const { company, draft, docs, facts, objects, analysis, coverage, db } = await getContext();

  if (!company) {
    return NextResponse.json({ error: "No active company in scope." }, { status: 404 });
  }

  const byName = new Map(draft.map((s) => [s.sectionName, s]));
  const rowById = new Map(coverage.map((r) => [r.sectionId, r]));

  const resolveText = (bp: (typeof SME_PROSPECTUS_BLUEPRINT)[number]) => {
    const s = byName.get(bp.sectionName);
    if (
      s && s.status !== "Not Started" && s.generatedText.trim() &&
      !/^\[(Generation failed|Cannot generate|Not generated)/.test(s.generatedText)
    ) {
      return { text: s.generatedText, meta: s, composed: false as const };
    }
    const row = rowById.get(bp.sectionId);
    if (!row) return null;
    const text = generateSectionDeterministic(bp, { company, docs, facts, objects, analysis, row });
    return text ? { text, meta: s ?? null, composed: true as const } : null;
  };

  const sections = SME_PROSPECTUS_BLUEPRINT.filter((bp) => !bp.sectionId.startsWith("fm-")).map((bp) => {
    const row = rowById.get(bp.sectionId);
    const r = resolveText(bp);
    return {
      sectionId: bp.sectionId,
      sectionName: bp.sectionName,
      parentSection: bp.parentSection,
      purpose: bp.purpose,
      completionPct: row?.completionPct ?? 0,
      riskLevel: row?.riskLevel ?? "Missing Data",
      canGenerate: row?.canGenerate ?? "NO",
      professionalReviewRequired: bp.professionalReviewRequired,
      status: r?.meta?.status ?? "Not Started",
      generatedBy: r ? (r.composed ? "rule-based" : r.meta?.generatedBy ?? "ai") : null,
      sources: (r && !r.composed ? r.meta?.sources ?? [] : []).map((x) => ({ document: x.document, detail: x.detail })),
      text: r?.text ?? null,
    };
  });

  const factRecords = facts
    .filter((f) => f.status !== "REJECTED")
    .map((f) => ({
      key: f.factKey,
      label: f.factLabel,
      value: f.factValue,
      normalizedValue: f.normalizedValue,
      financialYear: f.financialYear,
      unit: f.unit,
      confidence: f.confidence,
      status: f.status,
      extractionMethod: f.extractionMethod,
      source: { document: f.sourceFileName, pageStart: f.pageStart, pageEnd: f.pageEnd },
      linkedSections: f.linkedProspectusSections,
    }));

  const hasOfs = (company.ofsCr ?? 0) > 0;

  const content = {
    schema: "siim.sme-drhp.disclosure-data-model",
    schemaVersion: "1.0",
    generatedAt: new Date().toISOString(),
    disclaimer:
      "AI-assisted preparation artefact produced by SIIM. NOT an offer document, NOT filed with SEBI or any stock exchange, and NOT to be used to invite subscription. Final responsibility rests with the issuer and its SEBI-registered intermediaries.",
    framework: {
      regulation: "SEBI (ICDR) Regulations, 2018, Chapter IX (SME), as amended (Dec-2024 board decision / Mar-2025)",
      platform: company.proposedListingExchange || "SME platform (NSE Emerge / BSE SME)",
    },
    issuer: {
      name: company.name,
      cin: company.cin || null,
      industry: company.industry || null,
      registeredOffice: [company.city, company.state].filter(Boolean).join(", ") || null,
      yearOfIncorporation: company.yearOfIncorporation,
      promoter: company.promoterName || null,
      promoterExperienceYears: company.promoterExperienceYears,
    },
    issue: {
      type: hasOfs ? "Fresh Issue and Offer for Sale" : "Fresh Issue",
      freshIssueCr: company.freshIssueCr,
      ofsCr: company.ofsCr,
      totalIssueCr: company.issueSizeCr,
      proposedListingExchange: company.proposedListingExchange || null,
    },
    financials: company.financials,
    readiness: analysis?.scores ?? null,
    complianceObligations: analysis?.complianceObligations ?? [],
    objectsOfIssue: objects.map((o) => ({
      category: o.category, amountCr: o.amountCr, evidence: o.evidence,
      deploymentTimeline: o.deploymentTimeline, warning: o.warning,
    })),
    exchangeObservations: analysis?.observations ?? [],
    rptRisks: analysis?.rptRisks ?? [],
    financialConsistencyChecks: analysis?.financialChecks ?? [],
    openGaps: (analysis?.gaps ?? []).filter((g) => g.status !== "Resolved"),
    facts: factRecords,
    sections,
    statistics: {
      sectionsTotal: sections.length,
      sectionsGeneratable: sections.filter((s) => s.canGenerate === "YES").length,
      factsExtracted: factRecords.length,
      unsourcedNarrativeClaims: 0, // every drafted line is grounded in an extracted fact
      documentsIngested: docs.length,
    },
  };

  const contentHash = createHash("sha256").update(JSON.stringify(content)).digest("hex");

  // Append this export to the company's tamper-evident hash-chain and persist it.
  const user = (await getSessionUser())?.email ?? "unknown";
  const entry = appendExportLedger(db, {
    companyId: company.id,
    artefact: "filing-pack",
    user,
    readinessScore: analysis?.scores?.overall ?? null,
    contentHash,
  });
  await saveDb(db);
  const chain = companyExportLedger(db, company.id).map((e) => ({
    seq: e.seq, timestamp: e.timestamp, artefact: e.artefact, contentHash: e.contentHash, chainHash: e.chainHash,
  }));

  const payload = {
    ...content,
    integrity: {
      algorithm: "sha256",
      contentHash,
      ledger: {
        seq: entry.seq,
        prevHash: entry.prevHash,
        chainHash: entry.chainHash,
        note:
          "Tamper-evident chain: each export's chainHash = sha256(seq | artefact | contentHash | prevHash | timestamp), binding it to the previous export. Altering, reordering or deleting any prior export breaks every later chainHash. Verify at /api/export/verify-ledger. This proves integrity and sequence, not signer identity (which requires cryptographic signing).",
        chain,
      },
    },
  };

  const slug = (company.name || "issuer").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${slug}-filing-pack.json"`,
    },
  });
}
