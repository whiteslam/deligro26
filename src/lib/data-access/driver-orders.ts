import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { shortOrderId } from "@/lib/utils/order-map";
import { notifyOnTheWay, notifyDelivered } from "@/lib/notifications/order-events";
import type { DeliveryJob } from "@/lib/roles-data";
import { riderPayout, type RiderPayoutConfig } from "@/lib/pricing";
import { getSettings } from "@/lib/settings";
import { haversineKm } from "@/lib/geo/distance";
import { PINNED_LOCATION } from "@/lib/location/pinned";
import {
  columnKnownMissing,
  isMissingColumn,
  rememberColumn,
} from "@/lib/data-access/schema-probe";
import type { PaymentMethod, PaymentStatus } from "@/types";

/**
 * Driver marketplace + active delivery, on live data.
 *
 * A driver can only *see* an order once a delivery is assigned to them (RLS:
 * is_active_driver_for). The "available orders" pool — orders ready for pickup
 * with no rider yet — is by design invisible to a driver under RLS, so we read
 * it here with the service-role client. Every function is role-gated by the
 * caller (server action / route handler checks role === "driver") and only ever
 * returns — or writes — the signed-in driver's own delivery.
 */

export type Leg = "TO_PICKUP" | "TO_CUSTOMER";

/**
 * What the rider has to do about money at the door.
 *
 * `unconfirmed` is not hedging. It is an online order whose payment never
 * settled, which should not have reached a rider at all, and we refuse to guess
 * in either direction: telling a rider to collect from someone who already paid
 * charges that customer twice, and telling them to collect nothing hands the
 * food over for free. An operator has to break the tie.
 */
export type CashInstruction = "collect" | "prepaid" | "unconfirmed";

export interface DriverPayment {
  instruction: CashInstruction;
  /**
   * Rupees to take at the door — zero unless the instruction is "collect", so
   * that a screen which renders this without checking still cannot invent a
   * demand for money.
   */
  collectAmount: number;
}

export interface DriverActive {
  job: DeliveryJob;
  leg: Leg;
  /**
   * Cash vs prepaid for THIS order. Nothing in the driver UI used to mention
   * payment at all, which was harmless only for as long as every order was COD:
   * the day online payment is switched on, a rider with no signal asks a
   * prepaid customer to pay a second time.
   */
  payment: DriverPayment;
  /**
   * Whether this leg is gated by the kitchen's handover code.
   *
   * NOT the code itself, and that inversion is the fix. The rider used to be
   * SHOWN `orders.pickup_otp` to read out at the counter, while
   * `advanceDelivery` wrote `picked_up` without checking it — so a rider could
   * mark an order collected without ever visiting the shop, starting the
   * customer's road-leg ETA from a departure that never happened and pushing the
   * order to `on_the_way` on the kitchen board.
   *
   * Now the CODE is shown to the vendor, on the packed order, and the rider
   * types what the counter reads to them — the same shape as the delivery leg,
   * where the customer holds the code and the rider enters it. Possession of the
   * code is then evidence of having been there, which is the only thing that
   * made it worth having.
   *
   * False on a database whose order has no code recorded, where the leg stays
   * ungated rather than becoming impossible to complete.
   */
  pickupCodeRequired: boolean;
  /**
   * Where THIS leg ends — the shop before pickup, the customer's pin after.
   * Feeds the Navigate control, which was a button with no handler.
   *
   * Null when that end has never been pinned (or on a database predating
   * migration 0009, which has no shop coordinates at all). The control renders
   * disabled in that case rather than pretending to work.
   */
  navigateTo: { lat: number; lng: number } | null;
  /**
   * The customer's phone, for the Call control — which was likewise inert.
   *
   * On the ACTIVE delivery only, and read in its own query rather than added to
   * `ORDER_SELECT`, for the same reason `pickupOtp` is: that column list also
   * feeds the available pool, and every customer's number is not something to
   * ship to every rider who opens the board.
   */
  customerPhone: string | null;
}

export interface DriverBoardData {
  available: DeliveryJob[];
  active: DriverActive | null;
  // onlineHours (5.5) and rating (4.8) used to be constants sitting in the LIVE
  // board: every driver, forever, was shown the same made-up shift length and
  // the same made-up rating. We track neither, so we report neither.
  today: { trips: number; earnings: number };
}

type AdminClient = ReturnType<typeof createAdminClient>;

function one<T>(v: T | T[] | null | undefined): T | null {
  return Array.isArray(v) ? (v[0] ?? null) : (v ?? null);
}

/**
 * What the rider is paid for this order, at the rate the admin configured.
 *
 * The commission is taken on the FOOD subtotal (total minus the fee, the tax
 * and the tip) — it used to be taken on the gross, so riders were being paid a
 * percentage of the customer's GST — and the tip is then passed through in full.
 *
 * `rate` comes from `platform_settings`. It used to come from the pricing.ts
 * constants, which meant `rider_commission` and `rider_min_payout` were editable
 * in the admin form, validated, clamped, written to the database, and read by
 * nothing: a rate change saved successfully and paid nobody differently.
 */
function payoutFor(
  r: Pick<OrderRow, "total" | "delivery_fee" | "tax_amount" | "tip">,
  rate: RiderPayoutConfig
): number {
  const tip = r.tip ?? 0;
  const itemSubtotal = Math.max(
    0,
    (r.total ?? 0) - (r.delivery_fee ?? 0) - (r.tax_amount ?? 0) - tip
  );
  return riderPayout(rate, { itemSubtotal, tip });
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

function toJob(r: OrderRow, rate: RiderPayoutConfig): DeliveryJob {
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
    payout: payoutFor(r, rate),
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

/** The 0025 payment columns arrive together, so one probe key covers both. */
const PAYMENT_COLUMNS = "orders.payment_method";
/** `deliveries.driver_location_source` arrives with 0026. */
const LOCATION_SOURCE_COLUMN = "deliveries.driver_location_source";

interface ActiveOrderRow {
  pickup_otp?: string | null;
  payment_method?: PaymentMethod | null;
  payment_status?: PaymentStatus | null;
}

interface ActiveOrderDetail {
  pickupOtp: string | null;
  method: PaymentMethod | null;
  status: PaymentStatus | null;
  /**
   * Whether this database has the 0025 payment columns at all. Separating this
   * from a null `method` matters: "there is no such thing as an online order
   * here" and "we asked and got nothing back" look identical in the row and are
   * not remotely the same answer.
   */
  paymentColumns: boolean;
  /** False when the order row could not be read back. */
  found: boolean;
}

/**
 * The two things about the *active* order that the board queries deliberately
 * do not fetch: how the customer is paying, and the pickup handover code.
 *
 * Kept out of ORDER_SELECT on purpose. That column list also feeds the
 * available pool, and a code that proves a rider turned up at the counter is
 * not theirs to know before they have claimed the job.
 *
 * The payment pair is probed rather than assumed, because 0025 may not have
 * been applied here.
 */
async function activeOrderDetail(
  supabase: AdminClient,
  orderId: string
): Promise<ActiveOrderDetail> {
  const read = (columns: string) =>
    supabase
      .from("orders")
      .select(columns)
      .eq("id", orderId)
      .maybeSingle()
      .overrideTypes<ActiveOrderRow>();

  const shape = (row: ActiveOrderRow | null, paymentColumns: boolean) => ({
    pickupOtp: row?.pickup_otp ?? null,
    method: row?.payment_method ?? null,
    status: row?.payment_status ?? null,
    paymentColumns,
    found: row !== null,
  });

  if (!columnKnownMissing(PAYMENT_COLUMNS)) {
    const { data, error } = await read("pickup_otp, payment_method, payment_status");
    if (!error) {
      rememberColumn(PAYMENT_COLUMNS, true);
      return shape(data, true);
    }
    if (!isMissingColumn(error)) throw error;
    rememberColumn(PAYMENT_COLUMNS, false);
  }

  const { data, error } = await read("pickup_otp");
  if (error) throw error;
  return shape(data, false);
}

/** A pin, or null when this end has never been placed on a map. */
function pointOf(
  lat: number | null | undefined,
  lng: number | null | undefined
): { lat: number; lng: number } | null {
  if (typeof lat !== "number" || typeof lng !== "number") return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

/**
 * The customer's number for one claimed order.
 *
 * Its own query, scoped to the order the rider is actually carrying. Failure is
 * soft: a rider whose Call button is disabled is worse off than one who can
 * call, but not as badly off as one whose whole board fails to load.
 */
async function activeCustomerPhone(
  supabase: AdminClient,
  orderId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from("orders")
    .select("profiles(phone)")
    .eq("id", orderId)
    .maybeSingle()
    .overrideTypes<{ profiles: { phone: string | null } | { phone: string | null }[] | null }>();

  if (error) return null;
  return one(data?.profiles)?.phone?.trim() || null;
}

/** Cash-at-the-door, decided from what the database actually knows. */
function paymentInstruction(detail: ActiveOrderDetail): CashInstruction {
  // We asked and got nothing. No opinion, and no guessing: collecting from
  // someone who has already paid and handing over free food are both real
  // losses, and choosing between them is an operator's call, not a default.
  if (!detail.found) return "unconfirmed";

  // Before 0025 there was no way to pay online at all, so an order on a
  // database without those columns is COD by construction — genuinely known,
  // not merely unknown.
  if (!detail.paymentColumns) return "collect";

  // Settled either way: the money is with us, or back with the customer.
  // Checked first so it holds whatever the method says.
  if (detail.status === "paid" || detail.status === "refunded") return "prepaid";
  if (detail.method === "cod") return "collect";

  // Authorized: the gateway is holding the customer's money and capturing it is
  // our problem, not the rider's. Nothing to take at the door.
  if (detail.status === "authorized") return "prepaid";

  // Online, and the money never arrived. This order should not have reached a
  // rider; say so rather than pick a side.
  return "unconfirmed";
}

export async function getDriverBoard(driverId: string): Promise<DriverBoardData> {
  const supabase = createAdminClient();

  // One read for the whole board, so every number on it — each offer card's
  // payout and the day's earnings total — is quoted at the same configured
  // rate. `getSettings()` is request-cached and falls back to the shared
  // defaults on an un-migrated database.
  const settings = await getSettings();
  const rate: RiderPayoutConfig = {
    commission: settings.riderCommission,
    minPayout: settings.riderMinPayout,
  };

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
      const leg: Leg = activeRow.status === "picked_up" ? "TO_CUSTOMER" : "TO_PICKUP";
      const [detail, customerPhone] = await Promise.all([
        activeOrderDetail(supabase, order.id),
        activeCustomerPhone(supabase, order.id),
      ]);
      const instruction = paymentInstruction(detail);

      const shop = one(order.restaurants);
      active = {
        job: toJob(order, rate),
        leg,
        payment: {
          instruction,
          // orders.total is the authoritative sum (recompute_order_total) and
          // includes the tip, which on a cash order the rider also collects.
          collectAmount: instruction === "collect" ? (order.total ?? 0) : 0,
        },
        pickupCodeRequired:
          leg === "TO_PICKUP" && Boolean(detail.pickupOtp?.trim()),
        navigateTo:
          leg === "TO_PICKUP"
            ? pointOf(shop?.lat, shop?.lng)
            : pointOf(order.address?.lat, order.address?.lng),
        customerPhone,
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
    .map((r) => toJob(r, rate));

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
    return sum + (order ? payoutFor(order, rate) : 0);
  }, 0);

  return {
    available,
    active,
    today: { trips: done.length, earnings },
  };
}

/** Claim a ready order: create the delivery row assigned to this driver. */
export async function acceptDelivery(
  driverId: string,
  orderId: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createAdminClient();

  // Guard against a double-claim race.
  const { data: existing } = await supabase
    .from("deliveries")
    .select("id, status")
    .eq("order_id", orderId)
    .in("status", ["assigned", "picked_up", "delivered"])
    .maybeSingle();
  if (existing) return { ok: false, error: "already_taken" };

  // No coordinates. This insert used to seed driver_lat/driver_lng with a fixed
  // offset from the centre of Bemetara — 21.7157 + 0.012, 81.5335 - 0.008 — and
  // nothing in the app ever wrote them again, so the dot a customer watched
  // crossing their map had never been anywhere near their courier. Until the
  // rider's device reports (see reportDriverLocation), the honest answer is that
  // we do not know where they are, recorded as 'none' so the tracking map can
  // say "estimated" instead of drawing a confident position.
  const insert = (withSource: boolean) =>
    supabase.from("deliveries").insert({
      order_id: orderId,
      driver_id: driverId,
      status: "assigned",
      assigned_at: new Date().toISOString(),
      ...(withSource ? { driver_location_source: "none" } : {}),
    });

  let withSource = !columnKnownMissing(LOCATION_SOURCE_COLUMN);
  let { error } = await insert(withSource);

  if (error && withSource && isMissingColumn(error)) {
    // 0026 not applied here. A null lat/lng already means "no fix has ever been
    // reported"; the column only makes that explicit, so the job can still be
    // taken without it.
    rememberColumn(LOCATION_SOURCE_COLUMN, false);
    withSource = false;
    ({ error } = await insert(false));
  } else if (!error && withSource) {
    rememberColumn(LOCATION_SOURCE_COLUMN, true);
  }

  if (error) {
    // deliveries.order_id is unique (0001): when two riders tap Accept at once
    // both pass the check above and the loser's insert raises 23505. That's not
    // something the rider can fix — someone simply got there first.
    if ((error as { code?: string }).code === "23505") {
      return { ok: false, error: "already_taken" };
    }
    throw error;
  }
  return { ok: true };
}

/**
 * How far from the operating area a reported fix may be before we treat it as
 * garbage rather than a courier.
 *
 * The cases this catches are all client bugs, not riders: (0, 0) off the coast
 * of Africa, a desktop emulator's San Francisco default, and lat/lng posted the
 * wrong way round (81.5, 21.7 lands in the Arctic Ocean). 1 000 km is
 * deliberately far — it covers every road a Bemetara rider could conceivably be
 * on — so this rejects nonsense without ever refusing a real fix.
 *
 * It is derived from PINNED_LOCATION, i.e. from the single-city assumption. If
 * Deligro opens a city outside this radius, riders there will silently report
 * nothing and their customers will silently get an interpolated dot. Move this
 * with the city list, not after it.
 */
const MAX_FIX_KM = 1000;

export type LocationReport =
  | { ok: true; active: boolean }
  | { ok: false; error: "invalid_position" };

/**
 * Record where the rider's device says it is, on that rider's own in-flight
 * delivery.
 *
 * The row is chosen by driver_id and delivery status, never by an id supplied
 * by the caller: there is no parameter here with which a rider could name
 * somebody else's delivery, so "a driver writing another driver's location" is
 * not a check that can be forgotten — it is unrepresentable.
 *
 * Called from POST /api/driver/location, which authenticates, checks the role
 * and rate-limits before reaching this (createAdminClient bypasses RLS).
 */
export async function reportDriverLocation(
  driverId: string,
  lat: number,
  lng: number
): Promise<LocationReport> {
  // Re-validated here rather than trusted from the route: this is the function
  // that writes, so this is where the position has to be defensible.
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return { ok: false, error: "invalid_position" };
  }
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return { ok: false, error: "invalid_position" };
  }
  if (haversineKm(PINNED_LOCATION.coords, { lat, lng }) > MAX_FIX_KM) {
    return { ok: false, error: "invalid_position" };
  }

  const supabase = createAdminClient();

  const update = (withSource: boolean) =>
    supabase
      .from("deliveries")
      .update({
        driver_lat: lat,
        driver_lng: lng,
        driver_location_at: new Date().toISOString(),
        ...(withSource ? { driver_location_source: "gps" } : {}),
      })
      .eq("driver_id", driverId)
      .in("status", ["assigned", "picked_up"])
      .select("id")
      .overrideTypes<{ id: string }[]>();

  let withSource = !columnKnownMissing(LOCATION_SOURCE_COLUMN);
  let { data, error } = await update(withSource);

  if (error && withSource && isMissingColumn(error)) {
    // 0026 not applied: store the fix anyway. A recent driver_location_at with
    // real coordinates is still better than the interpolation, and the customer
    // UI degrades to treating an unlabelled position as unverified.
    rememberColumn(LOCATION_SOURCE_COLUMN, false);
    withSource = false;
    ({ data, error } = await update(false));
  } else if (!error && withSource) {
    rememberColumn(LOCATION_SOURCE_COLUMN, true);
  }

  if (error) throw error;

  // Nothing matched: this rider has no delivery in flight (finished on another
  // device, or reassigned by an operator). Not an error — but the caller should
  // stop reporting rather than keep asking.
  return { ok: true, active: (data ?? []).length > 0 };
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
    // Picked up → order is on the way, gated by the kitchen's handover code.
    //
    // This transition used to check nothing. The rider was shown
    // `orders.pickup_otp` to read to the counter and could then mark the pickup
    // from anywhere, so the customer's road-leg ETA started from a departure
    // that may not have happened and the kitchen board moved to `on_the_way`
    // for food still sitting on the pass. The code is now the vendor's — shown
    // on their packed order — and the rider enters what they are told, which
    // makes possessing it evidence of having stood at the shop.
    //
    // An order with no code recorded stays ungated: refusing would strand a
    // rider holding real food, and a pre-0006 row genuinely has nothing to
    // check against.
    const { data: order } = await supabase
      .from("orders")
      .select("pickup_otp")
      .eq("id", orderId)
      .maybeSingle();

    const expected = (order?.pickup_otp ?? "").replace(/\D/g, "");
    if (expected && (otp ?? "").replace(/\D/g, "") !== expected) {
      return { ok: false, error: "bad_pickup_otp" };
    }

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

    // Deliberately NOT touching payment_status. A COD order that reaches this
    // line is cash sitting in a rider's pocket, and we hold the service-role key
    // so we *could* write 'paid' — but there is no cash reconciliation behind
    // that word yet: no rider float, no settlement run, nothing that records the
    // money actually reaching Deligro. Writing it would assert a control that
    // does not exist. An online order still at 'pending' here is likewise left
    // alone; it is a real anomaly (delivered but never settled) and it stays
    // visible to operators precisely because nothing papers over it.
    return { ok: true };
  }

  return { ok: false, error: "bad_state" };
}
