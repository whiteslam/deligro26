import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { updateSession } from "@/lib/supabase/middleware";
import { GUEST_COOKIE } from "@/lib/auth/guest";

// Next 16 "proxy" convention (formerly "middleware"). Runs before routes render.
//
// Two jobs, in order:
//   1. Refresh the Supabase session cookie on every request (updateSession).
//   2. Coarse access control — the single place the "app launch" routing lives:
//        anon   → blocked from the app shell, redirected to /welcome
//        guest  → browse-only feed; gated customer routes bounce to /signin (OTP)
//        user   → full access
//
// Fine-grained role enforcement (is this user actually an admin/vendor/driver?)
// still happens server-side in each portal's layout via requireRole(). Proxy
// stays coarse and DB-free so it's cheap.

/** Entry / auth pages — always reachable without a session. */
const PUBLIC_PATHS = ["/welcome", "/login", "/signin"];

/** Entry pages a signed-in user should be bounced away from (already onboarded). */
const ENTRY_PATHS = ["/welcome", "/login", "/signin"];

/** MFA challenge / enroll — need a session, but must stay reachable at aal1. */
const MFA_PATHS = ["/mfa"];

/** Operator portals — require a logged-in user (role is checked server-side). */
const PROTECTED = ["/admin", "/vendor", "/driver"];

/** Customer routes that need a real account (user data or a write action). */
const GATED_CUSTOMER = ["/checkout", "/orders", "/profile"];

function matches(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export async function proxy(request: NextRequest) {
  // Demo mode: no Supabase keys yet -> don't block anything.
  if (!isSupabaseConfigured) return NextResponse.next();

  const { response, user } = await updateSession(request);
  const path = request.nextUrl.pathname;

  // API routes self-guard and are needed pre-login (OTP request/verify). Refresh
  // the session but never gate them here — a redirect would break those calls.
  if (path.startsWith("/api")) return response;

  const guest = request.cookies.get(GUEST_COOKIE)?.value === "1";

  // A signed-in visitor never needs the entry/onboarding pages.
  if (user && matches(path, ENTRY_PATHS)) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Once signed in, any stale guest flag is meaningless — clear it.
  if (user && guest) response.cookies.delete(GUEST_COOKIE);

  // Public entry pages: always allowed.
  if (matches(path, PUBLIC_PATHS)) return response;

  // MFA pages: signed-in only (aal1 sessions must not be bounced to /).
  if (matches(path, MFA_PATHS)) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", path);
      return NextResponse.redirect(url);
    }
    return response;
  }

  // Operator portals: must be a logged-in user (guest is not enough).
  if (matches(path, PROTECTED) && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  // Gated customer routes: a guest is NOT enough — must be a real user.
  // Send them to phone OTP (/signin), not the operator email/password /login.
  if (matches(path, GATED_CUSTOMER) && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/signin";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  // Everything else in the app shell (main feed, search, restaurants, portals
  // index) needs at least an explicit guest. Pure anon → the entry screen.
  if (!user && !guest) {
    return NextResponse.redirect(new URL("/welcome", request.url));
  }

  return response;
}

export const config = {
  // Run on everything except static assets and images.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
