import "server-only";
import { createClient } from "@/lib/supabase/server";
import { computeChargesWith } from "@/lib/pricing";
import { getSettings } from "@/lib/settings";
import { onlinePaymentsEnabled } from "@/lib/payments/availability";
import {
  notifyOrderPlaced,
  notifyVendorNewOrder,
} from "@/lib/notifications/order-events";
import {
  columnKnownMissing,
  isMissingColumn,
  rememberColumn,
} from "@/lib/data-access/schema-probe";
import type { PaymentMethod, PaymentStatus } from "@/types";

/**
 * Secure data access for orders. Every query here runs through the anon key,
 * so Row Level Security is in force: the database returns a row ONLY if the
 * caller is allowed to see it (own order / owning restaurant / actively-assigned
 * driver / admin). App code cannot accidentally widen that — the fix for IDOR
 * lives in the DB, not in remembering to add a `where`.
 */

export interface OrderItem {
  name: string;
  qty: number;
  price: number;
}

export interface Order {
  id: string;
  restaurant_id: string;
  status: string;
  total: number;
  delivery_fee: number;
  tax_amount: number;
  tip: number;
  /** Present once migration 0025 is applied; COD before that. */
  payment_method?: PaymentMethod;
  payment_status?: PaymentStatus;
  created_at: string;
  address: { label?: string; line?: string } | null;
  order_items: OrderItem[];
  restaurants?: {
    slug: string;
    name: string;
    image_url?: string | null;
    accent_tint?: string | null;
    eta_min?: number | null;
    eta_max?: number | null;
  } | null;
}

const TIP_COLUMN = "orders.tip";
/** The payment columns arrive together in 0025, so one probe covers both. */
const PAYMENT_COLUMNS = "orders.payment_method";

interface SelectFlags {
  /** `tip` only exists once migration 0013 has been applied. */
  tip: boolean;
  /** `payment_method` / `payment_status` only exist from 0025. */
  payment: boolean;
}

function select(flags: SelectFlags): string {
  return [
    "id, restaurant_id, status, total, delivery_fee, tax_amount",
    flags.tip ? ", tip" : "",
    flags.payment ? ", payment_method, payment_status" : "",
    ", created_at, address",
    ", order_items(name, qty, price, menu_items(external_id, veg))",
    ", restaurants(slug, name, image_url, accent_tint, eta_min, eta_max)",
  ].join("");
}

interface QueryResult<T> {
  data: T | null;
  error: { code?: string } | null;
}

/**
 * Run an order query, narrowing the column list on a database that predates
 * 0013 or 0025.
 *
 * Each optional group is dropped independently and remembered, so an
 * environment missing one migration still gets everything the other provides —
 * and after the first probe the retry cost is gone.
 */
async function selectOrders<T>(
  run: (columns: string) => PromiseLike<QueryResult<T>>
): Promise<T | null> {
  const flags: SelectFlags = {
    tip: !columnKnownMissing(TIP_COLUMN),
    payment: !columnKnownMissing(PAYMENT_COLUMNS),
  };

  // `isMissingColumn` doesn't say WHICH column is missing, so drop the newest
  // migration's group first and re-probe rather than guessing. At most one
  // attempt per still-optimistic group, plus the final bare one.
  const groups: Array<{ key: keyof SelectFlags; column: string }> = [
    { key: "payment", column: PAYMENT_COLUMNS },
    { key: "tip", column: TIP_COLUMN },
  ];

  for (const { key, column } of groups) {
    if (!flags[key]) continue;

    const { data, error } = await run(select(flags));
    if (!error) {
      for (const g of groups) if (flags[g.key]) rememberColumn(g.column, true);
      return data;
    }
    if (!isMissingColumn(error)) throw error;

    rememberColumn(column, false);
    flags[key] = false;
  }

  const { data, error } = await run(select(flags));
  if (error) throw error;
  return data;
}


export interface CreateOrderLine {
  itemId: string;
  qty: number;
}

export interface CreateOrderInput {
  restaurantSlug: string;
  lines: CreateOrderLine[];
  address: { label: string; line: string };
  /** Courier tip, in whole rupees. Clamped server-side to what the UI offers. */
  tip?: number;
  /**
   * How the customer intends to pay. Defaults to COD, and `online` is honoured
   * only when the server itself says online payment is on offer — the client
   * asking for it is a request, not a decision.
   */
  paymentMethod?: PaymentMethod;
}

/** Place an order — prices validated server-side from menu_items, never trusted from client. */
export async function createOrder(input: CreateOrderInput): Promise<Order> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("unauthorized");

  const { data: restaurant, error: restaurantError } = await supabase
    .from("restaurants")
    .select("id, slug, name, is_open")
    .eq("slug", input.restaurantSlug)
    .eq("approved", true)
    .maybeSingle();

  if (restaurantError) throw restaurantError;
  if (!restaurant?.id) throw new Error("restaurant_not_found");
  if (!restaurant.is_open) throw new Error("restaurant_closed");

  if (!input.lines.length) throw new Error("empty_cart");

  const externalIds = [...new Set(input.lines.map((l) => l.itemId))];
  const { data: menuItems, error: menuError } = await supabase
    .from("menu_items")
    .select("id, external_id, name, price, available")
    .eq("restaurant_id", restaurant.id)
    .in("external_id", externalIds);

  if (menuError) throw menuError;
  if (!menuItems?.length) throw new Error("invalid_items");

  const itemSubtotal = input.lines.reduce((sum, line) => {
    const item = menuItems.find((m) => m.external_id === line.itemId);
    if (!item || !item.available || line.qty < 1) {
      throw new Error("invalid_items");
    }
    return sum + item.price * line.qty;
  }, 0);

  // Charges are derived here from the live platform settings and the DB's own
  // prices — the client sends items and a tip, never an amount. This is the
  // authoritative bill: whatever fee/tax/threshold the admin set applies here.
  const settings = await getSettings();
  const charges = computeChargesWith(
    {
      deliveryFee: settings.deliveryFee,
      taxRate: settings.taxRate,
      freeDeliveryThreshold: settings.freeDeliveryThreshold,
    },
    itemSubtotal,
    input.tip ?? 0
  );

  // The client may ASK to pay online; whether that is on offer is the server's
  // call. Asking while it is switched off (or unconfigured) is refused loudly
  // rather than quietly downgraded to COD — silently changing how someone pays
  // is its own kind of wrong.
  const wantsOnline = input.paymentMethod === "online";
  if (wantsOnline && !(await onlinePaymentsEnabled())) {
    throw new Error("online_payments_unavailable");
  }
  const paymentMethod: PaymentMethod = wantsOnline ? "online" : "cod";

  const base: Record<string, unknown> = {
    customer_id: user.id,
    restaurant_id: restaurant.id,
    status: "placed",
    delivery_fee: charges.deliveryFee,
    tax_amount: charges.taxes,
    // Placeholder: recompute_order_total() below writes the authoritative sum.
    total: 0,
    address: input.address,
  };

  // `payment_status` is deliberately not sent: the 0025 insert trigger pins it
  // to 'pending' for anything holding a user JWT, so sending it would be theatre.
  const insertOrder = (withTip: boolean, withPayment: boolean) =>
    supabase
      .from("orders")
      .insert({
        ...base,
        ...(withTip ? { tip: charges.tip } : {}),
        ...(withPayment ? { payment_method: paymentMethod } : {}),
      })
      .select("id")
      .single();

  let withTip = !columnKnownMissing(TIP_COLUMN);
  let withPayment = !columnKnownMissing(PAYMENT_COLUMNS);

  let { data: order, error: orderError } = await insertOrder(withTip, withPayment);

  if (orderError && isMissingColumn(orderError) && withPayment) {
    // Migration 0025 hasn't been applied. COD is what this database can record,
    // so a COD order proceeds unchanged; an online one cannot be taken at all.
    rememberColumn(PAYMENT_COLUMNS, false);
    if (paymentMethod === "online") throw new Error("online_payments_unavailable");
    withPayment = false;
    ({ data: order, error: orderError } = await insertOrder(withTip, false));
  }

  if (orderError && isMissingColumn(orderError) && withTip) {
    // Migration 0013 hasn't been applied. We can still take the order — but we
    // cannot take the tip, because there is nowhere to put it and charging for
    // something we can't record is exactly the bug this replaced. Refuse the tip
    // loudly instead of pocketing it silently.
    rememberColumn(TIP_COLUMN, false);
    if (charges.tip > 0) throw new Error("tip_unsupported");
    withTip = false;
    ({ data: order, error: orderError } = await insertOrder(false, withPayment));
  }

  if (orderError) throw orderError;
  if (!order) throw new Error("order_not_created");

  const orderItems = input.lines.map((line) => {
    const item = menuItems.find((m) => m.external_id === line.itemId)!;
    return {
      order_id: order.id,
      menu_item_id: item.id,
      name: item.name,
      qty: line.qty,
      price: item.price,
    };
  });

  const { error: itemsError } = await supabase
    .from("order_items")
    .insert(orderItems);
  if (itemsError) throw itemsError;

  const { error: totalError } = await supabase.rpc("recompute_order_total", {
    oid: order.id,
  });
  if (totalError) throw totalError;

  // Announce it. Fire-and-forget by contract (order-events swallows its own
  // failures), and deliberately not awaited as a pair with the insert: the
  // order is already real, and a push outage must not fail a placed order.
  void notifyOrderPlaced(order.id);

  // The vendor is alerted only once the order is actually theirs to cook. A COD
  // order is actionable immediately; an online one is not until the money
  // lands, and settlePayment() raises the alert then. Without this split a
  // kitchen would be rung for every abandoned checkout.
  if (paymentMethod === "cod") {
    void notifyVendorNewOrder(order.id, input.lines.length);
  }

  const created = await getOrderById(order.id);
  if (!created) throw new Error("order_not_found");
  return created;
}

/** One order by id, or null if it doesn't exist OR isn't visible to the caller. */
export async function getOrderById(id: string): Promise<Order | null> {
  const supabase = await createClient();
  const data = await selectOrders<Record<string, unknown>>((columns) =>
    supabase
      .from("orders")
      .select(columns)
      .eq("id", id)
      .maybeSingle()
      .overrideTypes<Record<string, unknown>>()
  );

  if (!data) return null;
  const row = data;
  const restaurants = row.restaurants;
  const restaurant = Array.isArray(restaurants) ? restaurants[0] : restaurants;
  return { ...row, restaurants: restaurant ?? null } as Order;
}

/**
 * Orders visible to the current user. No explicit `where user = me` needed:
 * RLS already scopes the result to what this role may see. A customer gets
 * their own; a vendor gets its restaurant's; a driver gets active assignments.
 */
export async function listVisibleOrders(): Promise<Order[]> {
  const supabase = await createClient();
  const data = await selectOrders<Record<string, unknown>[]>((columns) =>
    supabase
      .from("orders")
      .select(columns)
      .order("created_at", { ascending: false })
      .overrideTypes<Record<string, unknown>[]>()
  );

  return (data ?? []).map((row) => {
    const record = row as Record<string, unknown>;
    const restaurants = record.restaurants;
    const restaurant = Array.isArray(restaurants) ? restaurants[0] : restaurants;
    return { ...record, restaurants: restaurant ?? null } as Order;
  });
}
