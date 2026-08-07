import "server-only";
import { ACTIVE_ORDER, PAST_ORDERS } from "@/lib/data";
import {
  getOrderById,
  listVisibleOrders,
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
}

function demoOrders(): OrdersPageData {
  return {
    active: ACTIVE_ORDER,
    past: PAST_ORDERS,
    isDemo: true,
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
    return { active: null, past: [], isDemo: false };
  }

  try {
    const rows = await listVisibleOrders();
    if (!rows.length) {
      return { active: null, past: [], isDemo: false };
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

    return { active, past, isDemo: false };
  } catch {
    return { active: null, past: [], isDemo: false };
  }
}

/** Single order for tracking — live DB only when Supabase is on. */
export async function getOrderForTracking(id: string): Promise<UiOrder | null> {
  if (isSupabaseConfigured) {
    try {
      const row = await getOrderById(id);
      if (row) return mapDbOrderRow(row);
    } catch {
      return null;
    }
    return null;
  }

  const mock = [ACTIVE_ORDER, ...PAST_ORDERS].find((o) => o.id === id);
  return mock ?? null;
}

/** Active order strip on home — null when none. */
export async function getActiveOrderForHome(): Promise<UiOrder | null> {
  const { active } = await getOrdersPageData();
  return active;
}
