"use client";

import { useMemo, useState } from "react";
import { Loader2, Search, X } from "lucide-react";
import { OrderCard } from "@/components/orders/order-card";
import { formatIst, istDateKey } from "@/lib/utils/ist-time";
import type { UiOrder } from "@/lib/utils/order-map";
import { cn } from "@/lib/utils/cn";

/**
 * Below this there is nothing to find, so the search box is chrome. Filters
 * stay, because two of three rows being cancellations is a state worth sorting
 * out at any length.
 */
const SEARCH_FROM = 6;

type Filter = "all" | "delivered" | "cancelled";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "delivered", label: "Delivered" },
  { key: "cancelled", label: "Cancelled" },
];

/**
 * The month an order belongs to, as a heading.
 *
 * Mock orders (no backend) carry no `createdAt`, only a human `placedAt`
 * label — they group under "Earlier" rather than being dated by guesswork.
 */
function monthKey(order: UiOrder): string {
  if (!order.createdAt) return "Earlier";
  const d = new Date(order.createdAt);
  if (Number.isNaN(d.getTime())) return "Earlier";
  // IST months, not the runtime's: this also renders on the server (UTC), where
  // an order from 1 am IST on the 1st landed in the previous month.
  const orderMonth = istDateKey(d).slice(0, 7); // YYYY-MM
  const thisMonth = istDateKey().slice(0, 7);
  if (orderMonth === thisMonth) return "This month";
  return formatIst(d, {
    month: "long",
    ...(orderMonth.slice(0, 4) === thisMonth.slice(0, 4)
      ? {}
      : { year: "numeric" }),
  });
}

/**
 * Order history you can actually get through.
 *
 * A regular customer's list is one restaurant name repeated down the screen,
 * most of it cancellations, dated by a weekday that stops meaning anything
 * after a week. Three things fix that and all three are free: say which of
 * them actually arrived, let someone type a dish they remember, and break the
 * run of rows by month so scrolling has landmarks.
 *
 * Filtering is client-side because the whole list is already here — the page
 * fetches at most 100 rows (`listMyOrders`) and sends them down in one go, so a
 * round trip per keystroke would be buying nothing.
 */
export function OrderHistory({
  orders: firstPage,
  hasMore: moreOnServer,
}: {
  orders: UiOrder[];
  /** True when the server's read was capped, so older orders exist. */
  hasMore: boolean;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");

  /**
   * Pages fetched since the first paint, appended in order. Kept separate from
   * the server's page so a refresh of the screen — the 10s poll, a pull — does
   * not silently drop what someone has already loaded.
   */
  const [extra, setExtra] = useState<UiOrder[]>([]);
  const [hasMore, setHasMore] = useState(moreOnServer);
  const [loading, setLoading] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);

  const orders = useMemo(() => {
    if (!extra.length) return firstPage;
    // The server page can overtake a fetched one if an order was cancelled
    // between the two reads. Dedupe by id rather than trusting the ordering.
    const seen = new Set(firstPage.map((o) => o.id));
    return [...firstPage, ...extra.filter((o) => !seen.has(o.id))];
  }, [firstPage, extra]);

  async function loadOlder() {
    const oldest = orders[orders.length - 1]?.createdAt;
    // No `createdAt` means these are the mock orders, which have no server to
    // page against — and `hasMore` is false for them, so this is unreachable
    // rather than merely unlikely.
    if (!oldest || loading) return;
    setLoading(true);
    setPageError(null);
    try {
      const res = await fetch(
        `/api/orders/history?before=${encodeURIComponent(oldest)}`,
      );
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        orders?: UiOrder[];
        hasMore?: boolean;
      } | null;
      if (!res.ok || !data?.ok || !data.orders) {
        setPageError("Couldn't load older orders. Try again.");
        return;
      }
      setExtra((prev) => [...prev, ...data.orders!]);
      setHasMore(Boolean(data.hasMore));
    } catch {
      setPageError("Couldn't load older orders. Try again.");
    } finally {
      setLoading(false);
    }
  }

  const counts = useMemo(
    () => ({
      all: orders.length,
      delivered: orders.filter((o) => o.status === "DELIVERED").length,
      cancelled: orders.filter((o) => o.status === "CANCELLED").length,
    }),
    [orders],
  );

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return orders.filter((o) => {
      if (filter === "delivered" && o.status !== "DELIVERED") return false;
      if (filter === "cancelled" && o.status !== "CANCELLED") return false;
      if (!q) return true;
      // Restaurant or dish: people remember "the biryani one" at least as often
      // as they remember where it came from.
      return (
        o.restaurantName.toLowerCase().includes(q) ||
        o.lines.some((l) => l.name.toLowerCase().includes(q))
      );
    });
  }, [orders, filter, query]);

  /** Months in the order they already arrive in — newest first, from the query. */
  const groups = useMemo(() => {
    const out: { key: string; orders: UiOrder[] }[] = [];
    for (const o of shown) {
      const key = monthKey(o);
      const last = out[out.length - 1];
      if (last && last.key === key) last.orders.push(o);
      else out.push({ key, orders: [o] });
    }
    return out;
  }, [shown]);

  return (
    <section>
      <h2 className="mb-2 text-[13px] font-bold uppercase tracking-[0.06em] text-muted">
        Past orders
      </h2>

      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              aria-pressed={active}
              className={cn(
                "press shrink-0 rounded-full border px-3.5 py-1.5 text-[13px] font-bold transition-colors",
                active
                  ? "border-transparent bg-ink text-bg"
                  : "border-line bg-surface text-muted",
              )}
            >
              {f.label}
              <span className={cn("ml-1.5", active ? "opacity-70" : "")}>
                {counts[f.key]}
              </span>
            </button>
          );
        })}
      </div>

      {orders.length >= SEARCH_FROM ? (
        <div className="relative mt-3">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            type="search"
            enterKeyHint="search"
            placeholder="Search a restaurant or a dish"
            aria-label="Search your orders"
            className="h-11 w-full rounded-full border border-line bg-surface-2 pl-10 pr-10 text-[15px] outline-none placeholder:text-muted focus:border-accent"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full text-muted"
            >
              <X className="size-4" />
            </button>
          ) : null}
        </div>
      ) : null}

      {groups.length ? (
        groups.map((g) => (
          <div key={g.key} className="mt-4">
            <h3 className="mb-0.5 text-[12px] font-bold uppercase tracking-[0.08em] text-muted">
              {g.key}
            </h3>
            <div className="divide-y divide-line">
              {g.orders.map((o) => (
                <OrderCard key={o.id} order={o} />
              ))}
            </div>
          </div>
        ))
      ) : (
        /* Narrowed to nothing, which is not the same as having no history —
           say which, and give back the way out. */
        <div className="mt-4 rounded-2xl border border-dashed border-line px-4 py-8 text-center">
          <p className="text-[15px] font-bold">Nothing matches</p>
          <p className="mx-auto mt-1 max-w-[32ch] text-[13px] leading-snug text-muted">
            {query
              ? `No order here mentions “${query.trim()}”.`
              : "No orders with this status yet."}
          </p>
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setFilter("all");
            }}
            className="press mt-3 rounded-full border border-line bg-surface px-4 py-2 text-[13px] font-bold"
          >
            Show all orders
          </button>
        </div>
      )}

      {/* The wall at the bottom of the list, named. Without this the cap read
          as "this is all you have ever ordered", which for anybody past their
          hundredth order was simply false. */}
      {hasMore ? (
        <div className="mt-4 space-y-2 text-center">
          {query.trim() ? (
            <p className="text-[12px] leading-snug text-muted">
              Searching the orders loaded so far. Load older ones to search
              further back.
            </p>
          ) : null}
          <button
            type="button"
            onClick={loadOlder}
            disabled={loading}
            className="press inline-flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2.5 text-[13px] font-bold disabled:opacity-60"
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : null}
            {loading ? "Loading…" : "Load older orders"}
          </button>
          {pageError ? (
            <p className="text-[12px] font-medium text-deal">{pageError}</p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
