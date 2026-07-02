import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Clock, MapPin, BadgePercent } from "lucide-react";
import { getRestaurant, RESTAURANTS } from "@/lib/data";
import { PhotoTile } from "@/components/shared/photo-tile";
import { RatingPill } from "@/components/shared/rating";
import { RestaurantMenu } from "@/components/restaurant/restaurant-menu";
import { formatEta } from "@/lib/utils/format";

export function generateStaticParams() {
  return RESTAURANTS.map((r) => ({ slug: r.slug }));
}

export default async function RestaurantPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const r = getRestaurant(slug);
  if (!r) notFound();

  return (
    <div>
      {/* Hero */}
      <div className="relative">
        <PhotoTile
          tint={r.accentTint}
          src={r.image}
          alt={r.name}
          className="h-44 w-full"
        />
        <Link
          href="/"
          aria-label="Back"
          className="press glass absolute left-4 top-4 grid size-10 place-items-center rounded-full"
        >
          <ChevronLeft className="size-5" />
        </Link>
      </div>

      {/* Info card floats over the hero edge */}
      <div className="relative -mt-6 rounded-t-[var(--radius-sheet)] bg-bg px-4 pt-5">
        <h1 className="text-[26px] font-bold leading-tight">{r.name}</h1>
        <p className="mt-0.5 text-sm text-muted">{r.tagline}</p>

        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <RatingPill rating={r.rating} count={r.ratingCount} />
          <span className="text-line">•</span>
          <span className="inline-flex items-center gap-1 text-data text-muted">
            <Clock className="size-3.5" />
            {formatEta(r.etaMin, r.etaMax)}
          </span>
          <span className="text-line">•</span>
          <span className="inline-flex items-center gap-1 text-data text-muted">
            <MapPin className="size-3.5" />
            {r.distanceKm} km
          </span>
          <span className="rounded-full border border-line px-2.5 py-0.5 text-xs font-medium text-muted">
            {r.cuisines.join(" · ")}
          </span>
        </div>

        {r.offer ? (
          <div className="mt-4 flex items-center gap-2 rounded-2xl border border-dashed border-accent/40 bg-accent-soft px-4 py-3">
            <BadgePercent className="size-5 text-accent" />
            <span className="text-sm font-bold text-accent">{r.offer}</span>
          </div>
        ) : null}

        <div className="mt-5">
          <RestaurantMenu restaurant={r} />
        </div>
      </div>
    </div>
  );
}
