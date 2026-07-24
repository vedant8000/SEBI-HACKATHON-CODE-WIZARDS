import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import { bankerCompanies, loadDb } from "@/lib/store";
import { getSessionUser } from "@/lib/auth/session";

export const runtime = "nodejs";

const CONTENT_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  txt: "text/plain; charset=utf-8",
  csv: "text/csv; charset=utf-8",
  md: "text/plain; charset=utf-8",
  json: "application/json",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
};

/**
 * GET ?id=<documentId> — stream the stored upload for in-browser viewing.
 * Promoters can open any document of theirs; merchant bankers only documents
 * of companies they have linked to via the company code.
 */
export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const id = req.nextUrl.searchParams.get("id");
  const db = await loadDb();
  const doc = db.documents.find((d) => d.id === id);
  if (!doc) return NextResponse.json({ error: "Document not found." }, { status: 404 });

  if (user.role === "MERCHANT_BANKER") {
    const linked = bankerCompanies(db, user.email).some((c) => c.id === doc.companyId);
    if (!linked) return NextResponse.json({ error: "You are not linked to this company." }, { status: 403 });
  }

  if (!doc.storedPath || !fs.existsSync(doc.storedPath))
    return NextResponse.json(
      { error: "The stored file is no longer available on this server (uploads are ephemeral on serverless hosting). The extracted text and facts remain available." },
      { status: 410 }
    );

  const buf = fs.readFileSync(doc.storedPath);
  const ext = doc.fileName.split(".").pop()?.toLowerCase() ?? "";
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": CONTENT_TYPES[ext] ?? "application/octet-stream",
      "Content-Disposition": `inline; filename="${doc.fileName.replace(/[^\w.\- ()]/g, "_")}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
