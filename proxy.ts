import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/token";

/**
 * Auth + role gate. Portal pages redirect to the landing page when there is
 * no valid session; API routes answer 401. /api/auth/* stays open so users
 * can log in/register.
 *
 * Roles split the portal in two:
 *  - PROMOTER        → preparation flow (onboarding, evidence, draft…)
 *  - MERCHANT_BANKER → /banker/* review workspace (linked by company code)
 * A user landing on the other role's pages is redirected to their own home.
 */

const PROMOTER_HOME = "/onboarding";
const BANKER_HOME = "/banker";

const BANKER_ONLY = ["/banker", "/merchant-review"];
const PROMOTER_ONLY = ["/onboarding", "/data-room", "/evidence", "/intelligence", "/draft", "/assistant"];
// Mutating promoter APIs a banker must never call
const PROMOTER_ONLY_API = ["/api/documents/upload", "/api/reset", "/api/objects"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api/auth")) return NextResponse.next();

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const user = token ? await verifySessionToken(token) : null;

  if (!user) {
    if (pathname.startsWith("/api")) {
      return NextResponse.json({ error: "Not authenticated. Please log in." }, { status: 401 });
    }
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  const redirectTo = (path: string) => {
    const url = request.nextUrl.clone();
    url.pathname = path;
    url.search = "";
    return NextResponse.redirect(url);
  };

  if (user.role === "MERCHANT_BANKER") {
    if (PROMOTER_ONLY.some((p) => pathname.startsWith(p))) return redirectTo(BANKER_HOME);
    if (PROMOTER_ONLY_API.some((p) => pathname.startsWith(p)))
      return NextResponse.json({ error: "This action is only available to the promoter." }, { status: 403 });
  } else {
    // promoter (default role)
    if (BANKER_ONLY.some((p) => pathname.startsWith(p))) return redirectTo(PROMOTER_HOME);
    if (pathname.startsWith("/api/banker/link"))
      return NextResponse.json({ error: "Merchant banker account required." }, { status: 403 });
  }

  return NextResponse.next();
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
    "/banker/:path*",
    "/api/:path*",
  ],
};
