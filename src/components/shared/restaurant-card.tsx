import Link from "next/link";
import { Clock, Bike } from "lucide-react";
// BadgePercent — used by the temporarily hidden offer banner below
import type { Restaurant } from "@/types";
import { PhotoTile } from "@/components/shared/photo-tile";
// RatingPill — used by the temporarily hidden rating star below
// import { RatingPill } from "@/components/shared/rating";
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
        {/* Temporarily hidden — offer banner not needed right now
        {r.offer ? (
          <span className="pill-deal absolute left-2.5 top-2.5 inline-flex items-center gap-1 px-2 py-1 text-[11px] font-bold uppercase tracking-wide">
            <BadgePercent className="size-3.5" />
            {r.offer}
          </span>
        ) : null}
        */}
        {/* The decorative heart that used to sit here was a lie in both
            directions: it never showed whether a place WAS a favourite, and
            tapping it never made one. The working control is on the restaurant
            page (RestaurantActions). */}
        {!r.open ? (
          <span className="absolute bottom-2.5 right-2.5 rounded-full bg-ink px-2.5 py-1 text-xs font-semibold text-white">
            Opens soon
          </span>
        ) : null}
        {/* Temporarily hidden — rating star not needed right now
        {r.open ? (
          <RatingPill
            variant="chip"
            rating={r.rating}
            count={r.ratingCount}
            className="absolute bottom-2.5 left-2.5"
          />
        ) : null}
        */}
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
