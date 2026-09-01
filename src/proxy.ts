import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { updateSession } from "@/lib/supabase/middleware";
import { GUEST_COOKIE } from "@/lib/auth/guest";
import {
  CUSTOMER_LOGIN,
  PORTAL_LIST,
  PORTAL_LOGIN_PATHS,
} from "@/lib/auth/portals";

// Next 16 "proxy" convention (formerly "middleware"). Runs before routes render.
//
// Two jobs, in order:
//   1. Refresh the Supabase session cookie on every request (updateSession).
//   2. Coarse access control — the single place the "app launch" routing lives:
//        anon   → blocked from the app shell, redirected to /login
//        guest  → browse-only feed; gated customer routes bounce to /login
//        user   → full access
//
// Each surface has its own front door: /login is the customer app's (phone OTP
// or guest), and every portal bounces to its own (/admin → /admin/login, …), so
// a signed-out visitor is always sent to the door for the thing they asked for.
//
// Fine-grained role enforcement (is this user actually an admin/vendor/driver?)
// still happens server-side in each portal's layout via requireRole(). Proxy
// stays coarse and DB-free so it's cheap.

/**
 * Auth pages — always reachable without a session.
 *
 * The offline fallback is NOT here — it is `public/offline.html`, a static file
 * excluded in the matcher below alongside the service-worker scripts.
 */
const PUBLIC_PATHS = [CUSTOMER_LOGIN, "/portals", ...PORTAL_LOGIN_PATHS];

/** Entry page a signed-in user should be bounced away from (already onboarded). */
const ENTRY_PATHS = [CUSTOMER_LOGIN];

/** Customer routes that need a real account (user data or a write action). */
const GATED_CUSTOMER = ["/checkout", "/orders", "/profile"];

function matches(pathname: string, prefixes: readonly string[]): boolean {
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

  // Public auth pages first — including the portal doors, which sit *under* a
  // portal prefix and must not be caught by the portal gate below. The portal
  // login page itself decides what to do with an already-signed-in visitor.
  if (matches(path, PUBLIC_PATHS)) {
    // A signed-in visitor never needs the customer entry page.
    if (user && matches(path, ENTRY_PATHS)) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return response;
  }

  // Once signed in, any stale guest flag is meaningless — clear it.
  if (user && guest) response.cookies.delete(GUEST_COOKIE);

  // Operator portals: must be a logged-in user (guest is not enough), and the
  // bounce goes to that portal's own sign-in page, not the customer one.
  const portal = PORTAL_LIST.find(
    (p) => path === p.home || path.startsWith(`${p.home}/`)
  );
  if (portal && !user) {
    const url = request.nextUrl.clone();
    url.pathname = portal.login;
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  // Gated customer routes: a guest is NOT enough — must be a real user.
  // `next` set means the customer login hides its guest option.
  if (matches(path, GATED_CUSTOMER) && !user) {
    const url = request.nextUrl.clone();
    url.pathname = CUSTOMER_LOGIN;
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  // Everything else in the app shell (main feed, search, restaurants) needs at
  // least an explicit guest. Pure anon → the customer entry screen.
  if (!user && !guest) {
    return NextResponse.redirect(new URL(CUSTOMER_LOGIN, request.url));
  }

  return response;
}

export const config = {
  // Run on everything except static assets and the public metadata files.
  //
  // robots.txt, sitemap.xml and manifest.webmanifest MUST be excluded here.
  // They are generated correctly by src/app/{robots,sitemap,manifest}.ts and
  // appear in the build output, but the proxy gate below sends any request
  // without a session to /login — and Googlebot has no session. Every one of
  // them answered 307 → /login, which means:
  //
  //   * a crawler cannot read robots.txt, so it never discovers the sitemap;
  //   * it cannot read the sitemap, so no restaurant page is ever indexed;
  //   * a first-time visitor's browser cannot read the manifest, so Chrome
  //     never offers "Add to home screen" — precisely the visitor the manifest
  //     exists for.
  //
  // All three are public by definition. Nothing in them is user-scoped, so
  // there is nothing for the session gate to protect.
  //
  // The two service-worker scripts are excluded for exactly the same reason,
  // and it was exactly the same bug: the exclusion list above covers images but
  // not .js, so `/OneSignalSDKWorker.js` answered 307 → /login to any browser
  // without a session. A worker script that redirects does not register, so
  // push could only ever install for an already-signed-in visitor, and the
  // periodic update check — which the browser makes with no guarantee of
  // credentials — could not see the script at all. Both files are static
  // `public/` assets containing no user data.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots\\.txt|sitemap\\.xml|manifest\\.webmanifest|OneSignalSDKWorker\\.js|sw-core\\.js|offline\\.html|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
