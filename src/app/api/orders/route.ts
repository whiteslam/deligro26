import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { rateLimit } from "@/lib/rate-limit";
import {
  createOrder,
  listVisibleOrders,
  OrderRefused,
  PaymentRefused,
  type CreateOrderInput,
} from "@/lib/data-access/orders";

function mapCreateError(message: string) {
  // Coupon refusals are the customer's to act on — retry without the code, or
  // add another ₹80 to clear the minimum — so they keep their own reason
  // rather than collapsing into a generic 400.
  if (message.startsWith("coupon_")) {
    return { status: 400, error: message };
  }

  switch (message) {
    case "unauthorized":
      return { status: 401, error: "unauthorized" };
    case "restaurant_not_found":
    case "restaurant_closed":
    case "empty_cart":
    case "invalid_items":
      return { status: 400, error: message };
    case "tip_unsupported":
      // The database predates migration 0013 and has nowhere to record a tip.
      return { status: 503, error: "tip_unsupported" };
    case "online_payments_unavailable":
      // Switched off, unconfigured, or the database predates 0025. Either way
      // the order is refused rather than silently downgraded to cash.
      return { status: 503, error: "online_payments_unavailable" };
    default:
      return { status: 500, error: "server_error" };
  }
}

/**
 * A PostgREST row-level-security refusal. These arrive as plain objects, not
 * `Error`s, which is why they slipped past the mapping below and surfaced as a
 * generic 500.
 */
function isRlsRefusal(err: unknown): boolean {
  if (typeof err !== "object" || err === null) return false;
  const e = err as { code?: unknown; message?: unknown };
  return (
    e.code === "42501" ||
    (typeof e.message === "string" &&
      e.message.includes("row-level security policy"))
  );
}

/** GET /api/orders — orders visible to the signed-in user (RLS-scoped). */
export async function GET() {
  if (!isSupabaseConfigured) {
    return NextResponse.json(
      { error: "backend_not_configured" },
      { status: 503 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const limit = await rateLimit(`orders-list:${user.id}`, 60, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } }
    );
  }

  try {
    const orders = await listVisibleOrders();
    return NextResponse.json({ orders });
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

/** POST /api/orders — place an order (customer or admin, server-validated totals). */
export async function POST(request: Request) {
  if (!isSupabaseConfigured) {
    return NextResponse.json(
      { error: "backend_not_configured" },
      { status: 503 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const limit = await rateLimit(`orders-create:${user.id}`, 20, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } }
    );
  }

  let body: CreateOrderInput;
  try {
    body = (await request.json()) as CreateOrderInput;
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  if (
    !body?.restaurantSlug ||
    !Array.isArray(body.lines) ||
    !body.address?.label ||
    !body.address?.line
  ) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  try {
    const order = await createOrder(body);
    return NextResponse.json({ order }, { status: 201 });
  } catch (err) {
    // The cash ceiling is per vendor, so the sentence the customer needs
    // ("Orders above ₹300 must be paid online") can only be written by the
    // rules that refused the order. Pass it through verbatim rather than
    // rebuilding it here from a code and a guess at the number.
    if (err instanceof PaymentRefused) {
      return NextResponse.json(
        { error: err.reason, message: err.customerMessage },
        { status: 400 }
      );
    }
    // Same shape, same reason: the maintenance message, the configured minimum
    // and the shop's radius are only known to the code that refused. A pause is
    // 503 (try later, nothing about the request was wrong); a basket under the
    // minimum or an address out of area is 400 (the request itself can't stand).
    if (err instanceof OrderRefused) {
      return NextResponse.json(
        { error: err.reason, message: err.customerMessage },
        { status: err.reason === "orders_paused" ? 503 : 400 }
      );
    }
    // Postgres 42501 is the row-level security refusal. It is not a server
    // fault and must not be reported as one: "orders — customer insert" admits
    // 'customer' and (since 0040) 'admin', so this is what a driver, vendor or
    // manager account gets when it tries to place an order. Signing in as the
    // wrong role is the likeliest cause and the only one the customer can act
    // on, so say that instead of "try again", which never works.
    //
    // The owner/developer account used to land here too — it is an admin, and
    // admin was not on that list. 0040 put it there: an operator shops through
    // the same app as everyone else, with no second identity to switch to.
    if (isRlsRefusal(err)) {
      return NextResponse.json(
        {
          error: "not_a_customer",
          message:
            "This account can't place orders. Sign in with your customer account and try again.",
        },
        { status: 403 }
      );
    }
    const message = err instanceof Error ? err.message : "server_error";
    const mapped = mapCreateError(message);
    // An unmapped failure is the one case where the customer is told nothing
    // useful ("Could not place the order") — so it is the one case that has to
    // reach the server log, or there is no way to find out what happened. A
    // PostgREST rejection arrives as a plain object, not an Error, and its
    // `message`/`code`/`details` are the whole diagnosis; stringify it rather
    // than logging `err.message`, which is undefined for exactly those.
    if (mapped.error === "server_error") {
      console.error("[orders] order refused, unmapped:", JSON.stringify(err), err);
    }
    return NextResponse.json({ error: mapped.error }, { status: mapped.status });
  }
}
