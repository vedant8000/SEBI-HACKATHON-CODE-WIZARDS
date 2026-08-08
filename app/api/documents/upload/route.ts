import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import {
  loadDb, saveDb, uid, logAudit, UPLOADS_DIR, getActiveCompanyFor,
  companyDocuments, companyObjects, companyFacts,
} from "@/lib/store";
import { getSessionUser } from "@/lib/auth/session";
import { readFileText } from "@/lib/document-processing/read-file";
import {
  classifyDocument, extractFields, extractionConfidence,
  initialStatus, keyNumberBadges, summarize,
} from "@/lib/document-processing/extract";
import {
  aiFactsForChunkJobs, buildChunks, detectConflicts, factsFromFields,
  mergeFacts, syncFieldsFromFacts, MAX_AI_CHUNKS_PER_DOC, type ChunkJob,
} from "@/lib/document-processing/facts";
import { aiAvailable, aiCoolingDown, classifyDocumentAI } from "@/lib/ai/provider";
import { analyzeDocumentAuthenticity } from "@/lib/document-processing/authenticity";
import { runAnalysis } from "@/lib/engine/analysis";
import type { DocumentChunk, DocumentRecord, ExtractedFact } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 300;

const MAX_FILE_MB = 40;

/** A document prepared in phase 1, awaiting global AI extraction in phase 2. */
interface Prepared {
  doc: DocumentRecord;
  chunks: DocumentChunk[];
  patternFacts: ExtractedFact[];
  pageCount: number;
  aiEligible: boolean; // AI configured AND the file had a readable text layer
}

/**
 * Upload pipeline (upload-driven, no seeded output):
 *  Phase 1 (sequential, CPU/IO): store file, read text, classify, pattern facts,
 *          build chunks. Fast, deterministic, order-sensitive (dedupe/CIN).
 *  Phase 2 (single global concurrency pool): AI fact extraction across ALL
 *          chunks of ALL documents at once, so every API key stays saturated and
 *          latency is the slowest wave, not the sum of every call.
 *  Phase 3: merge pattern + AI facts, conflict detection, deterministic rules.
 */
export async function POST(req: NextRequest) {
  const db = await loadDb();
  const user = await getSessionUser();
  const company = user ? getActiveCompanyFor(db, user) : null;
  if (!company) return NextResponse.json({ error: "Create a company profile first." }, { status: 400 });

  const form = await req.formData();
  const files = form.getAll("files").filter((f): f is File => f instanceof File);
  if (!files.length) return NextResponse.json({ error: "No files received." }, { status: 400 });

  const uploadedBy = (form.get("uploadedBy") as string) || company.promoterName || "Promoter";
  const companyDir = path.join(UPLOADS_DIR, company.id);
  if (!fs.existsSync(companyDir)) fs.mkdirSync(companyDir, { recursive: true });

  const created: DocumentRecord[] = [];
  const warnings: string[] = [];
  const prepared: Prepared[] = [];

  // The company's established identity: profile CIN, else the CIN most of its
  // existing documents already carry. A new upload with a DIFFERENT CIN almost
  // certainly belongs to another company and gets flagged (not silently mixed).
  const establishedCin = (() => {
    if (company.cin?.trim()) return company.cin.trim().toUpperCase();
    const counts = new Map<string, number>();
    for (const d of db.documents) {
      if (d.companyId !== company.id) continue;
      const c = (d.fields?.cin as string | undefined)?.trim().toUpperCase();
      if (c) counts.set(c, (counts.get(c) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  })();

  // ── Phase 1: prep every file (no AI extraction yet) ──────────────────────
  for (const file of files) {
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      warnings.push(`${file.name}: larger than ${MAX_FILE_MB} MB, please split the file and re-upload.`);
      continue;
    }
    const buf = Buffer.from(await file.arrayBuffer());
    const safeName = file.name.replace(/[^\w.\- ()]/g, "_");
    const storedPath = path.join(companyDir, `${Date.now()}-${safeName}`);
    fs.writeFileSync(storedPath, buf);

    const { pages, text } = await readFileText(file.name, buf);

    // classification: AI first (filename + headings + first pages), keyword fallback
    const kw = classifyDocument(file.name, text);
    let category = kw.category;
    let linkedSection = kw.linkedSection;
    let classificationConfidence = text.trim().length > 100 ? 60 : 35;
    if (aiAvailable()) {
      const headings = (text.match(/^[A-Z][A-Z &/,-]{6,60}$/gm) ?? []).slice(0, 8);
      const ai = await classifyDocumentAI(file.name, pages.slice(0, 3).join("\n"), headings);
      if (ai) {
        category = ai.category;
        classificationConfidence = ai.confidence;
        const kwForAi = classifyDocument(ai.category + " " + file.name, "");
        linkedSection = kwForAi.category === "General" ? linkedSection : kwForAi.linkedSection;
      }
    }

    const fields = extractFields(file.name, text, category);
    const confidence = text.trim().length < 100 ? 25 : Math.max(classificationConfidence, extractionConfidence(text, fields));
    const issues: string[] = [];
    if (text.trim().length < 100)
      issues.push("OCR required / manual entry: no readable text layer found (scanned copy, image or spreadsheet). Enter key details manually below or paste text.");
    if (category === "Objects Evidence" && fields.quotationAmountCr && fields.quotationHasGstin === false)
      issues.push("Quotation appears to be missing the vendor GSTIN.");
    const docCin = (fields.cin as string | undefined)?.trim().toUpperCase();
    if (establishedCin && docCin && docCin !== establishedCin) {
      issues.push(`This document carries CIN ${docCin}, but this company's CIN is ${establishedCin}, it appears to belong to a different company. Delete it here if it was uploaded by mistake.`);
      warnings.push(`${file.name}: CIN ${docCin} does not match this company (${establishedCin}), flagged as possibly belonging to another company.`);
    }

    // Structural tamper forensics on the raw file bytes.
    const authenticity = analyzeDocumentAuthenticity(file.name, buf, text, pages.length);
    if (authenticity.level === "flag") {
      issues.push("Document authenticity: structural signs of post-creation editing were detected. Verify the original source file before relying on its figures.");
      warnings.push(`${file.name}: authenticity forensics flagged possible post-creation editing.`);
    }

    const doc: DocumentRecord = {
      id: uid("doc"),
      companyId: company.id,
      fileName: file.name,
      fileType: file.name.split(".").pop() ?? "",
      sizeKb: Math.round(buf.length / 1024),
      category,
      linkedSection,
      status: initialStatus(confidence, issues),
      issuesFound: issues,
      uploadedBy,
      lastUpdated: new Date().toISOString().slice(0, 10),
      confidence,
      extractedText: text.slice(0, 6000),
      extractedSummary: summarize(file.name, text, category, fields),
      keyEntities: (fields.rptEntityNames as string[] | undefined)?.slice(0, 5) ?? [],
      keyNumbers: keyNumberBadges(fields),
      fields,
      storedPath,
      authenticity,
    };

    // Re-uploading the same file REPLACES the previous version rather than
    // stacking a duplicate, duplicates produce phantom "same fact, two values"
    // conflicts. Drop the prior document, its chunks and its facts first.
    const priorIds = db.documents
      .filter((d) => d.companyId === company.id && d.fileName === file.name)
      .map((d) => d.id);
    if (priorIds.length) {
      const priorSet = new Set(priorIds);
      for (const p of db.documents.filter((d) => priorSet.has(d.id))) {
        try { if (p.storedPath && fs.existsSync(p.storedPath)) fs.unlinkSync(p.storedPath); } catch { /* ignore */ }
      }
      db.documents = db.documents.filter((d) => !priorSet.has(d.id));
      db.chunks = db.chunks.filter((c) => !priorSet.has(c.documentId));
      db.facts = db.facts.filter((f) => !priorSet.has(f.documentId));
      warnings.push(`${file.name}: replaced an earlier upload of the same file.`);
    }

    db.documents.push(doc);
    created.push(doc);

    const chunks = buildChunks(doc, pages);
    prepared.push({
      doc,
      chunks,
      patternFacts: factsFromFields(doc, pages),
      pageCount: pages.length,
      aiEligible: aiAvailable() && text.trim().length >= 100,
    });
  }

  // ── Phase 2: AI fact extraction across ALL chunks in one bounded pool ─────
  const jobs: ChunkJob[] = [];
  for (const p of prepared) {
    if (!p.aiEligible) {
      // no text layer (or no AI): nothing to send to the model
      for (const c of p.chunks) c.processingStatus = aiAvailable() ? "skipped" : "pending";
      continue;
    }
    for (const c of p.chunks.slice(MAX_AI_CHUNKS_PER_DOC)) c.processingStatus = "skipped";
    for (const chunk of p.chunks.slice(0, MAX_AI_CHUNKS_PER_DOC)) jobs.push({ doc: p.doc, chunk });
  }
  const aiFacts = jobs.length ? await aiFactsForChunkJobs(jobs) : [];
  if (!aiAvailable())
    warnings.push("AI provider not configured, pattern extraction only. Configure GEMINI_API_KEY for full fact extraction.");

  // ── Phase 3: merge pattern + AI facts per document, persist ──────────────
  const aiByDoc = new Map<string, ExtractedFact[]>();
  for (const f of aiFacts) {
    const list = aiByDoc.get(f.documentId) ?? [];
    list.push(f);
    aiByDoc.set(f.documentId, list);
  }
  for (const p of prepared) {
    const facts = mergeFacts([...p.patternFacts, ...(aiByDoc.get(p.doc.id) ?? [])]);
    db.chunks.push(...p.chunks);
    db.facts.push(...facts);
    syncFieldsFromFacts(p.doc, facts);
    p.doc.keyNumbers = keyNumberBadges(p.doc.fields);
    logAudit(db, company.id, uploadedBy, `Uploaded: ${p.doc.fileName}`, "",
      `${p.doc.category} · ${p.pageCount} page(s) · ${p.chunks.length} chunk(s) · ${facts.length} fact(s)`);
  }

  if (aiAvailable() && aiCoolingDown())
    warnings.push("AI provider is rate-limited right now, pattern extraction was used. Re-upload or re-run analysis later (or add more GEMINI_API_KEY_2/3 keys) for full AI fact extraction.");

  // conflicts recomputed company-wide
  db.conflicts = db.conflicts.filter((c) => c.companyId !== company.id);
  db.conflicts.push(...detectConflicts(company.id, companyFacts(db, company.id)));

  // deterministic rule engine
  db.analysis[company.id] = runAnalysis(company, companyDocuments(db, company.id), companyObjects(db, company.id));
  await saveDb(db);

  return NextResponse.json({
    documents: created,
    warnings,
    factsExtracted: db.facts.filter((f) => created.some((d) => d.id === f.documentId)).length,
    conflicts: db.conflicts.filter((c) => c.companyId === company.id).length,
    analysis: db.analysis[company.id],
  });
}
