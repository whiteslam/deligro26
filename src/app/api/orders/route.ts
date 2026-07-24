import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { rateLimit } from "@/lib/rate-limit";
import {
  createOrder,
  listVisibleOrders,
  type CreateOrderInput,
} from "@/lib/data-access/orders";

function mapCreateError(message: string) {
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
    default:
      return { status: 500, error: "server_error" };
  }
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

/** POST /api/orders — place an order (customer role, server-validated totals). */
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
    const message = err instanceof Error ? err.message : "server_error";
    const mapped = mapCreateError(message);
    return NextResponse.json({ error: mapped.error }, { status: mapped.status });
  }
}
