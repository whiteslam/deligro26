import "server-only";
import { createClient } from "@/lib/supabase/server";

/**
 * Time series for the admin dashboard charts.
 *
 * `admin-stats` answers "how much, right now" — totals and week-over-week
 * arrows. The web dashboard also needs shape over time, which is what this
 * file supplies: one row per calendar day, gaps filled with zero.
 *
 * The zero-filling matters. A chart drawn only from days that have orders
 * silently compresses a quiet fortnight into a busy-looking line — the same
 * class of lie `admin-stats` was written to stop (it used to render invented
 * figures). A day with no orders is a real data point and is drawn as one.
 *
 * RLS does the scoping: only an admin can read other people's orders
 * (`is_admin()` in 0001_init), and the /admin layout's `requireRole("admin")`
 * has already run before any caller of this renders. No service-role client is
 * needed here, so none is used.
 */

/** One calendar day of platform activity. */
export interface DailyPoint {
  /** ISO date, `YYYY-MM-DD`, in the operator's timezone (see TZ below). */
  date: string;
  /** Short label for the axis, e.g. "8 Aug". */
  label: string;
  orders: number;
  /** Whole rupees. */
  gmv: number;
}

/** One slice of the live order mix. */
export interface StatusSlice {
  status: string;
  label: string;
  count: number;
}

export interface AdminSeries {
  days: DailyPoint[];
  /** Sum over the window — what the chart card's headline quotes. */
  totals: { orders: number; gmv: number };
  /** Busiest day in the window, or null when the window is empty. */
  peak: DailyPoint | null;
}

/**
 * Buckets are cut in Asia/Kolkata, not UTC. An order placed at 11pm IST belongs
 * to that evening's trading day; bucketing in UTC would file it under tomorrow
 * and make every late-night order appear on the wrong bar.
 */
const TZ = "Asia/Kolkata";

const dayKeyFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const dayLabelFmt = new Intl.DateTimeFormat("en-IN", {
  timeZone: TZ,
  day: "numeric",
  month: "short",
});

function dayKey(d: Date): string {
  return dayKeyFmt.format(d); // en-CA gives YYYY-MM-DD
}

/** How far back the charts look by default. */
export const SERIES_DAYS = 30;

/**
 * Daily orders and GMV for the last `days` days, oldest first, zero-filled.
 *
 * Returns an empty-but-complete series on failure rather than throwing: a
 * missing chart is recoverable, a dashboard that 500s because one aggregate
 * query failed is not.
 */
export async function getAdminSeries(
  days = SERIES_DAYS,
  restaurantId?: string
): Promise<AdminSeries> {
  const span = Math.max(1, Math.min(days, 180));

  // Build the buckets first, so the shape of the answer never depends on what
  // came back from the database.
  const buckets = new Map<string, DailyPoint>();
  const now = Date.now();
  for (let i = span - 1; i >= 0; i--) {
    const d = new Date(now - i * 86_400_000);
    buckets.set(dayKey(d), {
      date: dayKey(d),
      label: dayLabelFmt.format(d),
      orders: 0,
      gmv: 0,
    });
  }

  const since = new Date(now - span * 86_400_000).toISOString();

  try {
    const supabase = await createClient();
    let query = supabase
      .from("orders")
      .select("total, created_at")
      .gte("created_at", since)
      .order("created_at");
    if (restaurantId) query = query.eq("restaurant_id", restaurantId);
    const { data, error } = await query;

    if (!error) {
      for (const row of (data ?? []) as {
        total: number | null;
        created_at: string;
      }[]) {
        const bucket = buckets.get(dayKey(new Date(row.created_at)));
        // Orders just outside the window (clock skew, the partial first day)
        // have no bucket. Dropping them is correct — inventing one is not.
        if (!bucket) continue;
        bucket.orders += 1;
        bucket.gmv += Number(row.total ?? 0);
      }
    }
  } catch {
    // Fall through to the zero-filled series.
  }

  const list = [...buckets.values()];
  const totals = list.reduce(
    (acc, d) => ({ orders: acc.orders + d.orders, gmv: acc.gmv + d.gmv }),
    { orders: 0, gmv: 0 }
  );
  const peak = list.reduce<DailyPoint | null>(
    (best, d) => (d.orders > (best?.orders ?? -1) ? d : best),
    null
  );

  return { days: list, totals, peak: totals.orders > 0 ? peak : null };
}

/** Customer-facing stage labels, matching the Orders screen's pills. */
const STATUS_LABELS: Record<string, string> = {
  placed: "Placed",
  kitchen: "Preparing",
  ready: "Ready",
  on_the_way: "On the way",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

/** Draw order, so the donut's slices don't jump around between renders. */
const STATUS_ORDER = [
  "placed",
  "kitchen",
  "ready",
  "on_the_way",
  "delivered",
  "cancelled",
];

/**
 * How the last `days` days of orders ended up, by stage — the donut's data.
 * Stages with no orders are omitted; a window with nothing in it returns [].
 */
export async function getOrderStatusMix(
  days = 7,
  restaurantId?: string
): Promise<StatusSlice[]> {
  const since = new Date(
    Date.now() - Math.max(1, days) * 86_400_000
  ).toISOString();

  let rows: { status: string | null }[] = [];
  try {
    const supabase = await createClient();
    let query = supabase.from("orders").select("status").gte("created_at", since);
    if (restaurantId) query = query.eq("restaurant_id", restaurantId);
    const { data, error } = await query;
    if (error) return [];
    rows = (data ?? []) as { status: string | null }[];
  } catch {
    return [];
  }

  const counts = new Map<string, number>();
  for (const row of rows) {
    const key = row.status ?? "placed";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return STATUS_ORDER.filter((s) => counts.has(s)).map((status) => ({
    status,
    label: STATUS_LABELS[status] ?? status,
    count: counts.get(status) ?? 0,
  }));
}
