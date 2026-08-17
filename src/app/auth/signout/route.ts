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
  return NextResponse.redirect(new URL(next, request.url), { status: 303 });
}
