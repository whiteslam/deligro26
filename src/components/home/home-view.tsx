"use client";

import { useDeferredValue, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, Search, TriangleAlert } from "lucide-react";
import type { Banner, Category, Order, Restaurant } from "@/types";
import { useLocation } from "@/stores/location-store";
import { PINNED_LOCATION } from "@/lib/location/pinned";
import { distanceToShop } from "@/lib/geo/distance";
import {
  buildDishIndex,
  groupByShop,
  searchDishes,
  type RankContext,
} from "@/lib/search/dishes";
import { HomeHeader, type SavedAddress } from "@/components/home/home-header";
import { ActiveOrderStrip } from "@/components/home/active-order-strip";
import { CategoryStrip } from "@/components/home/category-strip";
import { PromoBannerCarousel } from "@/components/home/promo-banner-carousel";
import { DishCard } from "@/components/search/dish-card";
import { RestaurantCard } from "@/components/shared/restaurant-card";
import { EmptyState } from "@/components/shared/empty-state";

/** How much of the answer the home field shows before handing off to /search. */
const HOME_DISH_LIMIT = 8;
const HOME_SHOP_LIMIT = 4;

export function HomeView({
  savedAddress,
  restaurants,
  activeOrder,
  banners,
  popular,
  nearby,
  categories,
  catalogFailed = false,
  rotationSeed,
}: {
  savedAddress: SavedAddress | null;
  restaurants: Restaurant[];
  activeOrder: Order | null;
  banners: Banner[];
  popular: Restaurant[];
  nearby: Restaurant[];
  /** Cuisine strip, pictures already resolved server-side. */
  categories: Category[];
  /** The catalog read failed — the lists below are empty but say nothing. */
  catalogFailed?: boolean;
  /**
   * Today's date, from the server — see `lib/search/rotation.ts`. Passed in
   * rather than read from the clock here so the server and client renders can
   * never disagree about which day it is.
   */
  rotationSeed?: string;
}) {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const typed = deferredQuery.trim();
  const searching = query.trim().length > 0;

  // Measured from wherever the customer is — Bemetara until they detect a fix
  // or pick a saved address. Shops the vendor hasn't pinned yet have no
  // position to measure to, so they keep their seeded order at the back rather
  // than being given a made-up distance.
  const origin = useLocation((s) => s.coords) ?? PINNED_LOCATION.coords;
  const anyPinned = nearby.some((r) => distanceToShop(origin, r) !== null);

  const nearest = useMemo(() => {
    if (!anyPinned) return nearby;
    return [...nearby].sort((a, b) => {
      const da = distanceToShop(origin, a);
      const db = distanceToShop(origin, b);
      if (da === null) return 1;
      if (db === null) return -1;
      return da - db;
    });
  }, [nearby, origin, anyPinned]);

  // Food-first, the same ranking the search tab uses: the header field answers
  // "who has X?" with the dish itself, and lists the kitchens underneath.
  const index = useMemo(() => buildDishIndex(restaurants), [restaurants]);

  // The same origin the nearest-first shop list below already measures from, now
  // also feeding dish ranking — until this was threaded through, the shop list
  // was distance-aware and the food results were not.
  const ctx = useMemo<RankContext>(
    () => ({ origin, rotationSeed }),
    [origin, rotationSeed]
  );

  const dishes = useMemo(
    () => (typed ? searchDishes(index, typed, {}, "relevance", ctx) : []),
    [index, typed, ctx]
  );

  const shops = useMemo(
    () => (typed ? groupByShop(dishes, restaurants, typed) : []),
    [dishes, restaurants, typed]
  );

  return (
    <>
      <HomeHeader
        savedAddress={savedAddress}
        query={query}
        onQueryChange={setQuery}
      />

      {searching ? (
        <div className="px-4 pt-3">
          <p className="text-sm font-medium text-muted">
            {dishes.length} {dishes.length === 1 ? "dish" : "dishes"} ·{" "}
            {shops.length}{" "}
            {shops.length === 1 ? "restaurant" : "restaurants"} for &ldquo;
            {query.trim()}&rdquo;
          </p>

          {dishes[0]?.partial ? (
            <p className="mt-1 text-[13px] font-medium leading-snug text-muted">
              Nothing is called that exactly — these are the closest dishes.
            </p>
          ) : null}

          {dishes.length ? (
            <>
              <div className="mt-1 divide-y divide-line">
                {dishes.slice(0, HOME_DISH_LIMIT).map((hit) => (
                  <DishCard key={hit.key} hit={hit} />
                ))}
              </div>
              {dishes.length > HOME_DISH_LIMIT ? (
                <Link
                  href={`/search?q=${encodeURIComponent(query.trim())}`}
                  className="press bolt-section-link mt-1 inline-flex"
                >
                  See all {dishes.length} dishes{" "}
                  <ChevronRight className="size-4" />
                </Link>
              ) : null}
            </>
          ) : null}

          {shops.length ? (
            <section className="mt-6 space-y-3">
              <h2 className="text-heading">Restaurants serving this</h2>
              <div className="space-y-4">
                {shops.slice(0, HOME_SHOP_LIMIT).map((shop) => (
                  <RestaurantCard
                    key={shop.restaurant.slug}
                    restaurant={shop.restaurant}
                  />
                ))}
              </div>
            </section>
          ) : null}

          {!dishes.length && !shops.length ? (
            <EmptyState
              className="mt-6"
              icon={<Search className="size-7" />}
              title={`Nothing called “${query.trim()}” yet`}
              description="No kitchen near you is cooking that right now. Try a shorter word — “paneer” finds more than “paneer tikka masala”."
            />
          ) : null}
        </div>
      ) : (
        <div className="space-y-6 pt-3">
          {activeOrder ? (
            <div className="px-4">
              <ActiveOrderStrip order={activeOrder} />
            </div>
          ) : null}

          <section className="space-y-3">
            <h2 className="px-4 text-heading">Categories</h2>
            <CategoryStrip categories={categories} />
          </section>

          <Section title="Popular right now" href="/search">
            <div className="no-scrollbar flex gap-4 overflow-x-auto px-4">
              {popular.map((r) => (
                <RestaurantCard key={r.slug} restaurant={r} variant="carousel" />
              ))}
            </div>
          </Section>

          {banners.length ? (
            <PromoBannerCarousel banners={banners} placement="home_hero" />
          ) : null}

          {/* Said before the empty lists below, not instead of them: a catalog
              that failed to load renders identically to a city with no shops in
              it, and only one of those is a statement we can stand behind. */}
          {catalogFailed ? (
            <div className="mx-4 flex items-start gap-2.5 rounded-2xl border border-deal/30 bg-deal-soft px-3 py-2.5 text-sm font-medium text-deal">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" />
              <span>
                We couldn&apos;t load stores just now — this is a problem on our
                side, not an empty neighbourhood. Pull to refresh in a moment.
              </span>
            </div>
          ) : null}

          <section className="space-y-3">
            <div className="bolt-section-head px-4">
              <div>
                <h2 className="text-heading">Restaurants near you</h2>
                <p className="text-xs font-medium text-muted">
                  {anyPinned ? "Nearest first" : "Fastest delivery first"}
                </p>
              </div>
              <Link href="/search" className="bolt-section-link">
                See all <ChevronRight className="size-4" />
              </Link>
            </div>

            <div className="space-y-5 px-4">
              {nearest.map((r) => (
                <RestaurantCard key={r.slug} restaurant={r} />
              ))}
            </div>
          </section>

          <p className="px-4 pb-2 pt-2 text-center text-xs text-muted">
            Freshly made, delivered warm.
          </p>
        </div>
      )}
    </>
  );
}

function Section({
  title,
  href,
  children,
}: {
  title: string;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="bolt-section-head px-4">
        <h2 className="text-heading">{title}</h2>
        <Link href={href} className="bolt-section-link">
          See all <ChevronRight className="size-4" />
        </Link>
      </div>
      {children}
    </section>
  );
}
