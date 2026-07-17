import Link from "next/link";
import { Heart, Compass } from "lucide-react";
import { ProfileSubpage } from "@/components/profile/profile-subpage";
import { RestaurantCard } from "@/components/shared/restaurant-card";
import { requireUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { listFavoriteRestaurantsFromDb } from "@/lib/data-access/restaurants";
import type { Restaurant } from "@/types";

// Per-request: reads the auth cookie to show this user's own saved restaurants.
export const dynamic = "force-dynamic";

export default async function FavoritesPage() {
  await requireUser();

  const favorites: Restaurant[] = isSupabaseConfigured
    ? await listFavoriteRestaurantsFromDb()
    : [];

  return (
    <ProfileSubpage title="Favourites">
      {favorites.length === 0 ? (
        <div className="card p-6 text-center">
          <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-deal-soft text-deal">
            <Heart className="size-7" />
          </span>
          <p className="mt-4 text-[15px] font-bold">No favourites yet</p>
          <p className="mt-1 text-sm text-muted">
            Tap the heart on any restaurant to save it here.
          </p>
          <Link
            href="/"
            className="press mt-4 inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-bold text-white"
          >
            <Compass className="size-4" /> Explore restaurants
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-x-3 gap-y-5">
          {favorites.map((r) => (
            <RestaurantCard key={r.slug} restaurant={r} />
          ))}
        </div>
      )}
    </ProfileSubpage>
  );
}
