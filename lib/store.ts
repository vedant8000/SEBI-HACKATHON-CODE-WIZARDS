import fs from "fs";
import os from "os";
import path from "path";
import type { Document } from "mongodb";
import { getMongoDb } from "./mongodb";
import type {
  AnalysisResult,
  AuditLogEntry,
  BankerFlag,
  Company,
  DocumentChunk,
  DocumentRecord,
  DraftSection,
  ExtractedFact,
  FactConflict,
  ObjectOfIssue,
} from "./types";

/**
 * MongoDB-backed datastore. Callers keep the simple load → mutate → save
 * model of the original JSON-file store: `loadDb()` materialises the whole
 * app state from Mongo collections, and `saveDb()` writes back only the
 * top-level keys that actually changed since load (diffed via JSON snapshot).
 *
 * Collections: one per array key (companies, documents, chunks, facts,
 * conflicts, draftSections, objects, auditLog — array order preserved via an
 * internal `_i` field), `objectsByCompany` / `analysis` as one doc per
 * company, and `meta` for the activeCompanyId singleton. Auth users live in
 * a separate `users` collection managed by lib/auth.ts.
 */

export interface Db {
  activeCompanyId: string | null;
  companies: Company[];
  documents: DocumentRecord[];
  chunks: DocumentChunk[];
  facts: ExtractedFact[];
  conflicts: FactConflict[];
  draftSections: DraftSection[];
  flags: BankerFlag[]; // merchant banker correction flags
  objects: ObjectOfIssue[]; // carries companyId via key prefix in id: `${companyId}:{n}`
  objectsByCompany: Record<string, ObjectOfIssue[]>;
  analysis: Record<string, AnalysisResult>;
  auditLog: AuditLogEntry[];
}

/**
 * Uploaded files still live on disk (Vercel: /tmp). Only structured state
 * moved to MongoDB.
 */
const DATA_DIR = process.env.VERCEL
  ? path.join(os.tmpdir(), "ipo-saathi-data")
  : path.join(process.cwd(), "data");
export const UPLOADS_DIR = path.join(DATA_DIR, "uploads");

export function ensureUploadsDir() {
  if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const ARRAY_KEYS = [
  "companies",
  "documents",
  "chunks",
  "facts",
  "conflicts",
  "draftSections",
  "flags",
  "objects",
  "auditLog",
] as const;

const emptyDb: Db = {
  activeCompanyId: null,
  companies: [],
  documents: [],
  chunks: [],
  facts: [],
  conflicts: [],
  draftSections: [],
  flags: [],
  objects: [],
  objectsByCompany: {},
  analysis: {},
  auditLog: [],
};

/** JSON snapshot of each top-level key at load time, used to diff on save. */
const snapshots = new WeakMap<Db, Record<string, string>>();

function takeSnapshot(db: Db) {
  const snap: Record<string, string> = {};
  for (const key of Object.keys(emptyDb) as (keyof Db)[]) {
    snap[key] = JSON.stringify(db[key]);
  }
  snapshots.set(db, snap);
}

export async function loadDb(): Promise<Db> {
  const mongo = await getMongoDb();
  const db = structuredClone(emptyDb);

  const [meta, byCompany, analysisDocs, ...arrays] = await Promise.all([
    mongo.collection("meta").findOne({ _id: "app" } as Document),
    mongo.collection("objectsByCompany").find({}, { projection: { _id: 0 } }).toArray(),
    mongo.collection("analysis").find({}, { projection: { _id: 0 } }).toArray(),
    ...ARRAY_KEYS.map((key) =>
      mongo
        .collection(key)
        .find({}, { projection: { _id: 0 } })
        .sort({ _i: 1 })
        .toArray()
    ),
  ]);

  db.activeCompanyId = (meta?.activeCompanyId as string | null) ?? null;
  for (const doc of byCompany) {
    db.objectsByCompany[doc.companyId as string] = doc.items as ObjectOfIssue[];
  }
  for (const doc of analysisDocs) {
    db.analysis[doc.companyId as string] = doc.result as AnalysisResult;
  }
  ARRAY_KEYS.forEach((key, idx) => {
    (db[key] as unknown[]) = arrays[idx].map((doc) => {
      delete (doc as { _i?: number })._i;
      return doc;
    });
  });

  takeSnapshot(db);
  return db;
}

export async function saveDb(db: Db) {
  const mongo = await getMongoDb();
  const snap = snapshots.get(db) ?? {};
  const writes: Promise<unknown>[] = [];

  const changed = (key: keyof Db) => JSON.stringify(db[key]) !== snap[key];

  if (changed("activeCompanyId")) {
    writes.push(
      mongo
        .collection("meta")
        .updateOne(
          { _id: "app" } as Document,
          { $set: { activeCompanyId: db.activeCompanyId } },
          { upsert: true }
        )
    );
  }

  for (const key of ARRAY_KEYS) {
    if (!changed(key)) continue;
    const items = db[key].map((item, _i) => ({ ...item, _i }));
    writes.push(
      (async () => {
        const col = mongo.collection(key);
        await col.deleteMany({});
        if (items.length) await col.insertMany(items as Document[]);
      })()
    );
  }

  if (changed("objectsByCompany")) {
    writes.push(
      (async () => {
        const col = mongo.collection("objectsByCompany");
        await col.deleteMany({});
        const docs = Object.entries(db.objectsByCompany).map(([companyId, items]) => ({
          companyId,
          items,
        }));
        if (docs.length) await col.insertMany(docs as Document[]);
      })()
    );
  }

  if (changed("analysis")) {
    writes.push(
      (async () => {
        const col = mongo.collection("analysis");
        await col.deleteMany({});
        const docs = Object.entries(db.analysis).map(([companyId, result]) => ({
          companyId,
          result,
        }));
        if (docs.length) await col.insertMany(docs as Document[]);
      })()
    );
  }

  await Promise.all(writes);
  takeSnapshot(db);
}

export function uid(prefix = ""): string {
  return prefix + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

/** Share code the promoter gives their merchant banker, e.g. "SIIM-7K2M4X". */
export function genCompanyCode(taken: Set<string>): string {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no 0/O/1/I/L
  for (;;) {
    let code = "SIIM-";
    for (let i = 0; i < 6; i++) code += alphabet[Math.floor(Math.random() * alphabet.length)];
    if (!taken.has(code)) return code;
  }
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

export function companyFlags(db: Db, companyId: string): BankerFlag[] {
  return db.flags.filter((f) => f.companyId === companyId);
}

/** Companies a merchant banker has linked to by entering their company code. */
export function bankerCompanies(db: Db, bankerEmail: string): Company[] {
  const email = bankerEmail.trim().toLowerCase();
  return db.companies.filter((c) => (c.bankerEmails ?? []).includes(email));
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
