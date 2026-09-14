import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getProfile } from "@/lib/auth";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { pageOrdersBefore } from "@/lib/orders-ui";

/**
 * GET /api/orders/history?before=<iso> — the next page of finished orders.
 *
 * The Orders tab has always capped its read (`listMyOrders`) and never said so,
 * so a long-tenured customer scrolling for an older order hit a wall that
 * looked like the end of their history. This is the rest of it.
 *
 * No `requireUser()` here on purpose: that redirects, which is the right answer
 * for a page and the wrong one for fetch — a 307 to /login arrives at the
 * caller as an HTML body where JSON was expected. The check is the same one,
 * spelled as a status code.
 *
 * `pageOrdersBefore` reads through the user's own client, so RLS scopes the
 * rows to this account and the `before` cursor cannot be pointed at anybody
 * else's history.
 */
export async function GET(request: Request) {
  if (!isSupabaseConfigured) {
    return NextResponse.json(
      { error: "backend_not_configured" },
      { status: 503 }
    );
  }

  const profile = await getProfile();
  if (!profile) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // A read, but a wide one: each page is up to 100 orders with their items and
  // restaurant joined. Paging by hand is a few taps a minute.
  const limit = await rateLimit(`orders-history:${profile.id}`, 30, 60_000);
  if (!limit.ok) return tooManyRequests(limit);

  const before = new URL(request.url).searchParams.get("before");
  // Validated before it reaches the query: `lt` on a malformed timestamp is a
  // 500 from Postgres, and the honest answer to a bad cursor is "bad request".
  if (!before || Number.isNaN(Date.parse(before))) {
    return NextResponse.json({ error: "invalid_cursor" }, { status: 400 });
  }

  try {
    const { orders, hasMore } = await pageOrdersBefore(before);
    return NextResponse.json({ ok: true, orders, hasMore });
  } catch (err) {
    console.error("[orders-history] page failed", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
