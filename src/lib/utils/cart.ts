import type { CartLine, Order } from "@/types";
import { cartLinesFromOrder } from "@/lib/data";

/**
 * Rebuild cart lines from a past order.
 *
 * `veg` comes from the order's own snapshot (order_items → menu_items.veg), and
 * stays undefined when the dish is no longer on the menu. It used to be looked
 * up in the MOCK catalog and defaulted to `true` on a miss — and against a real
 * database that lookup missed every time, so reordering a chicken biryani put a
 * green vegetarian mark next to it. A dietary claim we can't substantiate is one
 * we don't make.
 */
export function orderLinesToCartLines(order: Order): CartLine[] {
  return order.lines.map((l) => ({
    itemId: l.itemId,
    name: l.name,
    price: l.price,
    qty: l.qty,
    veg: l.veg,
  }));
}

/** @deprecated Use orderLinesToCartLines — kept for demo reorder with mock menu. */
export { cartLinesFromOrder };
