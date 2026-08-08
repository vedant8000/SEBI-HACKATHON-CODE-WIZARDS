import { createHash } from "crypto";
import type { ExportLedgerEntry } from "../types";

/**
 * Tamper-evident hash-chain primitives for the export ledger.
 *
 * A single content hash proves one file was not altered. A CHAIN proves the
 * whole export HISTORY is intact: each entry's chainHash binds its contentHash
 * to the previous entry's chainHash, so any alteration, reordering or deletion
 * of a prior export makes every later chainHash fail to recompute.
 *
 * This proves integrity + sequence, NOT signer identity, non-repudiation would
 * require cryptographic signing with a promoter/banker key (a natural next step).
 */

export const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

/** Deterministic hash binding an entry's fields to the previous chainHash. */
export function computeChainHash(f: {
  seq: number; artefact: string; contentHash: string; prevHash: string; timestamp: string;
}): string {
  return sha256(`${f.seq}|${f.artefact}|${f.contentHash}|${f.prevHash}|${f.timestamp}`);
}

export interface LedgerVerification {
  intact: boolean;
  count: number;
  /** 1-based seq of the first entry whose hash or linkage failed, else null. */
  brokenAt: number | null;
  reason: string | null;
}

/**
 * Recompute every entry's chainHash from its stored fields and verify the
 * linkage (each entry's prevHash equals the prior entry's chainHash, and the
 * sequence increments by one). Entries must be passed sorted by seq ascending.
 */
export function verifyLedger(entries: ExportLedgerEntry[]): LedgerVerification {
  let prevHash = "GENESIS";
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    if (e.seq !== i + 1)
      return { intact: false, count: entries.length, brokenAt: e.seq, reason: `Sequence gap at entry ${e.seq}, an export appears inserted or removed.` };
    if (e.prevHash !== prevHash)
      return { intact: false, count: entries.length, brokenAt: e.seq, reason: `Broken linkage at entry ${e.seq}, it does not chain to the previous export.` };
    const recomputed = computeChainHash({ seq: e.seq, artefact: e.artefact, contentHash: e.contentHash, prevHash: e.prevHash, timestamp: e.timestamp });
    if (recomputed !== e.chainHash)
      return { intact: false, count: entries.length, brokenAt: e.seq, reason: `Hash mismatch at entry ${e.seq}, its recorded fields were altered after export.` };
    prevHash = e.chainHash;
  }
  return { intact: true, count: entries.length, brokenAt: null, reason: null };
}
