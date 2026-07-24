"use client";

import { useState } from "react";
import { Flame, Loader2 } from "lucide-react";
import type { Restaurant } from "@/types";
import { VegMark } from "@/components/shared/veg-mark";
import { SectionTitle } from "@/components/roles/role-ui";
import { POPULARITY_WINDOW_DAYS } from "@/lib/popularity";
import { formatINR } from "@/lib/utils/format";
import { setMenuItemAvailability } from "@/app/vendor/menu/actions";

/**
 * The vendor's menu board. The Popular section is the reason this screen exists
 * in this shape: vendors kept asking how a dish gets in there, so the list now
 * states its own rule rather than leaving them to guess at a badge.
 *
 * Availability toggles write menu_items.available (RLS-scoped to the owner).
 * Demo mode (live=false) keeps flips local only.
 */
export function VendorMenu({
  restaurant,
  live,
}: {
  restaurant: Restaurant;
  live: boolean;
}) {
  const [soldOut, setSoldOut] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(restaurant.menu.map((m) => [m.id, Boolean(m.soldOut)]))
  );
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const ranked = restaurant.popularBasis === "orders";
  const popular = restaurant.menu
    .filter((m) => m.popular)
    .sort((a, b) => (b.unitsSold ?? 0) - (a.unitsSold ?? 0));

  // "Popular" is derived, never a real menu category — so the sections below are
  // the vendor's own categories only, and a dish appears in exactly one of them.
  const byCategory = restaurant.categories
    .filter((c) => c !== "Popular")
    .map((cat) => ({ cat, items: restaurant.menu.filter((m) => m.category === cat) }))
    .filter((g) => g.items.length > 0);

  async function toggleAvailability(itemId: string) {
    if (busyId) return;

    const nextSoldOut = !soldOut[itemId];
    setSoldOut((s) => ({ ...s, [itemId]: nextSoldOut }));
    setError(null);

    // Demo catalog — no backend row to write.
    if (!live) return;

    setBusyId(itemId);
    const result = await setMenuItemAvailability({
      itemId,
      available: !nextSoldOut,
      restaurantSlug: restaurant.slug,
    });
    setBusyId(null);

    if (!result.ok) {
      setSoldOut((s) => ({ ...s, [itemId]: !nextSoldOut }));
      setError(result.error ?? "Couldn't update that dish.");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-heading">Menu</h1>
        <p className="text-sm text-muted">
          {restaurant.name}
          {live ? null : " · demo data"}
        </p>
        {error ? (
          <p className="mt-2 text-sm font-medium text-deal">{error}</p>
        ) : null}
      </div>

      <section>
        <SectionTitle>Popular</SectionTitle>
        <p className="mb-3 text-[13px] leading-snug text-muted">
          {ranked ? (
            <>
              Ranked automatically by the dishes customers ordered most in the
              last {POPULARITY_WINDOW_DAYS} days. It refreshes as orders come in
              — there&apos;s nothing to set, and it can&apos;t be bought.
            </>
          ) : (
            <>
              Not enough orders in the last {POPULARITY_WINDOW_DAYS} days to rank
              your menu yet, so we&apos;re showing the kitchen&apos;s picks. Once
              customers start ordering, this list fills itself in — ranked by the
              dishes they order most.
            </>
          )}
        </p>

        {popular.length ? (
          <div className="space-y-2">
            {popular.map((item) => (
              <div key={item.id} className="card flex items-center gap-3 p-3">
                <VegMark veg={item.veg} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{item.name}</p>
                  <p className="text-data text-sm text-muted">
                    {formatINR(item.price)}
                  </p>
                </div>
                {ranked ? (
                  <span className="flex shrink-0 items-center gap-1 text-sm font-bold text-accent-ink">
                    <Flame className="size-4" />
                    {item.unitsSold} ordered
                  </span>
                ) : (
                  <span className="shrink-0 text-xs font-semibold text-muted">
                    Kitchen&apos;s pick
                  </span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted">
            No dishes here yet — your first orders will decide this list.
          </p>
        )}
      </section>

      {byCategory.map((group) => (
        <section key={group.cat}>
          <SectionTitle>{group.cat}</SectionTitle>
          <div className="space-y-2">
            {group.items.map((item) => {
              const out = soldOut[item.id];
              const busy = busyId === item.id;
              return (
                <div key={item.id} className="card flex items-center gap-3 p-3">
                  <VegMark veg={item.veg} />
                  <div className="min-w-0 flex-1">
                    <p
                      className={`truncate font-semibold ${
                        out ? "text-muted line-through" : ""
                      }`}
                    >
                      {item.name}
                    </p>
                    <p className="text-data text-sm text-muted">
                      {formatINR(item.price)}
                    </p>
                  </div>
                  <span className="flex items-center gap-1.5 text-xs text-muted">
                    {busy ? <Loader2 className="size-3.5 animate-spin" /> : null}
                    {out ? "Sold out" : "In stock"}
                  </span>
                  <button
                    type="button"
                    onClick={() => toggleAvailability(item.id)}
                    disabled={busy || Boolean(busyId)}
                    role="switch"
                    aria-checked={!out}
                    aria-label={`Toggle ${item.name} availability`}
                    className={`press relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-60 ${
                      out ? "bg-line" : "bg-green"
                    }`}
                  >
                    <span
                      className={`absolute top-1 size-4 rounded-full bg-white shadow-sm transition-all ${
                        out ? "left-1" : "left-6"
                      }`}
                    />
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
