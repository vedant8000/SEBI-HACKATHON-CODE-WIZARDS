import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { indiaStackPrefill } from "@/lib/integrations/india-stack";

/**
 * India-Stack auto-population endpoint (simulated connectors).
 * POST { cin?, gstin?, name? } → a ParsedProfile-compatible payload the
 * onboarding form merges into its fields, plus the list of source systems that
 * responded. Session-guarded like the rest of the app.
 */
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  // brief simulated latency so the "fetching from government systems" UX reads true
  await new Promise((r) => setTimeout(r, 600));

  const result = indiaStackPrefill({
    cin: typeof body.cin === "string" ? body.cin : undefined,
    gstin: typeof body.gstin === "string" ? body.gstin : undefined,
    name: typeof body.name === "string" ? body.name : undefined,
  });
  return NextResponse.json(result);
}
