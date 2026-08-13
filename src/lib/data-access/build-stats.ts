import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";

/**
 * Live row counts surfaced on `/build` — keyed by table / filter.
 *
 * Counts for tables added by a later migration are `number | null`: null means
 * "that migration has not been applied here", which the panel shows as `—`. A
 * genuine 0 and a missing table are different facts, and an environment running
 * an older schema should not blank the whole board.
 */
export interface BuildDbSnapshot {
  profiles_customer: number;
  profiles_restaurant: number;
  profiles_driver: number;
  profiles_manager: number | null;
  profiles_admin: number;
  restaurants: number;
  restaurants_open: number;
  restaurants_approved: number;
  legacy_restaurants: number;
  distinct_restaurant_owners: number;
  menu_items: number;
  legacy_menu_items: number;
  orders: number;
  legacy_orders: number;
  deliveries: number;
  deliveries_unassigned: number;
  refunds: number;
  refunds_pending: number;
  addresses: number;
  favorites: number | null;
  reviews: number | null;
  banners: number | null;
  coupons: number | null;
  vendor_categories: number | null;
  vendor_documents: number | null;
  vendor_drafts: number | null;
  payments: number | null;
  payments_paid: number | null;
  /** Orders a manager typed on a call. Null before migration 0029. */
  orders_phone: number | null;
}

async function count(
  table: string,
  filter?: { col: string; val: string | boolean }
): Promise<number> {
  const supabase = createAdminClient();
  let q = supabase.from(table).select("*", { count: "exact", head: true });
  if (filter) q = q.eq(filter.col, filter.val);
  const { count: n } = await q;
  return n ?? 0;
}

/** Same, but distinguishes "no rows" (0) from "no such table / column" (null). */
async function countOptional(
  table: string,
  filter?: { col: string; val: string | boolean }
): Promise<number | null> {
  const supabase = createAdminClient();
  let q = supabase.from(table).select("*", { count: "exact", head: true });
  if (filter) q = q.eq(filter.col, filter.val);
  const { count: n, error } = await q;
  if (error) return null;
  return n ?? 0;
}

export async function getBuildDbSnapshot(): Promise<BuildDbSnapshot | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const supabase = createAdminClient();

    const [
      profiles_customer,
      profiles_restaurant,
      profiles_driver,
      profiles_admin,
      restaurants,
      restaurants_open,
      restaurants_approved,
      menu_items,
      orders,
      deliveries,
      deliveries_unassigned,
      refunds,
      refunds_pending,
      addresses,
    ] = await Promise.all([
      count("profiles", { col: "role", val: "customer" }),
      count("profiles", { col: "role", val: "restaurant" }),
      count("profiles", { col: "role", val: "driver" }),
      count("profiles", { col: "role", val: "admin" }),
      count("restaurants"),
      count("restaurants", { col: "is_open", val: true }),
      count("restaurants", { col: "approved", val: true }),
      count("menu_items"),
      count("orders"),
      count("deliveries"),
      count("deliveries", { col: "status", val: "unassigned" }),
      count("refunds"),
      count("refunds", { col: "status", val: "pending" }),
      count("addresses"),
    ]);

    // Everything below arrived with migrations 0011–0029. Counted optionally so
    // a database still on an earlier migration reports `—` for the newer
    // features instead of dropping the entire snapshot.
    const [
      profiles_manager,
      favorites,
      reviews,
      banners,
      coupons,
      vendor_categories,
      vendor_documents,
      vendor_drafts,
      payments,
      payments_paid,
      orders_phone,
    ] = await Promise.all([
      countOptional("profiles", { col: "role", val: "manager" }),
      countOptional("favorites"),
      countOptional("reviews"),
      countOptional("banners"),
      countOptional("coupons"),
      countOptional("vendor_categories"),
      countOptional("vendor_documents"),
      countOptional("vendor_registration_drafts"),
      countOptional("payments"),
      countOptional("payments", { col: "status", val: "paid" }),
      countOptional("orders", { col: "channel", val: "phone" }),
    ]);

    const [{ count: legacy_menu_items }, { count: legacy_orders }] =
      await Promise.all([
        supabase
          .from("menu_items")
          .select("*", { count: "exact", head: true })
          .like("external_id", "legacy-%"),
        supabase
          .from("orders")
          .select("*", { count: "exact", head: true })
          .like("external_id", "legacy-%"),
      ]);

    const { data: ownerRows } = await supabase
      .from("restaurants")
      .select("owner_id, slug");

    const distinct_restaurant_owners = new Set(
      (ownerRows ?? []).map((r) => r.owner_id)
    ).size;
    const legacy_restaurants = (ownerRows ?? []).filter((r) =>
      /-\d+$/.test(r.slug ?? "")
    ).length;

    return {
      profiles_customer,
      profiles_restaurant,
      profiles_driver,
      profiles_manager,
      profiles_admin,
      restaurants,
      restaurants_open,
      restaurants_approved,
      legacy_restaurants,
      distinct_restaurant_owners,
      menu_items,
      legacy_menu_items: legacy_menu_items ?? 0,
      orders,
      legacy_orders: legacy_orders ?? 0,
      deliveries,
      deliveries_unassigned,
      refunds,
      refunds_pending,
      addresses,
      favorites,
      reviews,
      banners,
      coupons,
      vendor_categories,
      vendor_documents,
      vendor_drafts,
      payments,
      payments_paid,
      orders_phone,
    };
  } catch {
    return null;
  }
}
