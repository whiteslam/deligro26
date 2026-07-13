import Link from "next/link";
import { Clock, BadgePercent, Bike, Heart } from "lucide-react";
import type { Restaurant } from "@/types";
import { PhotoTile } from "@/components/shared/photo-tile";
import { RatingPill } from "@/components/shared/rating";
import { ShopDistance } from "@/components/shared/shop-distance";
import { formatEta, formatINR } from "@/lib/utils/format";
import { DELIVERY_FEE } from "@/lib/pricing";
import { cn } from "@/lib/utils/cn";

/**
 * Bolt-style discovery card.
 * - "list"     → full-width row in a vertical feed
 * - "carousel" → fixed-width tile inside a horizontal scroller
 * Sold-out / closed venues are dimmed, not hidden.
 */
export function RestaurantCard({
  restaurant,
  variant = "list",
}: {
  restaurant: Restaurant;
  variant?: "list" | "carousel";
}) {
  const r = restaurant;
  const carousel = variant === "carousel";

  return (
    <Link
      href={`/restaurant/${r.slug}`}
      className={cn(
        "press block",
        carousel ? "w-[240px] shrink-0" : "w-full",
        !r.open && "opacity-60"
      )}
    >
      <div className="relative overflow-hidden rounded-2xl">
        <PhotoTile
          tint={r.accentTint}
          src={r.image}
          alt={r.name}
          className={carousel ? "h-32 w-full" : "h-40 w-full"}
        />
        {r.offer ? (
          <span className="pill-deal absolute left-2.5 top-2.5 inline-flex items-center gap-1 px-2 py-1 text-[11px] font-bold uppercase tracking-wide">
            <BadgePercent className="size-3.5" />
            {r.offer}
          </span>
        ) : null}
        {/* Favourite — decorative for now, wired up later */}
        <span className="absolute right-2.5 top-2.5 grid size-8 place-items-center rounded-full bg-surface/95 text-ink shadow-[var(--shadow-sm)] backdrop-blur-[2px]">
          <Heart className="size-[17px]" strokeWidth={2.25} />
        </span>
        {!r.open ? (
          <span className="absolute bottom-2.5 right-2.5 rounded-full bg-ink px-2.5 py-1 text-xs font-semibold text-white">
            Opens soon
          </span>
        ) : (
          <RatingPill
            variant="chip"
            rating={r.rating}
            count={r.ratingCount}
            className="absolute bottom-2.5 left-2.5"
          />
        )}
      </div>

      <div className="px-0.5 pt-2">
        <h3 className="truncate text-[15px] font-extrabold leading-tight tracking-tight">
          {r.name}
        </h3>
        <p className="mt-0.5 truncate text-[12px] text-muted">
          {r.cuisines.join(" · ")}
        </p>
        <div className="mt-1.5 flex items-center gap-2 text-[12px] font-medium text-muted">
          <span className="inline-flex items-center gap-1">
            <Bike className="size-4" />
            {/* The fee we actually bill. This used to read `priceTier * 20`,
                which advertised "Free" or "₹40" on a shop that then charged ₹29
                at checkout — priceTier is the ₹/₹₹/₹₹₹ cost-for-two indicator,
                never a delivery fee. */}
            {formatINR(DELIVERY_FEE)}
          </span>
          <span className="text-line">•</span>
          <span className="inline-flex items-center gap-1">
            <Clock className="size-4" />
            {formatEta(r.etaMin, r.etaMax)}
          </span>
          <ShopDistance shop={r} />
        </div>
      </div>
    </Link>
  );
}
