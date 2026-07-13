import "server-only";
import { createClient } from "@/lib/supabase/server";

/**
 * Real platform numbers for the admin overview.
 *
 * This page used to render `ADMIN_METRICS` from roles-data: "1,284 orders today",
 * "₹4.9L GMV", plus invented security alerts — with no `isSupabaseConfigured`
 * branch at all, so an operator saw fabricated figures and made decisions on
 * them. Every number below is counted from the database, and a quiet day reads
 * as zero rather than as a busy one.
 *
 * RLS does the scoping: only an admin can see other people's orders (see the
 * `is_admin()` policies in 0001_init), and the admin layout already enforces the
 * role before this runs.
 */

export interface AdminMetrics {
  ordersToday: number;
  gmvToday: number;
  activeRiders: number;
  pendingApprovals: number;
}

export interface PendingRestaurant {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
}

function startOfToday(): string {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now.toISOString();
}

export async function getAdminMetrics(): Promise<AdminMetrics> {
  const supabase = await createClient();
  const since = startOfToday();

  const [todaysOrders, riders, approvals] = await Promise.all([
    supabase.from("orders").select("total").gte("created_at", since),
    // A rider is "active" if they're mid-delivery right now.
    supabase
      .from("deliveries")
      .select("driver_id")
      .in("status", ["assigned", "picked_up"]),
    supabase
      .from("restaurants")
      .select("id", { count: "exact", head: true })
      .eq("approved", false),
  ]);

  const orders = todaysOrders.data ?? [];
  const gmvToday = orders.reduce(
    (sum, o) => sum + Number((o as { total: number }).total ?? 0),
    0
  );

  const driverIds = new Set(
    (riders.data ?? [])
      .map((d) => (d as { driver_id: string | null }).driver_id)
      .filter(Boolean)
  );

  return {
    ordersToday: orders.length,
    gmvToday,
    activeRiders: driverIds.size,
    pendingApprovals: approvals.count ?? 0,
  };
}

/** Restaurants waiting on an admin — the real queue, not a hardcoded list. */
export async function listPendingRestaurants(): Promise<PendingRestaurant[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("restaurants")
    .select("id, name, slug, created_at")
    .eq("approved", false)
    .order("created_at", { ascending: true });

  if (error) throw error;

  return (data ?? []).map((r) => {
    const row = r as { id: string; name: string; slug: string; created_at: string };
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      createdAt: row.created_at,
    };
  });
}

/** Approve a restaurant so its storefront goes live. Admin-only via RLS. */
export async function approveRestaurant(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("restaurants")
    .update({ approved: true })
    .eq("id", id);

  if (error) throw error;
}
