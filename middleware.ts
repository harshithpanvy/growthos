import { NextResponse, type NextRequest } from "next/server";

const ACCESS_TOKEN_COOKIE = "gos-access-token";

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // Preserve referral code in a first-party cookie for 7 days whenever `?ref=` is visited on any route
  const refParam = searchParams.get("ref");
  const response = NextResponse.next();

  if (refParam && /^[A-Za-z0-9-]{4,24}$/.test(refParam.trim())) {
    response.cookies.set("gos-ref-code", refParam.trim().toUpperCase(), {
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
      sameSite: "lax"
    });
  }

  // Also preserve UTM parameters in a lightweight cookie if present
  const utmSource = searchParams.get("utm_source");
  const utmMedium = searchParams.get("utm_medium");
  const utmCampaign = searchParams.get("utm_campaign");
  if (utmSource || utmMedium || utmCampaign) {
    const utmPayload = JSON.stringify({
      utm_source: utmSource?.slice(0, 80) ?? null,
      utm_medium: utmMedium?.slice(0, 80) ?? null,
      utm_campaign: utmCampaign?.slice(0, 80) ?? null,
      landing_page: pathname
    });
    response.cookies.set("gos-utm-context", utmPayload, {
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
      sameSite: "lax"
    });
  }

  // Add standard security headers
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  // Note: Server-side API routes (`/api/student/*` and `/api/admin/*`) and layouts
  // enforce strict token + database role verification. If an unauthenticated visitor
  // requests `/admin` or `/dashboard` when Supabase is configured and has no session cookie,
  // our protected layouts also verify client/server session state and redirect or show
  // a clear Unauthorized boundary.
  const hasCookieToken = Boolean(request.cookies.get(ACCESS_TOKEN_COOKIE)?.value);
  if (pathname.startsWith("/api/admin") && !hasCookieToken && !request.headers.get("authorization")) {
    return NextResponse.json(
      { error: "Authentication required to access administrator endpoints." },
      { status: 401 }
    );
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)"
  ]
};

