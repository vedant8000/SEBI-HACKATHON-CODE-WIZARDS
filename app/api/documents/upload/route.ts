import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import {
  loadDb, saveDb, uid, logAudit, UPLOADS_DIR, getActiveCompany,
  companyDocuments, companyObjects, companyFacts,
} from "@/lib/store";
import { readFileText } from "@/lib/document-processing/read-file";
import {
  classifyDocument, extractFields, extractionConfidence,
  initialStatus, keyNumberBadges, summarize,
} from "@/lib/document-processing/extract";
import {
  aiFactsForDocument, buildChunks, detectConflicts, factsFromFields,
  mergeFacts, syncFieldsFromFacts,
} from "@/lib/document-processing/facts";
import { aiAvailable, aiCoolingDown, classifyDocumentAI } from "@/lib/ai/provider";
import { runAnalysis } from "@/lib/engine/analysis";
import type { DocumentRecord } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 300;

const MAX_FILE_MB = 40;

/**
 * Upload pipeline (upload-driven, no seeded output):
 *  1. store file  2. extract text page-wise  3. build chunks
 *  4. classify (AI when configured, keyword fallback)
 *  5. pattern facts + AI chunk-wise facts, merged with provenance
 *  6. conflict detection  7. deterministic rule engine re-run
 */
export async function POST(req: NextRequest) {
  const db = await loadDb();
  const company = getActiveCompany(db);
  if (!company) return NextResponse.json({ error: "Create a company profile first." }, { status: 400 });

  const form = await req.formData();
  const files = form.getAll("files").filter((f): f is File => f instanceof File);
  if (!files.length) return NextResponse.json({ error: "No files received." }, { status: 400 });

  const uploadedBy = (form.get("uploadedBy") as string) || company.promoterName || "Promoter";
  const companyDir = path.join(UPLOADS_DIR, company.id);
  if (!fs.existsSync(companyDir)) fs.mkdirSync(companyDir, { recursive: true });

  const created: DocumentRecord[] = [];
  const warnings: string[] = [];

  for (const file of files) {
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      warnings.push(`${file.name}: larger than ${MAX_FILE_MB} MB — please split the file and re-upload.`);
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
      extractedText: text.slice(0, 20000),
      extractedSummary: summarize(file.name, text, category, fields),
      keyEntities: (fields.rptEntityNames as string[] | undefined)?.slice(0, 5) ?? [],
      keyNumbers: keyNumberBadges(fields),
      fields,
      storedPath,
    };
    db.documents.push(doc);
    created.push(doc);

    // chunks + facts
    const chunks = buildChunks(doc, pages);
    let facts = factsFromFields(doc, pages);
    if (aiAvailable() && text.trim().length >= 100) {
      const aiFacts = await aiFactsForDocument(doc, chunks);
      facts = mergeFacts([...facts, ...aiFacts]);
    } else {
      for (const c of chunks) c.processingStatus = aiAvailable() ? "skipped" : "pending";
      if (!aiAvailable()) warnings.push("AI provider not configured — pattern extraction only. Configure GEMINI_API_KEY for full fact extraction.");
    }
    db.chunks.push(...chunks);
    db.facts.push(...facts);
    syncFieldsFromFacts(doc, facts);
    doc.keyNumbers = keyNumberBadges(doc.fields);

    logAudit(db, company.id, uploadedBy, `Uploaded: ${file.name}`, "",
      `${category} · ${pages.length} page(s) · ${chunks.length} chunk(s) · ${facts.length} fact(s)`);
  }

  if (aiAvailable() && aiCoolingDown())
    warnings.push("AI provider is rate-limited right now — pattern extraction was used. Re-upload or re-run analysis later (or add more GEMINI_API_KEY_2/3 keys) for full AI fact extraction.");

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
