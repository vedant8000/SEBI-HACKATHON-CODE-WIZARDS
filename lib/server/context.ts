import {
  companyConflicts, companyDocuments, companyDraft, companyFacts, companyFlags,
  companyObjects, getActiveCompany, loadDb, type Db,
} from "../store";
import { buildCoverage } from "../engine/coverage";
import type {
  AnalysisResult, BankerFlag, Company, CoverageRow, DocumentRecord, DraftSection,
  ExtractedFact, FactConflict, ObjectOfIssue,
} from "../types";

export interface AppContext {
  db: Db;
  company: Company | null;
  docs: DocumentRecord[];
  objects: ObjectOfIssue[];
  draft: DraftSection[];
  analysis: AnalysisResult | null;
  facts: ExtractedFact[];
  conflicts: FactConflict[];
  coverage: CoverageRow[];
  flags: BankerFlag[];
}

/** Everything the app knows about ONE company — shared by promoter & banker views. */
export function composeCompanyContext(db: Db, company: Company | null): AppContext {
  if (!company)
    return {
      db, company: null, docs: [], objects: [], draft: [], analysis: null,
      facts: [], conflicts: [], coverage: [], flags: [],
    };
  const docs = companyDocuments(db, company.id);
  const objects = companyObjects(db, company.id);
  const facts = companyFacts(db, company.id);
  const analysis = db.analysis[company.id] ?? null;
  return {
    db,
    company,
    docs,
    objects,
    draft: companyDraft(db, company.id),
    analysis,
    facts,
    conflicts: companyConflicts(db, company.id),
    coverage: buildCoverage(company, docs, facts, objects, analysis?.gaps ?? []),
    flags: companyFlags(db, company.id),
  };
}

/** One-stop context for server components & routes. Always fresh from MongoDB. */
export async function getContext(): Promise<AppContext> {
  const db = await loadDb();
  return composeCompanyContext(db, getActiveCompany(db));
}
