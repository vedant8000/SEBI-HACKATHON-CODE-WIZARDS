import { NextResponse } from "next/server";
import { getContext } from "@/lib/server/context";

/** Due Diligence Evidence Pack as JSON: documents, extracted fields, links to draft sections. */
export async function GET() {
  const { company, docs, draft, analysis } = getContext();
  const pack = {
    generatedAt: new Date().toISOString(),
    disclaimer:
      "AI-assisted evidence pack for merchant banker due diligence. Not legal, investment, accounting or regulatory advice.",
    company: company ? { name: company.name, cin: company.cin, industry: company.industry } : null,
    readiness: analysis?.scores ?? null,
    documents: docs.map((d) => ({
      fileName: d.fileName, category: d.category, linkedSection: d.linkedSection,
      status: d.status, confidence: d.confidence, issuesFound: d.issuesFound,
      extractedFields: d.fields, uploadedBy: d.uploadedBy, lastUpdated: d.lastUpdated,
    })),
    draftSections: draft.map((s) => ({
      sectionName: s.sectionName, status: s.status, confidence: s.confidence,
      sources: s.sources, missingData: s.missingData,
      comments: s.comments,
    })),
    gaps: analysis?.gaps ?? [],
    rptRisks: analysis?.rptRisks ?? [],
    financialChecks: analysis?.financialChecks ?? [],
  };
  return new NextResponse(JSON.stringify(pack, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="evidence-pack.json"`,
    },
  });
}
