import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";

/** Live row counts surfaced on `/build` — keyed by table / filter. */
export interface BuildDbSnapshot {
  profiles_customer: number;
  profiles_restaurant: number;
  profiles_driver: number;
  profiles_admin: number;
  restaurants: number;
  restaurants_open: number;
  restaurants_approved: number;
  legacy_restaurants: number;
  distinct_restaurant_owners: number;
  menu_items: number;
  legacy_menu_items: number;
  orders: number;
  deliveries: number;
  deliveries_unassigned: number;
  refunds: number;
  refunds_pending: number;
  addresses: number;
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

    const { count: legacy_menu_items } = await supabase
      .from("menu_items")
      .select("*", { count: "exact", head: true })
      .like("external_id", "legacy-%");

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
      profiles_admin,
      restaurants,
      restaurants_open,
      restaurants_approved,
      legacy_restaurants,
      distinct_restaurant_owners,
      menu_items,
      legacy_menu_items: legacy_menu_items ?? 0,
      orders,
      deliveries,
      deliveries_unassigned,
      refunds,
      refunds_pending,
      addresses,
    };
  } catch {
    return null;
  }
}
