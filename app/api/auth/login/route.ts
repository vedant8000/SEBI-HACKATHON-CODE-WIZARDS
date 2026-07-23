import { NextRequest, NextResponse } from "next/server";
import { setSessionCookie } from "@/lib/auth/session";
import { toSessionUser, verifyCredentials } from "@/lib/auth/users";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const email = String(body.email ?? "").trim();
  const password = String(body.password ?? "");
  if (!email || !password)
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });

  const user = await verifyCredentials(email, password);
  if (!user)
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });

  const session = toSessionUser(user);
  await setSessionCookie(session);
  return NextResponse.json({ user: session });
}
