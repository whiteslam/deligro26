"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, MapPinOff } from "lucide-react";
import type { Banner, Order, Restaurant } from "@/types";
import { useLocation } from "@/stores/location-store";
import { PINNED_LOCATION } from "@/lib/location/pinned";
import { distanceToShop } from "@/lib/geo/distance";
import { HomeHeader, type SavedAddress } from "@/components/home/home-header";
import { ActiveOrderStrip } from "@/components/home/active-order-strip";
import { CategoryStrip } from "@/components/home/category-strip";
import { PromoBannerCarousel } from "@/components/home/promo-banner-carousel";
import { RestaurantCard } from "@/components/shared/restaurant-card";
import { EmptyState } from "@/components/shared/empty-state";

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

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return restaurants
      .filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.cuisines.some((c) => c.toLowerCase().includes(q)) ||
          r.menu.some((m) => m.name.toLowerCase().includes(q))
      )
      .sort((a, b) => a.etaMin - b.etaMin);
  }, [query, restaurants]);

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
            {results.length}{" "}
            {results.length === 1 ? "result" : "results"} for &ldquo;{query.trim()}
            &rdquo;
          </p>
          {results.length ? (
            <div className="mt-4 space-y-4">
              {results.map((r) => (
                <RestaurantCard key={r.slug} restaurant={r} />
              ))}
            </div>
          ) : (
            <EmptyState
              className="mt-6"
              icon={<MapPinOff className="size-7" />}
              title="Nothing matches — yet"
              description="Try a different dish or restaurant name."
            />
          )}
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
