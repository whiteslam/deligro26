import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { queueRefundForOrder } from "@/lib/data-access/refunds";
import {
  notifyOrderCancelled,
  notifyVendorOrderCancelled,
} from "@/lib/notifications/order-events";

/**
 * POST /api/orders/:id/cancel — a customer cancels their own order, but only
 * before the kitchen has started (status placed/kitchen). The customer can't
 * update orders under RLS, so we verify ownership + state here and write with
 * the service-role client.
 *
 * Cancelling is three things, not one: the order stops, the money starts coming
 * back, and the two people affected are told. Until now it was only the first —
 * an order paid online could be cancelled and the payment simply stayed ours,
 * and a kitchen already cooking found out by watching a card vanish from a board
 * that polls every four seconds.
 *
 * `cancelled_at` is deliberately not written here: a trigger stamps it (0026),
 * so the timestamp is the same whichever path moved the order.
 */
const CANCELLABLE = new Set(["placed", "kitchen"]);

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSupabaseConfigured) return NextResponse.json({ error: "backend_not_configured" }, { status: 503 });
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // The lookup below runs on the service-role client, so it sees every order
  // regardless of RLS. Ownership is checked immediately after — but cap the
  // rate anyway so this can't be driven as an order-id probe.
  const limit = await rateLimit(`order-cancel:${user.id}`, 20, 60_000);
  if (!limit.ok) return tooManyRequests(limit);

  const admin = createAdminClient();
  const { data: order } = await admin
    .from("orders")
    .select("id, customer_id, status")
    .eq("id", id)
    .maybeSingle();

  // Consistent 404 — never leak whether someone else's order exists.
  if (!order || order.customer_id !== user.id) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (!CANCELLABLE.has(order.status)) {
    return NextResponse.json({ error: "too_late" }, { status: 409 });
  }

  const { error } = await admin.from("orders").update({ status: "cancelled" }).eq("id", id);
  if (error) return NextResponse.json({ error: "server_error" }, { status: 500 });

  // Ownership was established above, which is what authorizes the service-role
  // write inside queueRefundForOrder. It returns queued:false for a COD order
  // nobody has paid for yet — most cancellations, and nothing to refund.
  let refundQueued = false;
  try {
    ({ queued: refundQueued } = await queueRefundForOrder(id, {
      origin: "customer",
      reason: "Cancelled by the customer",
      requestedBy: user.id,
    }));
  } catch (err) {
    // The order IS cancelled. Failing the request now would be a lie about the
    // thing the customer asked for, and re-trying would 409 as too_late — so
    // report the cancellation and leave the refund unclaimed. The customer can
    // still raise it themselves from the order (POST /api/refunds), which is
    // why that path exists as well as this one.
    console.error(`[order-cancel] refund could not be queued for ${id}`, err);
  }

  // Fire-and-forget, by contract: order-events swallows its own failures. A
  // push outage must not fail a cancellation that has already happened.
  void notifyOrderCancelled(id, { refundQueued });
  void notifyVendorOrderCancelled(id);

  return NextResponse.json({ ok: true, refundQueued });
}
