import { NextRequest, NextResponse } from "next/server";
import { readFileText } from "@/lib/document-processing/read-file";
import { classifyDocument } from "@/lib/document-processing/extract";
import { parseCompanyProfile, type ParseSource } from "@/lib/document-processing/profile-parser";

export const runtime = "nodejs";
export const maxDuration = 120;

const MAX_FILE_MB = 40;

/**
 * Parse promoter-uploaded documents into suggested Company Profile fields.
 *
 * Stateless by design: it reads the files to fill the onboarding form (name,
 * CIN, industry, promoter, issue, governance, year-wise financials…) and
 * returns suggestions with provenance — it does NOT create a company or store
 * the files. The promoter reviews the pre-filled form and saves through the
 * normal flow; formal document upload (with fact extraction + analysis) still
 * happens in the Data Room.
 *
 * Deterministic and AI-free — works without any API key.
 */
export async function POST(req: NextRequest) {
  const form = await req.formData();
  const files = form.getAll("files").filter((f): f is File => f instanceof File);
  if (!files.length) return NextResponse.json({ error: "No files received." }, { status: 400 });

  const sources: ParseSource[] = [];
  const skipped: string[] = [];
  for (const file of files) {
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      skipped.push(`${file.name}: larger than ${MAX_FILE_MB} MB`);
      continue;
    }
    const buf = Buffer.from(await file.arrayBuffer());
    const { text } = await readFileText(file.name, buf);
    const { category } = classifyDocument(file.name, text);
    sources.push({ fileName: file.name, category, text });
  }

  const parsed = parseCompanyProfile(sources);
  return NextResponse.json({ ...parsed, skipped });
}
