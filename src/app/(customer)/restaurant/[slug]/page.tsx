import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Star,
  Bike,
  Heart,
  Share,
  Search,
  BadgePercent,
} from "lucide-react";
import { getRestaurant } from "@/lib/catalog";
import { RESTAURANTS } from "@/lib/data";
import { PhotoTile } from "@/components/shared/photo-tile";
import { RestaurantMenu } from "@/components/restaurant/restaurant-menu";
import { formatEta, formatRating, formatCount } from "@/lib/utils/format";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export async function generateStaticParams() {
  if (isSupabaseConfigured) return [];
  return RESTAURANTS.map((r) => ({ slug: r.slug }));
}

export default async function RestaurantPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const r = await getRestaurant(slug);
  if (!r) notFound();

  const deliveryFee = r.priceTier === 1 ? "Free" : `₹${r.priceTier * 20}`;

  return (
    <div>
      {/* Hero photo with overlaid name + circular controls */}
      <div className="relative">
        <PhotoTile
          tint={r.accentTint}
          src={r.image}
          alt={r.name}
          className="h-60 w-full"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/20" />

        <Link
          href="/"
          aria-label="Back"
          className="press absolute left-4 top-4 grid size-10 place-items-center rounded-full bg-surface text-ink shadow-[var(--shadow-md)]"
        >
          <ChevronLeft className="size-5" />
        </Link>
        <div className="absolute right-4 top-4 flex gap-2">
          {/* Decorative for now — wired up later */}
          <span className="grid size-10 place-items-center rounded-full bg-surface text-ink shadow-[var(--shadow-md)]">
            <Heart className="size-5" />
          </span>
          <span className="grid size-10 place-items-center rounded-full bg-surface text-ink shadow-[var(--shadow-md)]">
            <Share className="size-5" />
          </span>
          <span className="grid size-10 place-items-center rounded-full bg-surface text-ink shadow-[var(--shadow-md)]">
            <Search className="size-5" />
          </span>
        </div>

        <div className="absolute inset-x-0 bottom-5 text-center">
          <h1 className="px-6 text-[26px] font-extrabold leading-tight tracking-tight text-white">
            {r.name}
          </h1>
          <span className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-white/90">
            More info <ChevronRight className="size-4" />
          </span>
        </div>
      </div>

      {/* Floating info card — 3 columns with dividers */}
      <div className="relative -mt-5 px-4">
        <div className="card grid grid-cols-3 divide-x divide-line p-3.5">
          <InfoCol
            icon={<Star className="size-4 fill-pop text-pop" />}
            value={formatRating(r.rating)}
            label={`(${formatCount(r.ratingCount)})`}
          />
          <InfoCol
            icon={<Bike className="size-4 text-ink" />}
            value={deliveryFee}
            label="delivery"
          />
          <InfoCol
            icon={<Clock className="size-4 text-ink" />}
            value={formatEta(r.etaMin, r.etaMax)}
            label={`${r.distanceKm} km`}
          />
        </div>
      </div>

      <div className="px-4 pt-4">
        {r.offer ? (
          <div className="flex items-center gap-3 rounded-2xl bg-deal-soft px-4 py-3">
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-deal text-white">
              <BadgePercent className="size-5" />
            </span>
            <span className="text-sm font-bold text-deal">{r.offer}</span>
          </div>
        ) : null}

        {!r.open ? (
          <p className="mt-3 rounded-2xl bg-surface-2 px-4 py-3 text-center text-sm font-medium text-muted">
            Closed right now — check back later.
          </p>
        ) : null}
      </div>

      <div className="mt-2">
        <RestaurantMenu restaurant={r} />
      </div>
    </div>
  );
}

function InfoCol({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center gap-0.5 px-2 text-center">
      <span className="flex items-center gap-1 text-[15px] font-extrabold tracking-tight">
        {icon}
        {value}
      </span>
      <span className="text-[12px] text-muted">{label}</span>
    </div>
  );
}
