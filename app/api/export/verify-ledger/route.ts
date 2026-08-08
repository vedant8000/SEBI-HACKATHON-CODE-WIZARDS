import { NextResponse } from "next/server";
import { getContext } from "@/lib/server/context";
import { companyExportLedger } from "@/lib/store";
import { verifyLedger } from "@/lib/utils/hash-chain";

/**
 * Verify a company's tamper-evident export ledger. Recomputes every entry's
 * chainHash from its stored fields and checks the linkage (each entry chains to
 * the previous, sequence increments by one). Anyone holding the exported pack's
 * `integrity.ledger.chain` can run the same check offline, this endpoint is the
 * in-app equivalent for the promoter, merchant banker and supervisor.
 */
export async function GET() {
  const { company, db } = await getContext();
  if (!company) {
    return NextResponse.json({ error: "No active company in scope." }, { status: 404 });
  }

  const entries = companyExportLedger(db, company.id);
  const result = verifyLedger(entries);

  return NextResponse.json({
    issuer: company.name,
    algorithm: "sha256",
    exports: entries.length,
    intact: result.intact,
    brokenAt: result.brokenAt,
    reason: result.reason,
    ledger: entries.map((e) => ({
      seq: e.seq,
      artefact: e.artefact,
      timestamp: e.timestamp,
      exportedBy: e.user,
      readinessScore: e.readinessScore,
      contentHash: e.contentHash,
      prevHash: e.prevHash,
      chainHash: e.chainHash,
    })),
    note:
      "Proves the export history is intact and correctly sequenced (no alteration, reordering or deletion). It does not prove signer identity, that requires cryptographic signing.",
    disclaimer:
      "SIIM preparation artefact, not a regulatory submission or a legal certificate of authenticity.",
  });
}
