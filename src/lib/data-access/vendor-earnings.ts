import "server-only";
import { createClient } from "@/lib/supabase/server";

export interface VendorEarningsDay {
  day: string;
  amount: number;
  orders: number;
}

export interface VendorEarningsSummary {
  weekTotal: number;
  orderCount: number;
  daily: VendorEarningsDay[];
  lifetimeTotal: number;
  lifetimeOrders: number;
  avgOrderValue: number;
  lifetimeAvgOrderValue: number;
  todayRevenue: number;
  todayOrders: number;
  lastWeekTotal: number;
  lastWeekOrders: number;
  weekChangePercent: number | null;
  cancelledCount: number;
  cancelledValue: number;
  pendingCount: number;
  pendingValue: number;
  bestDay: string;
  bestDayAmount: number;
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

const REVENUE_STATUSES = [
  "kitchen",
  "ready",
  "on_the_way",
  "delivered",
] as const;

const PENDING_STATUSES = ["placed", "kitchen", "ready", "on_the_way"] as const;

function startOfWeek(d: Date): Date {
  const copy = new Date(d);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function startOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function sumOrders(
  rows: { total: number }[] | null | undefined
): { total: number; count: number } {
  let total = 0;
  let count = 0;
  for (const row of rows ?? []) {
    total += Number(row.total) || 0;
    count += 1;
  }
  return { total, count };
}

function weekChangePercent(
  current: number,
  previous: number
): number | null {
  if (previous === 0) return current > 0 ? 100 : null;
  return Math.round(((current - previous) / previous) * 100);
}

/** Aggregate order totals for the current calendar week (Mon–Sun) plus key metrics. */
export async function getVendorEarningsSummary(
  restaurantId: string
): Promise<VendorEarningsSummary> {
  const supabase = await createClient();
  const now = new Date();
  const weekStart = startOfWeek(now);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const lastWeekStart = new Date(weekStart);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);
  const todayStart = startOfDay(now);

  const [
    weekResult,
    lastWeekResult,
    todayResult,
    cancelledResult,
    pendingResult,
    lifetimeResult,
  ] = await Promise.all([
    supabase
      .from("orders")
      .select("total, created_at, status")
      .eq("restaurant_id", restaurantId)
      .in("status", [...REVENUE_STATUSES])
      .gte("created_at", weekStart.toISOString())
      .lt("created_at", weekEnd.toISOString()),
    supabase
      .from("orders")
      .select("total")
      .eq("restaurant_id", restaurantId)
      .in("status", [...REVENUE_STATUSES])
      .gte("created_at", lastWeekStart.toISOString())
      .lt("created_at", weekStart.toISOString()),
    supabase
      .from("orders")
      .select("total")
      .eq("restaurant_id", restaurantId)
      .in("status", [...REVENUE_STATUSES])
      .gte("created_at", todayStart.toISOString()),
    supabase
      .from("orders")
      .select("total")
      .eq("restaurant_id", restaurantId)
      .eq("status", "cancelled")
      .gte("created_at", weekStart.toISOString())
      .lt("created_at", weekEnd.toISOString()),
    supabase
      .from("orders")
      .select("total")
      .eq("restaurant_id", restaurantId)
      .in("status", [...PENDING_STATUSES]),
    supabase
      .from("orders")
      .select("total")
      .eq("restaurant_id", restaurantId)
      .eq("status", "delivered"),
  ]);

  if (weekResult.error) throw weekResult.error;

  const amountBuckets = new Map<number, number>();
  const orderBuckets = new Map<number, number>();
  for (let i = 0; i < 7; i++) {
    amountBuckets.set(i, 0);
    orderBuckets.set(i, 0);
  }

  let weekTotal = 0;
  let orderCount = 0;

  for (const row of weekResult.data ?? []) {
    const created = new Date(row.created_at);
    const idx = created.getDay();
    const total = Number(row.total) || 0;
    amountBuckets.set(idx, (amountBuckets.get(idx) ?? 0) + total);
    orderBuckets.set(idx, (orderBuckets.get(idx) ?? 0) + 1);
    weekTotal += total;
    orderCount += 1;
  }

  const daily: VendorEarningsDay[] = [1, 2, 3, 4, 5, 6, 0].map((dayIdx) => ({
    day: DAY_LABELS[dayIdx],
    amount: amountBuckets.get(dayIdx) ?? 0,
    orders: orderBuckets.get(dayIdx) ?? 0,
  }));

  const best = daily.reduce(
    (top, d) => (d.amount > top.amount ? d : top),
    daily[0] ?? { day: "—", amount: 0, orders: 0 }
  );

  const lastWeek = sumOrders(lastWeekResult.data);
  const today = sumOrders(todayResult.data);
  const cancelled = sumOrders(cancelledResult.data);
  const pending = sumOrders(pendingResult.data);
  const lifetime = sumOrders(lifetimeResult.data);

  return {
    weekTotal,
    orderCount,
    daily,
    lifetimeTotal: lifetime.total,
    lifetimeOrders: lifetime.count,
    avgOrderValue: orderCount > 0 ? Math.round(weekTotal / orderCount) : 0,
    lifetimeAvgOrderValue:
      lifetime.count > 0 ? Math.round(lifetime.total / lifetime.count) : 0,
    todayRevenue: today.total,
    todayOrders: today.count,
    lastWeekTotal: lastWeek.total,
    lastWeekOrders: lastWeek.count,
    weekChangePercent: weekChangePercent(weekTotal, lastWeek.total),
    cancelledCount: cancelled.count,
    cancelledValue: cancelled.total,
    pendingCount: pending.count,
    pendingValue: pending.total,
    bestDay: best.day,
    bestDayAmount: best.amount,
  };
}
