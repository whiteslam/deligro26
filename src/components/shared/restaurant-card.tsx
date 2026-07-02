import Link from "next/link";
import { Clock, BadgePercent } from "lucide-react";
import type { Restaurant } from "@/types";
import { PhotoTile } from "@/components/shared/photo-tile";
import { RatingPill } from "@/components/shared/rating";
import { formatEta } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

/** Full-width discovery card. Sold-out / closed venues are dimmed, not hidden. */
export function RestaurantCard({ restaurant }: { restaurant: Restaurant }) {
  const r = restaurant;
  return (
    <Link
      href={`/restaurant/${r.slug}`}
      className={cn(
        "press card block overflow-hidden",
        !r.open && "opacity-60"
      )}
    >
      <PhotoTile
        tint={r.accentTint}
        src={r.image}
        alt={r.name}
        className="h-36 w-full"
      >
        {r.offer ? (
          <span className="absolute bottom-3 left-3 inline-flex items-center gap-1 rounded-full bg-surface/90 px-2.5 py-1 text-xs font-bold text-accent backdrop-blur">
            <BadgePercent className="size-3.5" />
            {r.offer}
          </span>
        ) : null}
        {!r.open ? (
          <span className="absolute right-3 top-3 rounded-full bg-ink/70 px-2.5 py-1 text-xs font-semibold text-white">
            Opens soon
          </span>
        ) : null}
      </PhotoTile>
      <div className="p-3.5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-[16px] font-bold leading-tight">{r.name}</h3>
          <RatingPill rating={r.rating} count={r.ratingCount} />
        </div>
        <p className="mt-0.5 truncate text-sm text-muted">
          {r.cuisines.join(" · ")}
        </p>
        <div className="mt-2 flex items-center gap-3 text-data text-muted">
          <span className="inline-flex items-center gap-1">
            <Clock className="size-3.5" />
            {formatEta(r.etaMin, r.etaMax)}
          </span>
          <span className="text-line">•</span>
          <span>{r.distanceKm} km</span>
          <span className="text-line">•</span>
          <span>₹{r.costForTwo} for two</span>
        </div>
      </div>
    </Link>
  );
}
