"use client";

import { useMemo, useState } from "react";
import { Search, X, MapPinOff, SlidersHorizontal } from "lucide-react";
import type { Restaurant } from "@/types";
import { RestaurantCard } from "@/components/shared/restaurant-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

type Sort = "eta" | "rating";

const QUICK_FILTERS = [
  { id: "veg", label: "Pure Veg" },
  { id: "rating", label: "Rating 4.5+" },
  { id: "fast", label: "Under 25 min" },
  { id: "offers", label: "Offers" },
] as const;

const CUISINES = [
  "North Indian",
  "Fast Food",
  "Healthy",
  "Italian",
  "Chinese",
  "Desserts",
] as const;

export function SearchView({
  initialCategory,
  restaurants,
}: {
  initialCategory?: string;
  restaurants: Restaurant[];
}) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("eta");
  const [filters, setFilters] = useState<Set<string>>(new Set());
  const [cuisine, setCuisine] = useState<string | null>(
    initialCategory ? mapCategory(initialCategory) : null
  );

  const toggle = (id: string) =>
    setFilters((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = restaurants.filter((r) => {
      const matchesQuery =
        !q ||
        r.name.toLowerCase().includes(q) ||
        r.cuisines.some((c) => c.toLowerCase().includes(q)) ||
        r.menu.some((m) => m.name.toLowerCase().includes(q));
      const matchesCuisine =
        !cuisine || r.cuisines.some((c) => c === cuisine);
      const matchesVeg =
        !filters.has("veg") || r.menu.some((m) => m.veg);
      const matchesRating = !filters.has("rating") || r.rating >= 4.5;
      const matchesFast = !filters.has("fast") || r.etaMax <= 25;
      const matchesOffers = !filters.has("offers") || Boolean(r.offer);
      return (
        matchesQuery &&
        matchesCuisine &&
        matchesVeg &&
        matchesRating &&
        matchesFast &&
        matchesOffers
      );
    });
    list = [...list].sort((a, b) =>
      sort === "eta" ? a.etaMin - b.etaMin : b.rating - a.rating
    );
    return list;
  }, [query, cuisine, filters, sort, restaurants]);

  const clearAll = () => {
    setFilters(new Set());
    setCuisine(null);
    setQuery("");
  };

  const activeCount = filters.size + (cuisine ? 1 : 0);

  return (
    <div>
      {/* Search bar */}
      <div className="glass sticky top-0 z-20 px-4 pb-3 pt-4">
        <h1 className="mb-3 text-heading">Search</h1>
        <div className="flex h-12 items-center gap-2 rounded-2xl border border-line bg-surface px-4">
          <Search className="size-5 text-muted" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search dishes, restaurants…"
            className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted"
          />
          {query ? (
            <button
              onClick={() => setQuery("")}
              aria-label="Clear"
              className="press grid size-6 place-items-center rounded-full bg-surface-2 text-muted"
            >
              <X className="size-4" />
            </button>
          ) : null}
        </div>
      </div>

      <div className="px-4 pt-3">
        {/* Filters */}
        <div className="no-scrollbar -mx-4 flex items-center gap-2 overflow-x-auto px-4 pb-1">
          <span className="grid size-9 shrink-0 place-items-center rounded-full border border-line bg-surface text-muted">
            <SlidersHorizontal className="size-4" />
          </span>
          {QUICK_FILTERS.map((f) => (
            <Chip
              key={f.id}
              on={filters.has(f.id)}
              onClick={() => toggle(f.id)}
            >
              {f.label}
            </Chip>
          ))}
        </div>

        <div className="no-scrollbar -mx-4 mt-2 flex items-center gap-2 overflow-x-auto px-4">
          {CUISINES.map((c) => (
            <Chip
              key={c}
              on={cuisine === c}
              onClick={() => setCuisine(cuisine === c ? null : c)}
            >
              {c}
            </Chip>
          ))}
        </div>

        {/* Sort + count */}
        <div className="mt-3 flex items-center justify-between">
          <p className="text-sm text-muted">
            {results.length}{" "}
            {results.length === 1 ? "restaurant" : "restaurants"}
            {activeCount ? ` · ${activeCount} filters` : ""}
          </p>
          <div className="flex items-center gap-1 rounded-full bg-surface-2 p-0.5 text-xs font-semibold">
            <SortBtn on={sort === "eta"} onClick={() => setSort("eta")}>
              Fastest
            </SortBtn>
            <SortBtn on={sort === "rating"} onClick={() => setSort("rating")}>
              Top rated
            </SortBtn>
          </div>
        </div>

        {/* Results */}
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
            description="No restaurants fit these filters here. Try a wider radius or clear a filter."
            action={
              <Button variant="outline" onClick={clearAll}>
                Clear filters
              </Button>
            }
          />
        )}
      </div>
    </div>
  );
}

function mapCategory(id: string): string | null {
  const map: Record<string, string> = {
    pizza: "Italian",
    healthy: "Healthy",
    burgers: "Fast Food",
    chinese: "Chinese",
    desserts: "Desserts",
    biryani: "North Indian",
    south: "South Indian",
    rolls: "Fast Food",
  };
  return map[id] ?? null;
}

function Chip({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "press shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium",
        on
          ? "border-accent bg-accent-soft text-accent"
          : "border-line bg-surface text-muted"
      )}
    >
      {children}
    </button>
  );
}

function SortBtn({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "press rounded-full px-3 py-1.5",
        on ? "bg-surface text-ink shadow-[var(--shadow-sm)]" : "text-muted"
      )}
    >
      {children}
    </button>
  );
}
