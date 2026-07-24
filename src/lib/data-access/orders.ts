import "server-only";
import { createClient } from "@/lib/supabase/server";
import { computeChargesWith } from "@/lib/pricing";
import { getSettings } from "@/lib/settings";
import {
  columnKnownMissing,
  isMissingColumn,
  rememberColumn,
} from "@/lib/data-access/schema-probe";

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

/** `tip` only exists once migration 0013 has been applied — see schema-probe. */
function select(withTip: boolean): string {
  return [
    "id, restaurant_id, status, total, delivery_fee, tax_amount",
    withTip ? ", tip" : "",
    ", created_at, address",
    ", order_items(name, qty, price, menu_items(external_id, veg))",
    ", restaurants(slug, name, image_url, accent_tint, eta_min, eta_max)",
  ].join("");
}

interface QueryResult<T> {
  data: T | null;
  error: { code?: string } | null;
}

/** Run an order query, retrying without `tip` on a database that predates 0013. */
async function selectOrders<T>(
  run: (columns: string) => PromiseLike<QueryResult<T>>
): Promise<T | null> {
  if (!columnKnownMissing(TIP_COLUMN)) {
    const { data, error } = await run(select(true));
    if (!error) {
      rememberColumn(TIP_COLUMN, true);
      return data;
    }
    if (!isMissingColumn(error)) throw error;
    rememberColumn(TIP_COLUMN, false);
  }

  const { data, error } = await run(select(false));
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

  const insertOrder = (withTip: boolean) =>
    supabase
      .from("orders")
      .insert(withTip ? { ...base, tip: charges.tip } : base)
      .select("id")
      .single();

  let { data: order, error: orderError } = await insertOrder(
    !columnKnownMissing(TIP_COLUMN)
  );

  if (orderError && isMissingColumn(orderError)) {
    // Migration 0013 hasn't been applied. We can still take the order — but we
    // cannot take the tip, because there is nowhere to put it and charging for
    // something we can't record is exactly the bug this replaced. Refuse the tip
    // loudly instead of pocketing it silently.
    rememberColumn(TIP_COLUMN, false);
    if (charges.tip > 0) throw new Error("tip_unsupported");
    ({ data: order, error: orderError } = await insertOrder(false));
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
