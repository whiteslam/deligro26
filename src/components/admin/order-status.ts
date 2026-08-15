import type { AdminOrderRow } from "@/lib/roles-data";

/**
 * How an order's stage is labelled and coloured, in one place.
 *
 * The Orders screen and the dashboard's live board both render this pill, and
 * two copies of the mapping is how "Ready for pickup" ends up amber on one
 * screen and blue on the other. Given a bare `Record`, a missing key is not a
 * blank cell — `ORDER_STATUS[o.status].cls` throws and takes the screen with
 * it, so every member of the union must be present.
 */
export const ORDER_STATUS: Record<
  AdminOrderRow["status"],
  { label: string; short: string; cls: string }
> = {
  PLACED: { label: "Placed", short: "Placed", cls: "pill-accent" },
  KITCHEN: { label: "Preparing", short: "Cooking", cls: "pill-accent" },
  // READY is its own stage (0026 / OrderStatus). It used to be folded into
  // KITCHEN, which is why an operator could not tell a kitchen that was still
  // cooking from one whose food had been sitting on the pass.
  READY: { label: "Ready for pickup", short: "Ready", cls: "pill-pop" },
  ON_THE_WAY: { label: "On the way", short: "On the way", cls: "pill-blue" },
  DELIVERED: { label: "Delivered", short: "Delivered", cls: "pill-green" },
  CANCELLED: { label: "Cancelled", short: "Cancelled", cls: "pill-muted" },
};

/** Draw order for filter chips, so they don't reshuffle between renders. */
export const ORDER_STATUS_ORDER: AdminOrderRow["status"][] = [
  "PLACED",
  "KITCHEN",
  "READY",
  "ON_THE_WAY",
  "DELIVERED",
  "CANCELLED",
];
