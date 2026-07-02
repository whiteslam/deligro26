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

export const TRACKING_STEPS = [
  {
    key: "PLACED" as const,
    title: "Order confirmed",
    sub: "Saffron Kitchen accepted",
  },
  {
    key: "KITCHEN" as const,
    title: "Prepared & packed",
    sub: "Handed to rider",
  },
  {
    key: "ON_THE_WAY" as const,
    title: "On the way",
    sub: "Rahul is heading to you",
  },
  {
    key: "DELIVERED" as const,
    title: "Delivered",
    sub: "Hand to you at the door",
  },
];

const ORDER: OrderStatus[] = ["PLACED", "KITCHEN", "ON_THE_WAY", "DELIVERED"];

/** Index of the current status within the linear tracking flow. */
export function statusIndex(status: OrderStatus): number {
  return Math.max(0, ORDER.indexOf(status));
}
