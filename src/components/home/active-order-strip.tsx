import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { Order } from "@/types";
import { STATUS_META } from "@/lib/utils/order-status";
import { PhotoTile } from "@/components/shared/photo-tile";
import { getRestaurant } from "@/lib/data";

/** Bolt-style ongoing-order card — a calm white row with a live green dot. */
export function ActiveOrderStrip({ order }: { order: Order | null }) {
  if (!order) return null;

  const meta = STATUS_META[order.status];
  const restaurant = getRestaurant(order.restaurantSlug);
  const tint =
    order.restaurantAccent ??
    restaurant?.accentTint ??
    "linear-gradient(135deg,#34e39a,#17b26a)";
  const image = order.restaurantImage ?? restaurant?.image;

  return (
    <Link
      href={`/orders/${order.id}`}
      className="press card flex items-center gap-3 p-3"
    >
      <PhotoTile
        tint={tint}
        src={image}
        alt={order.restaurantName}
        className="size-12 shrink-0 rounded-xl"
      />
      <div className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 text-[13px] font-bold text-green">
          <span className="inline-block size-2 animate-pulse rounded-full bg-green" />
          Ongoing order · {meta.label}
        </span>
        <p className="mt-0.5 truncate text-[15px] font-extrabold tracking-tight">
          {order.restaurantName}
        </p>
      </div>
      <ChevronRight className="size-5 shrink-0 text-muted" />
    </Link>
  );
}
