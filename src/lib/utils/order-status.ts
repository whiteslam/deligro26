import type { OrderStatus } from "@/types";

/**
 * Short labels for the order-list row and the home "ongoing order" strip.
 *
 * `PLACED` used to read "Order placed", which is true and useless: it is the one
 * stage where the customer's actual question — has anyone at the restaurant
 * looked at this yet? — has an answer, and the answer is no. `READY` is new; the
 * stage existed in the database from the start and had no label anywhere,
 * because it was folded into `KITCHEN` on the way to the screen.
 */
export const STATUS_META: Record<
  OrderStatus,
  { label: string; tone: "accent" | "green" | "muted" }
> = {
  PLACED: { label: "Sent to restaurant", tone: "accent" },
  KITCHEN: { label: "Preparing", tone: "accent" },
  READY: { label: "Waiting for rider", tone: "accent" },
  ON_THE_WAY: { label: "On the way", tone: "accent" },
  DELIVERED: { label: "Delivered", tone: "green" },
  CANCELLED: { label: "Cancelled", tone: "muted" },
};

/**
 * The stages of an order, worded to be true at the moment each one lights up.
 *
 * This list used to run a step ahead of the database. Step one said "Order
 * confirmed — {restaurant} accepted" while the order was still `placed`, which
 * in the `order_status` enum means the exact opposite: sent, and waiting for the
 * kitchen to accept it. So the tracker congratulated the customer on an
 * acceptance that had not happened, and then — when the vendor really did accept
 * — advanced to "Prepared & packed · Handed to rider", at the precise moment
 * cooking began. Every order was described as one stage further along than it
 * was, in both directions.
 *
 * The wording deliberately matches the push notifications in
 * `notifications/order-events.ts`, so the phone and the screen tell the same
 * story rather than two slightly different ones.
 */
export function trackingSteps({
  restaurantName,
  riderName,
}: {
  restaurantName?: string;
  riderName?: string;
}) {
  return [
    {
      key: "PLACED" as const,
      title: "Order sent",
      sub: restaurantName
        ? `Waiting for ${restaurantName} to accept`
        : "Waiting for the restaurant to accept",
    },
    {
      key: "KITCHEN" as const,
      title: "Accepted",
      sub: restaurantName
        ? `${restaurantName} started cooking`
        : "The kitchen started cooking",
    },
    {
      key: "READY" as const,
      title: "Packed",
      sub: "Waiting for a rider to collect it",
    },
    {
      key: "ON_THE_WAY" as const,
      title: "On the way",
      sub: riderName ? `${riderName} is heading to you` : "Heading to you",
    },
    {
      key: "DELIVERED" as const,
      title: "Delivered",
      sub: "Handed to you at the door",
    },
  ];
}

/**
 * The linear flow, in database order: placed → kitchen → ready → on_the_way →
 * delivered. `READY` sits between cooking and the road, which is where the
 * enum has always put it.
 */
const ORDER: OrderStatus[] = [
  "PLACED",
  "KITCHEN",
  "READY",
  "ON_THE_WAY",
  "DELIVERED",
];

/**
 * Index of the current status within the linear tracking flow.
 *
 * `CANCELLED` is not on the line at all and lands on 0; callers must not render
 * the stepper for a cancelled order, and none do.
 */
export function statusIndex(status: OrderStatus): number {
  return Math.max(0, ORDER.indexOf(status));
}

/** Still happening: worth a live dot and a Track button rather than Reorder. */
export function isOrderInFlight(status: OrderStatus): boolean {
  return (
    status === "PLACED" ||
    status === "KITCHEN" ||
    status === "READY" ||
    status === "ON_THE_WAY"
  );
}

/**
 * Mirrors `CANCELLABLE` in `src/app/api/orders/[id]/cancel/route.ts`. Keep the
 * two in step: offering the button outside this set earns a 409 that the UI
 * reports as "the kitchen already started" — which is exactly what happened to
 * every `ready` order for as long as `ready` was displayed as `KITCHEN`. The
 * route is the authority; this only decides whether to show the button.
 */
export function canCustomerCancel(status: OrderStatus): boolean {
  return status === "PLACED" || status === "KITCHEN";
}
