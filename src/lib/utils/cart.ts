import type { CartLine, Order } from "@/types";
import { cartLinesFromOrder, getRestaurant } from "@/lib/data";

/** Build cart lines from a past order — uses live order snapshot, mock menu for veg. */
export function orderLinesToCartLines(order: Order): CartLine[] {
  const menu = getRestaurant(order.restaurantSlug)?.menu ?? [];
  return order.lines.map((l) => ({
    itemId: l.itemId,
    name: l.name,
    price: l.price,
    qty: l.qty,
    veg: menu.find((m) => m.id === l.itemId)?.veg ?? true,
  }));
}

/** @deprecated Use orderLinesToCartLines — kept for demo reorder with mock menu. */
export { cartLinesFromOrder };
