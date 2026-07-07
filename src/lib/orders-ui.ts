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
} from "@/lib/utils/order-map";
import type { Order } from "@/types";

export interface OrdersPageData {
  active: Order | null;
  past: Order[];
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
    return demoOrders();
  }
}

/** Single order for tracking — tries DB first (UUID), then mock (DLG-*). */
export async function getOrderForTracking(id: string): Promise<Order | null> {
  if (isSupabaseConfigured) {
    try {
      const row = await getOrderById(id);
      if (row) return mapDbOrderRow(row);
    } catch {
      // fall through
    }
  }

  const mock = [ACTIVE_ORDER, ...PAST_ORDERS].find((o) => o.id === id);
  return mock ?? null;
}

/** Active order strip on home — null when none. */
export async function getActiveOrderForHome(): Promise<Order | null> {
  const { active } = await getOrdersPageData();
  return active;
}
