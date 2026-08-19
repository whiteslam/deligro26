import "server-only";
import { ACTIVE_ORDER, PAST_ORDERS } from "@/lib/data";
import {
  getOrderById,
  listMyOrders,
} from "@/lib/data-access/orders";
import { getProfile } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  ACTIVE_DB_STATUSES,
  dbStatusToUi,
  mapDbOrderRow,
  type UiOrder,
} from "@/lib/utils/order-map";

/**
 * `UiOrder` rather than `Order`: a live row carries its payment state and its
 * raw `created_at`, and the tracking screen needs both. A `UiOrder` is an
 * `Order`, so the mock orders below and every list consumer are unaffected.
 */
export interface OrdersPageData {
  active: UiOrder | null;
  past: UiOrder[];
  /** True when showing mock orders (no backend). */
  isDemo: boolean;
  /**
   * False when the read failed.
   *
   * This used to be indistinguishable from "you have never ordered", because a
   * caught exception returned the same `{ active: null, past: [] }` as an empty
   * account. That is the sharpest version of this failure in the product: a
   * customer whose food is on its way, told they have no orders. The list screen
   * now says the read failed instead of asserting the absence.
   */
  ok: boolean;
}

function demoOrders(): OrdersPageData {
  return {
    active: ACTIVE_ORDER,
    past: PAST_ORDERS,
    isDemo: true,
    ok: true,
  };
}

function isActiveDbStatus(status: string): boolean {
  return (ACTIVE_DB_STATUSES as readonly string[]).includes(status);
}

/** Orders for /orders and home reorder blocks — live when signed in. */
export async function getOrdersPageData(): Promise<OrdersPageData> {
  if (!isSupabaseConfigured) return demoOrders();

  const profile = await getProfile();
  if (!profile) {
    // A genuine, known "no orders": nobody is signed in.
    return { active: null, past: [], isDemo: false, ok: true };
  }

  try {
    // `listMyOrders`, not `listVisibleOrders`: this screen says "your orders"
    // and must mean it. An admin — the owner's own phone is one — is allowed by
    // RLS to read every order on the platform, so the visible list would fill
    // /orders with strangers' deliveries and put one of them in the Active card.
    const rows = await listMyOrders();
    if (!rows.length) {
      return { active: null, past: [], isDemo: false, ok: true };
    }

    const activeRow = rows.find((r) => isActiveDbStatus(r.status)) ?? null;
    const active = activeRow ? mapDbOrderRow(activeRow) : null;

    const past = rows
      .filter((r) => r.id !== activeRow?.id)
      .filter((r) => {
        const ui = dbStatusToUi(r.status);
        return ui === "DELIVERED" || ui === "CANCELLED";
      })
      .map(mapDbOrderRow);

    return { active, past, isDemo: false, ok: true };
  } catch (err) {
    console.error("[orders-ui] getOrdersPageData failed", err);
    return { active: null, past: [], isDemo: false, ok: false };
  }
}

/**
 * A failed read of one order.
 *
 * Thrown rather than returned as null, because the tracking page maps null to
 * `notFound()` — so a backend fault used to 404 a real, in-flight order. "This
 * order does not exist" and "we could not reach the database" are different
 * sentences and the customer deserves the right one.
 */
export class OrderReadFailed extends Error {
  constructor(readonly cause?: unknown) {
    super("order_read_failed");
    this.name = "OrderReadFailed";
  }
}

/** Single order for tracking — live DB only when Supabase is on. */
export async function getOrderForTracking(id: string): Promise<UiOrder | null> {
  if (isSupabaseConfigured) {
    try {
      const row = await getOrderById(id);
      // A null row genuinely is "no such order you may see" — RLS said so.
      return row ? mapDbOrderRow(row) : null;
    } catch (err) {
      console.error("[orders-ui] getOrderForTracking failed", err);
      throw new OrderReadFailed(err);
    }
  }

  const mock = [ACTIVE_ORDER, ...PAST_ORDERS].find((o) => o.id === id);
  return mock ?? null;
}

/** Active order strip on home — null when none. */
export async function getActiveOrderForHome(): Promise<UiOrder | null> {
  const { active } = await getOrdersPageData();
  return active;
}
