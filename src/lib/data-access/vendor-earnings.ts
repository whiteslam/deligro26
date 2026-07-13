import "server-only";
import { createClient } from "@/lib/supabase/server";

/**
 * What this restaurant actually took, from its own delivered orders.
 *
 * The earnings screen used to be entirely invented: a hardcoded week of revenue
 * (₹8,200 … ₹16,900), "212 orders", an "18% commission" applied to nothing, and
 * two settled payouts to a bank account that doesn't exist. A real vendor read
 * that as their money.
 *
 * Two things are deliberately absent rather than faked: commission (no
 * commission is deducted anywhere in the order path — inventing a rate would be
 * inventing a debt) and payouts (there is no payout pipeline). When those exist,
 * they belong here.
 *
 * RLS scopes every row to the caller's own restaurant.
 */

export interface EarningsDay {
  /** ISO date, e.g. 2026-07-14. */
  date: string;
  label: string;
  amount: number;
}

export interface VendorEarnings {
  week: EarningsDay[];
  weekTotal: number;
  weekOrders: number;
  /** True when the shop has never had a delivered order. */
  empty: boolean;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export async function getVendorEarnings(): Promise<VendorEarnings> {
  const supabase = await createClient();

  // Last 7 days, midnight-aligned, oldest first.
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setTime(start.getTime() - 6 * DAY_MS);

  const { data, error } = await supabase
    .from("orders")
    .select("total, created_at, status")
    .gte("created_at", start.toISOString())
    .eq("status", "delivered");

  if (error) throw error;

  const rows = (data ?? []) as { total: number; created_at: string }[];

  const week: EarningsDay[] = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(start.getTime() + i * DAY_MS);
    return {
      date: day.toISOString().slice(0, 10),
      label: day.toLocaleDateString("en-IN", { weekday: "short" }),
      amount: 0,
    };
  });

  const byDate = new Map(week.map((d) => [d.date, d]));
  for (const row of rows) {
    const key = row.created_at.slice(0, 10);
    const day = byDate.get(key);
    if (day) day.amount += Number(row.total ?? 0);
  }

  const weekTotal = week.reduce((sum, d) => sum + d.amount, 0);

  return {
    week,
    weekTotal,
    weekOrders: rows.length,
    empty: rows.length === 0,
  };
}
