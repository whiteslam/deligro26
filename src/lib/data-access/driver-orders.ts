import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { shortOrderId } from "@/lib/utils/order-map";
import { notifyOnTheWay, notifyDelivered } from "@/lib/notifications/order-events";
import type { DeliveryJob } from "@/lib/roles-data";

/**
 * Driver marketplace + active delivery, on live data.
 *
 * A driver can only *see* an order once a delivery is assigned to them (RLS:
 * is_active_driver_for). The "available orders" pool — orders ready for pickup
 * with no rider yet — is by design invisible to a driver under RLS, so we read
 * it here with the service-role client. Every function is role-gated by the
 * caller (server action checks role === "driver") and only ever returns the
 * signed-in driver's own active delivery.
 */

export type Leg = "TO_PICKUP" | "TO_CUSTOMER";

export interface DriverActive {
  job: DeliveryJob;
  leg: Leg;
}

export interface DriverBoardData {
  available: DeliveryJob[];
  active: DriverActive | null;
  today: { trips: number; earnings: number; onlineHours: number; rating: number };
}

function one<T>(v: T | T[] | null | undefined): T | null {
  return Array.isArray(v) ? (v[0] ?? null) : (v ?? null);
}

/** Rider payout — demo heuristic: 8% of order, floor ₹30. */
function payoutFor(total: number): number {
  return Math.max(30, Math.round(total * 0.08));
}

interface OrderRow {
  id: string;
  total: number;
  address: { label?: string; line?: string } | null;
  restaurants: { name: string } | { name: string }[] | null;
  profiles: { full_name: string | null } | { full_name: string | null }[] | null;
  order_items: { qty: number }[];
}

function toJob(r: OrderRow): DeliveryJob {
  const restaurant = one(r.restaurants)?.name ?? "Kitchen";
  const customer = one(r.profiles)?.full_name?.trim() || "Customer";
  const items = (r.order_items ?? []).reduce((n, i) => n + i.qty, 0);
  return {
    id: r.id,
    code: `#${shortOrderId(r.id)}`,
    restaurant,
    pickupArea: restaurant,
    dropArea: r.address?.label ?? r.address?.line ?? "Delivery",
    distanceKm: 2.5,
    payout: payoutFor(r.total),
    items,
    customer,
  };
}

const ORDER_SELECT =
  "id, total, address, restaurants(name), profiles(full_name), order_items(qty)";

export async function getDriverBoard(driverId: string): Promise<DriverBoardData> {
  const supabase = createAdminClient();

  // Active delivery for this driver (assigned or picked up).
  const { data: activeRows } = await supabase
    .from("deliveries")
    .select(`status, order:orders(${ORDER_SELECT})`)
    .eq("driver_id", driverId)
    .in("status", ["assigned", "picked_up"])
    .order("assigned_at", { ascending: false })
    .limit(1);

  const activeRow = one(activeRows) as
    | { status: string; order: OrderRow | OrderRow[] | null }
    | null;
  let active: DriverActive | null = null;
  if (activeRow) {
    const order = one(activeRow.order);
    if (order) {
      active = {
        job: toJob(order),
        leg: activeRow.status === "picked_up" ? "TO_CUSTOMER" : "TO_PICKUP",
      };
    }
  }

  // Available pool: orders that are ready and not already taken by a rider.
  const { data: taken } = await supabase
    .from("deliveries")
    .select("order_id, status")
    .in("status", ["assigned", "picked_up", "delivered"]);
  const takenIds = new Set((taken ?? []).map((d) => d.order_id as string));

  const { data: readyRows } = await supabase
    .from("orders")
    .select(ORDER_SELECT)
    .eq("status", "ready")
    .order("created_at", { ascending: true });

  const available = (readyRows as OrderRow[] | null ?? [])
    .filter((r) => !takenIds.has(r.id))
    .map(toJob);

  // Today's completed trips + earnings for this driver.
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const { data: doneRows } = await supabase
    .from("deliveries")
    .select("order:orders(total)")
    .eq("driver_id", driverId)
    .eq("status", "delivered")
    .gte("delivered_at", startOfDay.toISOString());

  const done = (doneRows ?? []) as { order: { total: number } | { total: number }[] | null }[];
  const earnings = done.reduce((sum, d) => sum + payoutFor(one(d.order)?.total ?? 0), 0);

  return {
    available,
    active,
    today: { trips: done.length, earnings, onlineHours: 5.5, rating: 4.8 },
  };
}

/** Claim a ready order: create the delivery row assigned to this driver. */
export async function acceptDelivery(driverId: string, orderId: string): Promise<void> {
  const supabase = createAdminClient();

  // Guard against a double-claim race.
  const { data: existing } = await supabase
    .from("deliveries")
    .select("id, status")
    .eq("order_id", orderId)
    .in("status", ["assigned", "picked_up", "delivered"])
    .maybeSingle();
  if (existing) throw new Error("already_taken");

  const { error } = await supabase.from("deliveries").insert({
    order_id: orderId,
    driver_id: driverId,
    status: "assigned",
    assigned_at: new Date().toISOString(),
  });
  if (error) throw error;
}

/**
 * Advance the driver's active delivery: pickup → on the way → delivered.
 * Completing the delivery requires the customer's handover OTP (proves the food
 * actually reached them) — verified against orders.delivery_otp.
 */
export async function advanceDelivery(
  driverId: string,
  orderId: string,
  otp?: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createAdminClient();

  const { data: delivery, error: readErr } = await supabase
    .from("deliveries")
    .select("id, status")
    .eq("order_id", orderId)
    .eq("driver_id", driverId)
    .maybeSingle();
  if (readErr) throw readErr;
  if (!delivery) return { ok: false, error: "not_found" };

  if (delivery.status === "assigned") {
    // Picked up → order is on the way.
    await supabase.from("deliveries").update({ status: "picked_up" }).eq("id", delivery.id);
    await supabase.from("orders").update({ status: "on_the_way" }).eq("id", orderId);
    await notifyOnTheWay(orderId);
    return { ok: true };
  }

  if (delivery.status === "picked_up") {
    // Verify the customer's delivery code before completing.
    const { data: order } = await supabase
      .from("orders")
      .select("delivery_otp")
      .eq("id", orderId)
      .maybeSingle();
    const expected = (order?.delivery_otp ?? "").replace(/\D/g, "");
    if (!expected || (otp ?? "").replace(/\D/g, "") !== expected) {
      return { ok: false, error: "bad_otp" };
    }
    await supabase
      .from("deliveries")
      .update({ status: "delivered", delivered_at: new Date().toISOString() })
      .eq("id", delivery.id);
    await supabase.from("orders").update({ status: "delivered" }).eq("id", orderId);
    await notifyDelivered(orderId);
    return { ok: true };
  }

  return { ok: false, error: "bad_state" };
}
