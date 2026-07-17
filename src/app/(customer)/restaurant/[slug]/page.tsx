import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Moon,
  // Star, Bike, BadgePercent — used by the temporarily hidden info card + offer banner below
} from "lucide-react";
import { getRestaurant } from "@/lib/catalog";
import { RESTAURANTS } from "@/lib/data";
import { PhotoTile } from "@/components/shared/photo-tile";
import { ImmersiveScreen } from "@/components/layout/immersive-screen";
import { RestaurantMenu } from "@/components/restaurant/restaurant-menu";
import { ClosedKitchen } from "@/components/restaurant/closed-kitchen";
import { RestaurantActions } from "@/components/restaurant/restaurant-actions";
// ShopDistanceText, formatEta/formatRating/formatCount/formatINR, DELIVERY_FEE
// are used by the temporarily hidden info card + offer banner below.
// import { ShopDistanceText } from "@/components/shared/shop-distance";
// import { formatEta, formatRating, formatCount, formatINR } from "@/lib/utils/format";
// import { DELIVERY_FEE } from "@/lib/pricing";
import { getProfile } from "@/lib/auth";
import { isFavorite } from "@/lib/data-access/favorites";
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

  // Who's looking, and have they already hearted this place? Both are cheap and
  // guests short-circuit to (null, false) — see data-access/favorites.
  const [profile, favorite] = await Promise.all([
    getProfile(),
    isSupabaseConfigured ? isFavorite(slug) : Promise.resolve(false),
  ]);

  // What checkout will actually charge — see lib/pricing.
  // Temporarily unused while the info card is hidden below.
  // const deliveryFee = formatINR(DELIVERY_FEE);

  return (
    <ImmersiveScreen>
      {/* Hero photo, edge to edge under the status bar, with overlaid name +
          circular controls. It's taller than the reserved strip it now sits
          beneath, so the visible artwork stays the size it was. */}
      <div className="relative">
        <PhotoTile
          tint={r.accentTint}
          src={r.image}
          alt={r.name}
          className="h-[calc(13rem+var(--status-h))] w-full"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/25" />

        <Link
          href="/"
          aria-label="Back"
          className="press absolute left-4 top-[calc(var(--status-h)+1rem)] grid size-10 place-items-center rounded-full bg-surface text-ink shadow-[var(--shadow-md)]"
        >
          <ChevronLeft className="size-5" />
        </Link>
        <RestaurantActions
          key={r.slug}
          slug={r.slug}
          name={r.name}
          tagline={r.tagline}
          initialFavorite={favorite}
          signedIn={Boolean(profile)}
        />

        <div className="absolute inset-x-0 bottom-5 text-center">
          <h1 className="px-6 text-[23px] font-extrabold leading-tight tracking-tight text-white">
            {r.name}
          </h1>
          <span className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-white/90">
            More info <ChevronRight className="size-4" />
          </span>
        </div>
      </div>

      {/* Floating info card — 3 columns with dividers */}
      {/* Temporarily hidden — not needed right now
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
            label={<ShopDistanceText shop={r} />}
          />
        </div>
      </div>
      */}

      <div className="px-4 pt-4">
        {/* Temporarily hidden — offer banner not needed right now
        {r.offer ? (
          <div className="flex items-center gap-3 rounded-2xl bg-deal-soft px-4 py-3">
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-deal text-white">
              <BadgePercent className="size-5" />
            </span>
            <span className="text-sm font-bold text-deal">{r.offer}</span>
          </div>
        ) : null}
        */}

        {!r.open ? (
          <div className="mt-3 flex items-center gap-3 rounded-2xl bg-surface-2 px-4 py-3.5">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-ink/[0.06] text-muted">
              <Moon className="size-5" />
            </span>
            <span className="flex min-w-0 flex-col leading-tight">
              <span className="text-sm font-bold text-ink">Closed right now</span>
              <span className="mt-0.5 inline-flex items-center gap-1 text-[12px] text-muted">
                <Clock className="size-3.5" />
                Check back later during opening hours.
              </span>
            </span>
          </div>
        ) : null}

        {/* Cute filler so a closed shop isn't a wall of empty dark space —
            picks a random personality each visit. */}
        {!r.open ? <ClosedKitchen /> : null}
      </div>

      <div className="mt-2">
        <RestaurantMenu restaurant={r} />
      </div>
    </ImmersiveScreen>
  );
}

/**
 * One stat: icon, value, and the small print under it.
 *
 * The icon sits BESIDE the two lines rather than inline with the value. Inline,
 * the icon+value group centred as a unit, which pushed the number ~10px right of
 * the label below it — so "5.0" hung off-centre over "(0)". Stacking value and
 * label into one left-aligned block gives them a shared edge, and centring that
 * block keeps the three stats even across the card.
 *
 * Temporarily unused while the info card is hidden above.
 */
// function InfoCol({
//   icon,
//   value,
//   label,
// }: {
//   icon: React.ReactNode;
//   value: string;
//   label: React.ReactNode;
// }) {
//   return (
//     <div className="flex items-center justify-center gap-1.5 px-1.5">
//       <span className="shrink-0">{icon}</span>
//       <span className="flex min-w-0 flex-col leading-tight">
//         <span className="truncate text-[14px] font-extrabold tracking-tight">
//           {value}
//         </span>
//         <span className="truncate text-[11px] text-muted">{label}</span>
//       </span>
//     </div>
//   );
// }
