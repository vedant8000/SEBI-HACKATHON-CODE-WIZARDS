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
 * Datastore with two backends behind one async interface:
 *  - Upstash Redis (REST) when UPSTASH_REDIS_REST_URL/TOKEN are set — required
 *    on serverless hosts like Vercel, where each function instance has its own
 *    isolated /tmp and a file store would split-brain across routes.
 *  - JSON file locally (zero setup, durable across restarts).
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

// ── Upstash Redis backend (serverless-safe shared store) ───────────────────
// Accepts both naming schemes: UPSTASH_REDIS_REST_* (direct Upstash) and
// KV_REST_API_* (Vercel Marketplace "Upstash for Redis" integration).
const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
const REDIS_KEY = "siim:db";
const usingRedis = () => !!(REDIS_URL && REDIS_TOKEN);

async function redisLoad(): Promise<Db> {
  const res = await fetch(`${REDIS_URL}/get/${REDIS_KEY}`, {
    headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
    cache: "no-store",
  });
  if (!res.ok) return structuredClone(emptyDb);
  const data = await res.json();
  if (!data?.result) return structuredClone(emptyDb);
  try {
    return { ...structuredClone(emptyDb), ...JSON.parse(data.result) };
  } catch {
    return structuredClone(emptyDb);
  }
}

async function redisSave(db: Db) {
  const res = await fetch(REDIS_URL!, {
    method: "POST",
    headers: { Authorization: `Bearer ${REDIS_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(["SET", REDIS_KEY, JSON.stringify(db)]),
  });
  if (!res.ok) console.error(`[store] redis save failed: ${res.status} ${(await res.text()).slice(0, 200)}`);
}

export async function loadDb(): Promise<Db> {
  if (usingRedis()) return redisLoad();
  ensureDirs();
  if (!fs.existsSync(DB_FILE)) return structuredClone(emptyDb);
  try {
    const raw = fs.readFileSync(DB_FILE, "utf-8");
    return { ...structuredClone(emptyDb), ...JSON.parse(raw) };
  } catch {
    return structuredClone(emptyDb);
  }
}

export async function saveDb(db: Db) {
  if (usingRedis()) return redisSave(db);
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
