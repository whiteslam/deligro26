import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { CUSTOMER_LOGIN, safeNextPath } from "@/lib/auth/portals";

/**
 * POST /auth/signout — clears the session and returns to a sign-in page.
 *
 * `?next=` picks which door: the portals pass their own (/admin/login, …) so an
 * operator who signs out isn't dropped on the customer entry screen. Only
 * relative in-app paths are honored, so it can't be turned into a redirector.
 */
export async function POST(request: Request) {
  if (isSupabaseConfigured) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }

  const next = safeNextPath(
    new URL(request.url).searchParams.get("next"),
    CUSTOMER_LOGIN
  );

  // Mark the landing page so the client knows a session actually ENDED here.
  // Without it the only signal is "we are on a login page", and /login is the
  // customer app's entry screen — every anonymous visitor starts there, so
  // treating that as a sign-out wiped the service worker's caches on ordinary
  // first visits. `safeNextPath` has already rejected anything that is not a
  // relative in-app path, so this only ever appends to one of our own routes.
  const target = new URL(next, request.url);
  target.searchParams.set("signedout", "1");
  return NextResponse.redirect(target, { status: 303 });
}
