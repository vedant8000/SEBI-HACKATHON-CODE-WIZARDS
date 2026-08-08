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
  ExportLedgerEntry,
  ExtractedFact,
  FactConflict,
  ObjectOfIssue,
} from "./types";
import { computeChainHash } from "./utils/hash-chain";

/**
 * MongoDB-backed datastore. Callers keep the simple load → mutate → save
 * model of the original JSON-file store: `loadDb()` materialises the whole
 * app state from Mongo collections, and `saveDb()` writes back only the
 * top-level keys that actually changed since load (diffed via JSON snapshot).
 *
 * Collections: one per array key (companies, documents, chunks, facts,
 * conflicts, draftSections, objects, auditLog, array order preserved via an
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
  exportLedger: ExportLedgerEntry[]; // tamper-evident export hash-chain
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
  "exportLedger",
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
  exportLedger: [],
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

/**
 * @deprecated Session-blind, returns the global active company regardless of
 * who is asking, which leaks one promoter's data into another's session.
 * Use getActiveCompanyFor(db, sessionUser) instead.
 */
export function getActiveCompany(db: Db): Company | null {
  if (!db.companies.length) return null;
  return db.companies.find((c) => c.id === db.activeCompanyId) ?? db.companies[0];
}

/**
 * The reserved testing account. It must ALWAYS start empty and is wiped on every
 * login (see the login route), so it strictly sees only its own companies —
 * never ownerless/sample data, and never accumulates state across sessions.
 */
export const DEMO_PROMOTER_EMAIL = "promoter@siim.demo";
export const isDemoPromoter = (email: string) => email.trim().toLowerCase() === DEMO_PROMOTER_EMAIL;

/**
 * Companies owned by a promoter account. Companies created before ownership
 * existed (no ownerEmail) stay visible to every promoter until backfilled —
 * EXCEPT for the demo testing account, which is scoped strictly to its own
 * companies so seeded/ownerless data never leaks into a clean test session.
 */
export function promoterCompanies(db: Db, ownerEmail: string): Company[] {
  const email = ownerEmail.trim().toLowerCase();
  if (isDemoPromoter(email)) {
    return db.companies.filter((c) => c.ownerEmail?.toLowerCase() === email);
  }
  return db.companies.filter((c) => !c.ownerEmail || c.ownerEmail.toLowerCase() === email);
}

/**
 * Delete a set of companies and everything attached to them (documents, chunks,
 * facts, conflicts, draft sections, banker flags, objects, analysis, audit log
 * and export ledger). Clears the active company if it was among them. Caller
 * must saveDb(). Shared by the reset route and the demo login wipe.
 */
export function purgeCompanyIds(db: Db, ids: Set<string>): number {
  if (!ids.size) return 0;
  db.companies = db.companies.filter((c) => !ids.has(c.id));
  db.documents = db.documents.filter((d) => !ids.has(d.companyId));
  db.chunks = db.chunks.filter((c) => !ids.has(c.companyId));
  db.facts = db.facts.filter((f) => !ids.has(f.companyId));
  db.conflicts = db.conflicts.filter((c) => !ids.has(c.companyId));
  db.draftSections = db.draftSections.filter((s) => !ids.has(s.companyId));
  db.flags = db.flags.filter((f) => !ids.has(f.companyId));
  db.auditLog = db.auditLog.filter((a) => !ids.has(a.companyId));
  db.exportLedger = db.exportLedger.filter((e) => !ids.has(e.companyId));
  for (const id of ids) {
    delete db.objectsByCompany[id];
    delete db.analysis[id];
  }
  if (db.activeCompanyId && ids.has(db.activeCompanyId)) db.activeCompanyId = null;
  return ids.size;
}

/**
 * The company THIS session should see: the promoter's own companies, or the
 * banker's code-linked companies. The global activeCompanyId only picks among
 * companies already in the caller's scope, never someone else's.
 */
export function getActiveCompanyFor(
  db: Db,
  user: { email: string; role: string }
): Company | null {
  const scope =
    user.role === "MERCHANT_BANKER" ? bankerCompanies(db, user.email) : promoterCompanies(db, user.email);
  if (!scope.length) return null;
  return scope.find((c) => c.id === db.activeCompanyId) ?? scope[0];
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

/** A company's export ledger, oldest → newest (sequence order). */
export function companyExportLedger(db: Db, companyId: string): ExportLedgerEntry[] {
  return db.exportLedger.filter((e) => e.companyId === companyId).sort((a, b) => a.seq - b.seq);
}

/**
 * Append a tamper-evident export entry for a company, chaining it to that
 * company's previous export. Returns the new entry. Caller must saveDb().
 */
export function appendExportLedger(
  db: Db,
  entry: { companyId: string; artefact: string; user: string; readinessScore: number | null; contentHash: string }
): ExportLedgerEntry {
  const prior = companyExportLedger(db, entry.companyId);
  const prev = prior[prior.length - 1];
  const seq = prior.length + 1;
  const prevHash = prev ? prev.chainHash : "GENESIS";
  const timestamp = new Date().toISOString();
  const chainHash = computeChainHash({ seq, artefact: entry.artefact, contentHash: entry.contentHash, prevHash, timestamp });
  const e: ExportLedgerEntry = {
    id: uid("el"), companyId: entry.companyId, seq, artefact: entry.artefact,
    user: entry.user, readinessScore: entry.readinessScore, contentHash: entry.contentHash,
    prevHash, chainHash, timestamp,
  };
  db.exportLedger.push(e);
  if (db.exportLedger.length > 1000) db.exportLedger.splice(0, db.exportLedger.length - 1000);
  return e;
}
