import { NextRequest, NextResponse } from "next/server";
import { setSessionCookie } from "@/lib/auth/session";
import { toSessionUser, verifyCredentials } from "@/lib/auth/users";
import { DEMO_PROMOTER_EMAIL, isDemoPromoter, loadDb, promoterCompanies, purgeCompanyIds, saveDb } from "@/lib/store";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const email = String(body.email ?? "").trim();
  const password = String(body.password ?? "");
  if (!email || !password)
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });

  const user = await verifyCredentials(email, password);
  if (!user)
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });

  // The demo testing account must be pristine on every login: wipe anything it
  // created in a previous session so it always starts from a clean, empty state.
  if (isDemoPromoter(user.email)) {
    const db = await loadDb();
    const ids = new Set(promoterCompanies(db, DEMO_PROMOTER_EMAIL).map((c) => c.id));
    if (ids.size) {
      purgeCompanyIds(db, ids);
      await saveDb(db);
    }
  }

  const session = toSessionUser(user);
  await setSessionCookie(session);
  return NextResponse.json({ user: session });
}
