import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { Order } from "@/types";
import { STATUS_META } from "@/lib/utils/order-status";

/** Live moment → earns the accent. Hidden when there is no active order. */
export function ActiveOrderStrip({ order }: { order: Order | null }) {
  if (!order) return null;

  const meta = STATUS_META[order.status];
  const eta = order.etaMinutes ?? 25;

  return (
    <Link
      href={`/orders/${order.id}`}
      className="press relative col-span-2 flex items-center gap-3 overflow-hidden rounded-[var(--radius-block)] border border-accent/30 bg-accent-soft p-4"
    >
      <span className="relative grid size-11 shrink-0 place-items-center">
        <span className="pulse-ring absolute inset-0 rounded-full bg-accent/20" />
        <span className="grid size-11 place-items-center rounded-full bg-accent text-white">
          <span className="text-data text-[13px] font-bold leading-none">
            {eta}′
          </span>
        </span>
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-label !text-accent">Active order · {meta.label}</p>
        <p className="truncate text-[15px] font-bold">{order.restaurantName}</p>
        <p className="truncate text-xs text-muted">
          Arriving in ~{eta} min
          {order.rider?.name ? ` · ${order.rider.name}` : ""}
        </p>
      </div>
      <ChevronRight className="size-5 shrink-0 text-accent" />
    </Link>
  );
}
