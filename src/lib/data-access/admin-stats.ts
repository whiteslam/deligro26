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

/** A period-over-period movement: the % change and which way it points. */
export interface Trend {
  /** Signed percentage change, one decimal. 0 when flat or immeasurable. */
  pct: number;
  direction: "up" | "down" | "flat";
}

export interface AdminDashboard {
  totals: {
    shops: number;
    users: number;
    drivers: number;
    orders: number;
  };
  today: {
    orders: number;
    gmv: number;
    activeRiders: number;
    pendingApprovals: number;
  };
  /** This week vs the week before — the arrows on the total cards. */
  trends: {
    shops: Trend;
    users: Trend;
    orders: Trend;
    gmv: Trend;
  };
}

function startOfToday(): string {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now.toISOString();
}

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();
}

/** Growth of `curr` over `prev`. A jump from nothing reads as up, not ∞. */
function trend(curr: number, prev: number): Trend {
  if (prev <= 0) {
    if (curr <= 0) return { pct: 0, direction: "flat" };
    return { pct: 100, direction: "up" };
  }
  const pct = ((curr - prev) / prev) * 100;
  const direction = pct > 0.5 ? "up" : pct < -0.5 ? "down" : "flat";
  return { pct: Math.round(pct * 10) / 10, direction };
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

/**
 * The whole admin overview in one shot: platform totals, today's pulse, and the
 * week-over-week trend arrows. Every figure is counted from the database; a
 * failing sub-query resolves to 0 rather than throwing, so one missing table
 * can't blank the entire dashboard.
 */
export async function getAdminDashboard(): Promise<AdminDashboard> {
  const supabase = await createClient();
  const d7 = daysAgo(7);
  const d14 = daysAgo(14);
  const todayStart = startOfToday();

  // A head+count query, hardened to return a plain number.
  const countOf = async (
    build: () => PromiseLike<{ count: number | null; error: unknown }>
  ): Promise<number> => {
    try {
      const { count, error } = await build();
      return error ? 0 : count ?? 0;
    } catch {
      return 0;
    }
  };

  const [
    shops,
    users,
    drivers,
    orders,
    pendingApprovals,
    shopsCurr,
    shopsPrev,
    usersCurr,
    usersPrev,
    riders,
    recentOrders,
  ] = await Promise.all([
    countOf(() =>
      supabase
        .from("restaurants")
        .select("id", { count: "exact", head: true })
        .eq("approved", true)
    ),
    countOf(() =>
      supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("role", "customer")
    ),
    countOf(() =>
      supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("role", "driver")
    ),
    countOf(() =>
      supabase.from("orders").select("id", { count: "exact", head: true })
    ),
    countOf(() =>
      supabase
        .from("restaurants")
        .select("id", { count: "exact", head: true })
        .eq("approved", false)
    ),
    // Restaurants onboarded this week vs last.
    countOf(() =>
      supabase
        .from("restaurants")
        .select("id", { count: "exact", head: true })
        .gte("created_at", d7)
    ),
    countOf(() =>
      supabase
        .from("restaurants")
        .select("id", { count: "exact", head: true })
        .gte("created_at", d14)
        .lt("created_at", d7)
    ),
    // New customers this week vs last.
    countOf(() =>
      supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("role", "customer")
        .gte("created_at", d7)
    ),
    countOf(() =>
      supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("role", "customer")
        .gte("created_at", d14)
        .lt("created_at", d7)
    ),
    // Riders mid-delivery right now.
    supabase
      .from("deliveries")
      .select("driver_id")
      .in("status", ["assigned", "picked_up"]),
    // One 14-day pull covers order + GMV trends and today's figures.
    supabase.from("orders").select("total, created_at").gte("created_at", d14),
  ]);

  const rows = (recentOrders.data ?? []) as {
    total: number | null;
    created_at: string;
  }[];

  let ordersToday = 0;
  let gmvToday = 0;
  let ordersCurr = 0;
  let ordersPrev = 0;
  let gmvCurr = 0;
  let gmvPrev = 0;
  for (const o of rows) {
    const amount = Number(o.total ?? 0);
    const at = o.created_at;
    if (at >= d7) {
      ordersCurr += 1;
      gmvCurr += amount;
    } else if (at >= d14) {
      ordersPrev += 1;
      gmvPrev += amount;
    }
    if (at >= todayStart) {
      ordersToday += 1;
      gmvToday += amount;
    }
  }

  const activeRiders = new Set(
    (riders.data ?? [])
      .map((d) => (d as { driver_id: string | null }).driver_id)
      .filter(Boolean)
  ).size;

  return {
    totals: { shops, users, drivers, orders },
    today: { orders: ordersToday, gmv: gmvToday, activeRiders, pendingApprovals },
    trends: {
      shops: trend(shopsCurr, shopsPrev),
      users: trend(usersCurr, usersPrev),
      orders: trend(ordersCurr, ordersPrev),
      gmv: trend(gmvCurr, gmvPrev),
    },
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
