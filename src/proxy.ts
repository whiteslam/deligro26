import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { updateSession } from "@/lib/supabase/middleware";

// Next 16 "proxy" convention (formerly "middleware"). Runs before routes render.
// Portal roots that require a logged-in user. Fine-grained role enforcement
// (is this user actually an admin/vendor/driver?) happens server-side in each
// portal's layout via requireRole(). Proxy only does the coarse gate + session
// refresh, so it stays cheap and DB-free.
const PROTECTED = ["/admin", "/vendor", "/driver"];

export async function proxy(request: NextRequest) {
  // Demo mode: no Supabase keys yet -> don't block anything.
  if (!isSupabaseConfigured) return NextResponse.next();

  const { response, user } = await updateSession(request);

  const path = request.nextUrl.pathname;
  const needsAuth = PROTECTED.some(
    (p) => path === p || path.startsWith(p + "/")
  );

  if (needsAuth && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  // Run on everything except static assets and images.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
