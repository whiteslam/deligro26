import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { rateLimit } from "@/lib/rate-limit";

/**
 * GET /api/orders/:id — the reference secure endpoint.
 *
 * The three checks that stop IDOR, in order:
 *   1. Authenticated  — is there a logged-in user at all?          (below)
 *   2. Authorized role — may this role read an order?              (RLS policy)
 *   3. Resource owner  — does THIS order belong to THIS user?      (RLS policy)
 *
 * Checks 2 & 3 are enforced by Postgres RLS on the query itself, so even if this
 * handler forgot them, the DB would still refuse. A row the caller may not see
 * simply isn't returned -> we answer 404, identical to "doesn't exist", so we
 * never leak whether someone else's order id is real.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!isSupabaseConfigured) {
    return NextResponse.json(
      { error: "backend_not_configured" },
      { status: 503 }
    );
  }

  const supabase = await createClient();

  // Check #1 — authenticated.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Rate limit per user — cheap guard against scripted enumeration.
  const limit = rateLimit(`orders:${user.id}`, 60, 60_000); // 60 / min
  if (!limit.ok) {
    return NextResponse.json(
      { error: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } }
    );
  }

  // Checks #2 + #3 — role + ownership, enforced by RLS on this select.
  const { data, error } = await supabase
    .from("orders")
    .select("id, restaurant_id, status, total, created_at, order_items(name, qty, price)")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
  if (!data) {
    // Not found OR not yours — same answer on purpose.
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({ order: data });
}
