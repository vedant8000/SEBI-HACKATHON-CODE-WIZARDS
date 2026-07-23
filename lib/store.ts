import fs from "fs";
import os from "os";
import path from "path";
import type {
  AnalysisResult,
  AuditLogEntry,
  Company,
  DocumentChunk,
  DocumentRecord,
  DraftSection,
  ExtractedFact,
  FactConflict,
  ObjectOfIssue,
} from "./types";

/**
 * Lightweight JSON-file datastore. Keeps the MVP runnable with one command
 * (no external DB), while persisting uploads and analysis across restarts.
 * Swap for Prisma/Postgres in production without changing callers.
 */

export interface Db {
  activeCompanyId: string | null;
  companies: Company[];
  documents: DocumentRecord[];
  chunks: DocumentChunk[];
  facts: ExtractedFact[];
  conflicts: FactConflict[];
  draftSections: DraftSection[];
  objects: ObjectOfIssue[]; // carries companyId via key prefix in id: `${companyId}:{n}`
  objectsByCompany: Record<string, ObjectOfIssue[]>;
  analysis: Record<string, AnalysisResult>;
  auditLog: AuditLogEntry[];
}

/**
 * Vercel's serverless filesystem is read-only outside /tmp, so on Vercel we
 * write there instead. /tmp doesn't persist across cold starts or multiple
 * instances — fine for a live demo, not a substitute for a real database.
 */
const DATA_DIR = process.env.VERCEL
  ? path.join(os.tmpdir(), "ipo-saathi-data")
  : path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "db.json");
export const UPLOADS_DIR = path.join(DATA_DIR, "uploads");

const emptyDb: Db = {
  activeCompanyId: null,
  companies: [],
  documents: [],
  chunks: [],
  facts: [],
  conflicts: [],
  draftSections: [],
  objects: [],
  objectsByCompany: {},
  analysis: {},
  auditLog: [],
};

function ensureDirs() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

export function loadDb(): Db {
  ensureDirs();
  if (!fs.existsSync(DB_FILE)) return structuredClone(emptyDb);
  try {
    const raw = fs.readFileSync(DB_FILE, "utf-8");
    return { ...structuredClone(emptyDb), ...JSON.parse(raw) };
  } catch {
    return structuredClone(emptyDb);
  }
}

export function saveDb(db: Db) {
  ensureDirs();
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf-8");
}

export function uid(prefix = ""): string {
  return prefix + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

export function getActiveCompany(db: Db): Company | null {
  if (!db.companies.length) return null;
  return db.companies.find((c) => c.id === db.activeCompanyId) ?? db.companies[0];
}

export function companyDocuments(db: Db, companyId: string): DocumentRecord[] {
  return db.documents.filter((d) => d.companyId === companyId);
}

export function companyDraft(db: Db, companyId: string): DraftSection[] {
  return db.draftSections.filter((s) => s.companyId === companyId);
}

export function companyObjects(db: Db, companyId: string): ObjectOfIssue[] {
  return db.objectsByCompany[companyId] ?? [];
}

export function companyFacts(db: Db, companyId: string): ExtractedFact[] {
  return db.facts.filter((f) => f.companyId === companyId);
}

export function companyChunks(db: Db, companyId: string): DocumentChunk[] {
  return db.chunks.filter((c) => c.companyId === companyId);
}

export function companyConflicts(db: Db, companyId: string): FactConflict[] {
  return db.conflicts.filter((c) => c.companyId === companyId);
}

export function logAudit(
  db: Db,
  companyId: string,
  user: string,
  action: string,
  oldValue = "",
  newValue = ""
) {
  db.auditLog.unshift({
    id: uid("a"),
    companyId,
    user,
    action,
    oldValue,
    newValue,
    timestamp: new Date().toISOString(),
  });
  if (db.auditLog.length > 500) db.auditLog.length = 500;
}
