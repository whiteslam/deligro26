import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { shortOrderId } from "@/lib/utils/order-map";
import { notifyOnTheWay, notifyDelivered } from "@/lib/notifications/order-events";
import type { DeliveryJob } from "@/lib/roles-data";
import { riderPayout } from "@/lib/pricing";
import { haversineKm } from "@/lib/geo/distance";
import { isMissingColumn } from "@/lib/data-access/schema-probe";

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
  // onlineHours (5.5) and rating (4.8) used to be constants sitting in the LIVE
  // board: every driver, forever, was shown the same made-up shift length and
  // the same made-up rating. We track neither, so we report neither.
  today: { trips: number; earnings: number };
}

function one<T>(v: T | T[] | null | undefined): T | null {
  return Array.isArray(v) ? (v[0] ?? null) : (v ?? null);
}

/**
 * What the rider is paid for this order. The commission is taken on the FOOD
 * subtotal (total minus the fee, the tax and the tip) — it used to be taken on
 * the gross, so riders were being paid a percentage of the customer's GST — and
 * the tip is then passed through in full.
 */
function payoutFor(r: Pick<OrderRow, "total" | "delivery_fee" | "tax_amount" | "tip">): number {
  const tip = r.tip ?? 0;
  const itemSubtotal = Math.max(
    0,
    (r.total ?? 0) - (r.delivery_fee ?? 0) - (r.tax_amount ?? 0) - tip
  );
  return riderPayout({ itemSubtotal, tip });
}

interface OrderRow {
  id: string;
  total: number;
  delivery_fee?: number;
  tax_amount?: number;
  tip?: number;
  address: { label?: string; line?: string; lat?: number; lng?: number } | null;
  restaurants:
    | { name: string; lat?: number | null; lng?: number | null }
    | { name: string; lat?: number | null; lng?: number | null }[]
    | null;
  profiles: { full_name: string | null } | { full_name: string | null }[] | null;
  order_items: { qty: number }[];
}

/** Pickup → drop, when both ends are known. Never a stand-in number. */
function jobDistance(r: OrderRow): number | undefined {
  const shop = one(r.restaurants);
  const from =
    typeof shop?.lat === "number" && typeof shop?.lng === "number"
      ? { lat: shop.lat, lng: shop.lng }
      : null;
  const to =
    typeof r.address?.lat === "number" && typeof r.address?.lng === "number"
      ? { lat: r.address.lat, lng: r.address.lng }
      : null;

  if (!from || !to) return undefined;
  return Math.round(haversineKm(from, to) * 10) / 10;
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
    // Was hardcoded to 2.5 for every job, on every screen, forever.
    distanceKm: jobDistance(r),
    payout: payoutFor(r),
    items,
    customer,
  };
}

const ORDER_SELECT =
  "id, total, delivery_fee, tax_amount, tip, address, restaurants(name, lat, lng), profiles(full_name), order_items(qty)";

/**
 * The same query for a database that predates migrations 0009 (shop coords) and
 * 0013 (tip). Without this, asking for a column that doesn't exist is a hard 400
 * and the board silently shows a driver no jobs at all.
 */
const ORDER_SELECT_LEGACY =
  "id, total, delivery_fee, tax_amount, address, restaurants(name), profiles(full_name), order_items(qty)";

let ordersHaveGeoAndTip: boolean | null = null;

/** Run a driver-board order query, retrying on the pre-0009/0013 column set. */
async function selectJobs<T>(
  run: (columns: string) => PromiseLike<{ data: T | null; error: { code?: string } | null }>
): Promise<T | null> {
  if (ordersHaveGeoAndTip !== false) {
    const { data, error } = await run(ORDER_SELECT);
    if (!error) {
      ordersHaveGeoAndTip = true;
      return data;
    }
    if (!isMissingColumn(error)) throw error;
    ordersHaveGeoAndTip = false;
  }

  const { data, error } = await run(ORDER_SELECT_LEGACY);
  if (error) throw error;
  return data;
}

export async function getDriverBoard(driverId: string): Promise<DriverBoardData> {
  const supabase = createAdminClient();

  // Active delivery for this driver (assigned or picked up).
  type ActiveRow = { status: string; order: OrderRow | OrderRow[] | null };
  const activeRows = await selectJobs<ActiveRow[]>((columns) =>
    supabase
      .from("deliveries")
      .select(`status, order:orders(${columns})`)
      .eq("driver_id", driverId)
      .in("status", ["assigned", "picked_up"])
      .order("assigned_at", { ascending: false })
      .limit(1)
      .overrideTypes<ActiveRow[]>()
  );

  const activeRow = one(activeRows);
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

  const readyRows = await selectJobs<OrderRow[]>((columns) =>
    supabase
      .from("orders")
      .select(columns)
      .eq("status", "ready")
      .order("created_at", { ascending: true })
      .overrideTypes<OrderRow[]>()
  );

  const available = (readyRows ?? [])
    .filter((r) => !takenIds.has(r.id))
    .map(toJob);

  // Today's completed trips + earnings for this driver.
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  type DoneRow = { order: OrderRow | OrderRow[] | null };
  const doneRows = await selectJobs<DoneRow[]>((columns) =>
    supabase
      .from("deliveries")
      // Only the charge columns are needed here, and they're the ones that may
      // not exist yet — so this rides the same pre-migration fallback.
      .select(
        columns.includes("tip")
          ? "order:orders(total, delivery_fee, tax_amount, tip)"
          : "order:orders(total, delivery_fee, tax_amount)"
      )
      .eq("driver_id", driverId)
      .eq("status", "delivered")
      .gte("delivered_at", startOfDay.toISOString())
      .overrideTypes<DoneRow[]>()
  );

  const done = doneRows ?? [];
  const earnings = done.reduce((sum, d) => {
    const order = one(d.order);
    return sum + (order ? payoutFor(order) : 0);
  }, 0);

  return {
    available,
    active,
    today: { trips: done.length, earnings },
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
    driver_lat: 21.7157 + 0.012,
    driver_lng: 81.5335 - 0.008,
    driver_location_at: new Date().toISOString(),
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
    await supabase
      .from("deliveries")
      .update({
        status: "picked_up",
        picked_up_at: new Date().toISOString(),
      })
      .eq("id", delivery.id);
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
