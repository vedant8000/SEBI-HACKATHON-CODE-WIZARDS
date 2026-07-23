import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/token";

/**
 * Auth gate. Portal pages redirect to the landing page when there is no
 * valid session; API routes answer 401. /api/auth/* stays open so users can
 * log in/register.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api/auth")) return NextResponse.next();

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const user = token ? await verifySessionToken(token) : null;
  if (user) return NextResponse.next();

  if (pathname.startsWith("/api")) {
    return NextResponse.json({ error: "Not authenticated. Please log in." }, { status: 401 });
  }
  const url = request.nextUrl.clone();
  url.pathname = "/";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    "/onboarding/:path*",
    "/data-room/:path*",
    "/draft/:path*",
    "/evidence/:path*",
    "/intelligence/:path*",
    "/merchant-review/:path*",
    "/assistant/:path*",
    "/settings/:path*",
    "/api/:path*",
  ],
};
