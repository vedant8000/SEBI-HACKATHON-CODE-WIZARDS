import {
  companyConflicts, companyDocuments, companyDraft, companyFacts, companyFlags,
  companyObjects, getActiveCompanyFor, loadDb, type Db,
} from "../store";
import { getSessionUser } from "../auth/session";
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

/** Everything the app knows about ONE company, shared by promoter & banker views. */
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

/**
 * One-stop context for server components & routes, always fresh from MongoDB
 * and ALWAYS scoped to the logged-in user: a promoter sees only their own
 * companies, a banker only code-linked ones. No session → no company.
 */
export async function getContext(): Promise<AppContext> {
  const db = await loadDb();
  const user = await getSessionUser();
  return composeCompanyContext(db, user ? getActiveCompanyFor(db, user) : null);
}
