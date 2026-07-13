import type { OrderStatus } from "@/types";
import type { Order as DbOrder } from "@/lib/data-access/orders";

const DB_TO_UI: Record<string, OrderStatus> = {
  placed: "PLACED",
  kitchen: "KITCHEN",
  ready: "KITCHEN",
  on_the_way: "ON_THE_WAY",
  delivered: "DELIVERED",
  cancelled: "CANCELLED",
};

export const ACTIVE_DB_STATUSES = [
  "placed",
  "kitchen",
  "ready",
  "on_the_way",
] as const;

export function dbStatusToUi(status: string): OrderStatus {
  return DB_TO_UI[status] ?? "PLACED";
}

export function formatOrderPlacedAt(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const time = date.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
  });

  if (date.toDateString() === now.toDateString()) {
    return `Today, ${time}`;
  }

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return `Yesterday, ${time}`;
  }

  return date.toLocaleDateString("en-IN", {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

interface DbMenuItemRef {
  external_id: string | null;
  veg: boolean | null;
}

interface DbOrderItemRow {
  name: string;
  qty: number;
  price: number;
  // Null when the dish has since been deleted from the menu — then we genuinely
  // do not know whether it was veg, and must not guess.
  menu_items?: DbMenuItemRef | DbMenuItemRef[] | null;
}

export function mapDbOrderRow(row: DbOrder): import("@/types").Order {
  const restaurant = row.restaurants;
  const items = row.order_items as DbOrderItemRow[];

  return {
    id: row.id,
    restaurantSlug: restaurant?.slug ?? "",
    restaurantName: restaurant?.name ?? "Restaurant",
    restaurantImage: (restaurant as { image_url?: string } | null)?.image_url,
    restaurantAccent:
      (restaurant as { accent_tint?: string } | null)?.accent_tint,
    status: dbStatusToUi(row.status),
    placedAt: formatOrderPlacedAt(row.created_at),
    etaMinutes:
      (restaurant as { eta_min?: number } | null)?.eta_min ?? undefined,
    total: row.total,
    lines: items.map((item) => {
      const menu = item.menu_items;
      const menuItem = Array.isArray(menu) ? menu[0] : menu;
      return {
        itemId: menuItem?.external_id ?? item.name,
        name: item.name,
        qty: item.qty,
        price: item.price,
        veg: menuItem?.veg ?? undefined,
      };
    }),
  };
}

export function shortOrderId(id: string): string {
  if (id.length <= 12) return id;
  return id.slice(0, 8).toUpperCase();
}
