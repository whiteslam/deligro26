"use client";

import { useDeferredValue, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, Search } from "lucide-react";
import type { Banner, Order, Restaurant } from "@/types";
import { useLocation } from "@/stores/location-store";
import { PINNED_LOCATION } from "@/lib/location/pinned";
import { distanceToShop } from "@/lib/geo/distance";
import { buildDishIndex, groupByShop, searchDishes } from "@/lib/search/dishes";
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
}: {
  savedAddress: SavedAddress | null;
  restaurants: Restaurant[];
  activeOrder: Order | null;
  banners: Banner[];
  popular: Restaurant[];
  nearby: Restaurant[];
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

  const dishes = useMemo(
    () => (typed ? searchDishes(index, typed) : []),
    [index, typed]
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
            <CategoryStrip />
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
