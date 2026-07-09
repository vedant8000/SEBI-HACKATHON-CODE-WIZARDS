import { NextRequest, NextResponse } from "next/server";
import {
  loadDb, saveDb, logAudit, getActiveCompany,
  companyDocuments, companyObjects, companyFacts,
} from "@/lib/store";
import { blueprintByName, generateBlueprintSection } from "@/lib/engine/draft";
import { aiAvailable, AI_SETUP_MESSAGE } from "@/lib/ai/provider";

export const maxDuration = 120;

/** POST { sectionName } → (re)generate one blueprint section. PATCH → edit. */
export async function POST(req: NextRequest) {
  const { sectionName } = await req.json();
  const db = loadDb();
  const company = getActiveCompany(db);
  if (!company) return NextResponse.json({ error: "No company" }, { status: 400 });
  if (!aiAvailable()) return NextResponse.json({ error: AI_SETUP_MESSAGE }, { status: 400 });
  const bp = blueprintByName(sectionName);
  if (!bp) return NextResponse.json({ error: "Unknown section" }, { status: 400 });

  const section = await generateBlueprintSection(
    bp, company,
    companyDocuments(db, company.id),
    companyFacts(db, company.id),
    companyObjects(db, company.id),
    db.analysis[company.id] ?? null
  );
  const idx = db.draftSections.findIndex((s) => s.companyId === company.id && s.sectionName === sectionName);
  if (idx >= 0) {
    section.comments = db.draftSections[idx].comments;
    db.draftSections[idx] = section;
  } else db.draftSections.push(section);
  logAudit(db, company.id, "System", `Section regenerated: ${sectionName}`);
  saveDb(db);
  return NextResponse.json({ section });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const db = loadDb();
  const section = db.draftSections.find((s) => s.id === body.id);
  if (!section) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const oldStatus = section.status;
  if (typeof body.text === "string") section.generatedText = body.text;
  if (body.status) section.status = body.status;
  section.updatedAt = new Date().toISOString();
  logAudit(db, section.companyId, body.user ?? "Promoter",
    body.status ? `Section status: ${section.sectionName}` : `Section edited: ${section.sectionName}`,
    oldStatus, body.status ?? "content edited");
  saveDb(db);
  return NextResponse.json({ section });
}
