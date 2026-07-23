/**
 * SEED — migrate the local JSON datastore (data/db.json) into MongoDB and
 * create the demo login accounts.
 *
 * Usage:
 *   node scripts/seed-mongo.mjs            # requires MONGODB_URI in .env.local
 *   node scripts/seed-mongo.mjs --wipe     # also clears collections absent from db.json
 *
 * Demo accounts created (password: Demo@123):
 *   promoter@siim.demo  — SME Promoter
 *   banker@siim.demo    — Merchant Banker
 *
 * Collection layout mirrors lib/store.ts: one collection per top-level array
 * (order preserved via `_i`), `objectsByCompany`/`analysis` one doc per
 * company, `meta` for activeCompanyId, plus `users` for auth.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { MongoClient } from "mongodb";
import bcrypt from "bcryptjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

// ── load .env.local (no dotenv dependency) ──────────────────────────────────
for (const file of [".env.local", ".env"]) {
  const p = path.join(root, file);
  if (!fs.existsSync(p)) continue;
  for (const line of fs.readFileSync(p, "utf-8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("❌ MONGODB_URI is not set. Add it to .env.local first.");
  process.exit(1);
}
const dbName = process.env.MONGODB_DB || "siim";

// ── read the JSON store ─────────────────────────────────────────────────────
const dbFile = path.join(root, "data", "db.json");
const json = fs.existsSync(dbFile) ? JSON.parse(fs.readFileSync(dbFile, "utf-8")) : {};
const ARRAY_KEYS = ["companies", "documents", "chunks", "facts", "conflicts", "draftSections", "objects", "auditLog"];

const DEMO_USERS = [
  { name: "Demo Promoter", email: "promoter@siim.demo", role: "PROMOTER" },
  { name: "Demo Banker", email: "banker@siim.demo", role: "MERCHANT_BANKER" },
];
const DEMO_PASSWORD = "Demo@123";

const uid = (prefix = "") =>
  prefix + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

const client = new MongoClient(uri);
try {
  await client.connect();
  const db = client.db(dbName);
  console.log(`Connected to ${dbName} @ ${uri.replace(/\/\/[^@]*@/, "//***@")}\n`);

  // meta singleton
  await db.collection("meta").updateOne(
    { _id: "app" },
    { $set: { activeCompanyId: json.activeCompanyId ?? null } },
    { upsert: true }
  );
  console.log(`  meta.activeCompanyId = ${json.activeCompanyId ?? null}`);

  // array collections (order preserved via _i)
  for (const key of ARRAY_KEYS) {
    const items = Array.isArray(json[key]) ? json[key] : [];
    const col = db.collection(key);
    await col.deleteMany({});
    if (items.length) await col.insertMany(items.map((item, _i) => ({ ...item, _i })));
    console.log(`  ${key}: ${items.length} docs`);
  }

  // objectsByCompany / analysis — one doc per company
  const byCompany = Object.entries(json.objectsByCompany ?? {}).map(([companyId, items]) => ({ companyId, items }));
  await db.collection("objectsByCompany").deleteMany({});
  if (byCompany.length) await db.collection("objectsByCompany").insertMany(byCompany);
  console.log(`  objectsByCompany: ${byCompany.length} docs`);

  const analysis = Object.entries(json.analysis ?? {}).map(([companyId, result]) => ({ companyId, result }));
  await db.collection("analysis").deleteMany({});
  if (analysis.length) await db.collection("analysis").insertMany(analysis);
  console.log(`  analysis: ${analysis.length} docs`);

  // demo users (upsert by email — reseeding resets their passwords)
  const users = db.collection("users");
  await users.createIndex({ email: 1 }, { unique: true });
  for (const u of DEMO_USERS) {
    await users.updateOne(
      { email: u.email },
      {
        $set: { name: u.name, role: u.role, passwordHash: await bcrypt.hash(DEMO_PASSWORD, 10) },
        $setOnInsert: { id: uid("u"), email: u.email, createdAt: new Date().toISOString() },
      },
      { upsert: true }
    );
    console.log(`  user: ${u.email} (${u.role})`);
  }

  console.log(`\n✅ Seed complete. Demo logins (password: ${DEMO_PASSWORD}):`);
  for (const u of DEMO_USERS) console.log(`   ${u.email}`);
} finally {
  await client.close();
}
