import { NextRequest, NextResponse } from "next/server";
import { setSessionCookie } from "@/lib/auth/session";
import { createUser, findUserByEmail, toSessionUser } from "@/lib/auth/users";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const name = String(body.name ?? "").trim();
  const email = String(body.email ?? "").trim();
  const password = String(body.password ?? "");
  const role = body.role === "MERCHANT_BANKER" ? "MERCHANT_BANKER" : "PROMOTER";

  if (!name) return NextResponse.json({ error: "Full name is required." }, { status: 400 });
  if (!EMAIL_RE.test(email))
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  if (password.length < 6)
    return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });

  if (await findUserByEmail(email))
    return NextResponse.json(
      { error: "An account with this email already exists. Please log in." },
      { status: 409 }
    );

  const user = await createUser({ name, email, password, role });
  const session = toSessionUser(user);
  await setSessionCookie(session);
  return NextResponse.json({ user: session });
}
