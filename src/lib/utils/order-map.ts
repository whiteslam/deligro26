import type {
  Order,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
} from "@/types";
import type { Order as DbOrder } from "@/lib/data-access/orders";

/**
 * One row per `order_status` value — no folding.
 *
 * `ready` used to map to `KITCHEN`, which is why nobody outside the vendor board
 * could see the stage at all: the customer was told the food was still being
 * cooked while it sat packed on the pass, and the Cancel button stayed on screen
 * offering something the cancel route would refuse.
 */
const DB_TO_UI: Record<string, OrderStatus> = {
  placed: "PLACED",
  kitchen: "KITCHEN",
  ready: "READY",
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

/**
 * A live order, with the fields that only exist once it came from the database.
 *
 * `Order` in `@/types` is the shape the mock catalogue also satisfies, so it
 * carries nothing about money that has (or hasn't) moved. The tracker needs
 * that: whether to offer a refund request, and what to call the total. Extending
 * rather than widening keeps every existing consumer working unchanged — a
 * `UiOrder` is an `Order`.
 */
export interface UiOrder extends Order {
  /** From migration 0025; undefined on a database that predates it (all COD). */
  paymentMethod?: PaymentMethod;
  paymentStatus?: PaymentStatus;
  /** Raw `created_at`. `placedAt` is a human label and can't be computed from. */
  createdAt?: string;
}

/**
 * Money we are actually holding.
 *
 * `authorized` has not been captured and `refunded` has already gone back, so
 * neither is something to offer a refund against. Getting this wrong in the
 * generous direction means inviting a customer to claim money we never took.
 */
export function isOrderPaid(order: {
  paymentStatus?: PaymentStatus;
}): boolean {
  return order.paymentStatus === "paid";
}

export function mapDbOrderRow(row: DbOrder): UiOrder {
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
    createdAt: row.created_at,
    // The restaurant's advertised lower edge. Good enough for a list row; the
    // tracking screen computes a real one in `lib/orders/eta.ts` instead.
    etaMinutes:
      (restaurant as { eta_min?: number } | null)?.eta_min ?? undefined,
    paymentMethod: row.payment_method,
    paymentStatus: row.payment_status,
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
