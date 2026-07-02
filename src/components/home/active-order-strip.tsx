import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { ACTIVE_ORDER } from "@/lib/data";

/** Live moment → earns the accent. Sits high where the thumb rests. */
export function ActiveOrderStrip() {
  const o = ACTIVE_ORDER;
  return (
    <Link
      href={`/orders/${o.id}`}
      className="press relative col-span-2 flex items-center gap-3 overflow-hidden rounded-[var(--radius-block)] border border-accent/30 bg-accent-soft p-4"
    >
      <span className="relative grid size-11 shrink-0 place-items-center">
        <span className="pulse-ring absolute inset-0 rounded-full bg-accent/20" />
        <span className="grid size-11 place-items-center rounded-full bg-accent text-white">
          <span className="text-data text-[13px] font-bold leading-none">
            {o.etaMinutes}′
          </span>
        </span>
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-label !text-accent">Active order · On the way</p>
        <p className="truncate text-[15px] font-bold">{o.restaurantName}</p>
        <p className="truncate text-xs text-muted">
          Arriving in {o.etaMinutes} min · {o.rider?.name}
        </p>
      </div>
      <ChevronRight className="size-5 shrink-0 text-accent" />
    </Link>
  );
}
