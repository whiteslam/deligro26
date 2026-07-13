import type { OrderStatus } from "@/types";

export const STATUS_META: Record<
  OrderStatus,
  { label: string; tone: "accent" | "green" | "muted" }
> = {
  PLACED: { label: "Order placed", tone: "accent" },
  KITCHEN: { label: "Preparing", tone: "accent" },
  ON_THE_WAY: { label: "On the way", tone: "accent" },
  DELIVERED: { label: "Delivered", tone: "green" },
  CANCELLED: { label: "Cancelled", tone: "muted" },
};

/**
 * The four steps of an order, named after the people actually involved.
 *
 * These used to be a hardcoded array asserting "Saffron Kitchen accepted" and
 * "Rahul is heading to you" on EVERY order — whichever restaurant it came from
 * and whoever was carrying it. Both names are already on the screen; they just
 * weren't reaching this list.
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
      title: "Order confirmed",
      sub: restaurantName ? `${restaurantName} accepted` : "Restaurant accepted",
    },
    {
      key: "KITCHEN" as const,
      title: "Prepared & packed",
      sub: "Handed to rider",
    },
    {
      key: "ON_THE_WAY" as const,
      title: "On the way",
      sub: riderName ? `${riderName} is heading to you` : "Heading to you",
    },
    {
      key: "DELIVERED" as const,
      title: "Delivered",
      sub: "Hand to you at the door",
    },
  ];
}

const ORDER: OrderStatus[] = ["PLACED", "KITCHEN", "ON_THE_WAY", "DELIVERED"];

/** Index of the current status within the linear tracking flow. */
export function statusIndex(status: OrderStatus): number {
  return Math.max(0, ORDER.indexOf(status));
}
