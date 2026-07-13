import "server-only";
import { createClient } from "@/lib/supabase/server";
import {
  MIN_RANKED,
  POPULAR_LIMIT,
  POPULARITY_WINDOW_DAYS,
  type PopularBasis,
} from "@/lib/popularity";

/**
 * Ranks a menu by what customers actually ordered.
 *
 * The rule the UI promises vendors and diners: the dishes ordered most in the
 * last 30 days, refreshed on every menu load. A brand-new menu has no orders to
 * rank, so below MIN_RANKED we fall back to the hand-picked flags — and the UI
 * says so, rather than passing picks off as a sales ranking.
 */

export interface Popularity {
  /** menu_items.id (the DB uuid) → units sold in the window. */
  units: Map<string, number>;
  /** The uuids that make the Popular list, most-ordered first. */
  top: string[];
  basis: PopularBasis;
}

const EMPTY: Popularity = { units: new Map(), top: [], basis: "picks" };

/**
 * Rank one restaurant's dishes by units sold. Returns a "picks" basis when the
 * window holds too little history to rank honestly — the caller then keeps the
 * seeded flags. Never throws: a menu must still render if the ranking is
 * unavailable (e.g. the migration hasn't been run yet).
 */
export async function getMenuPopularity(
  restaurantId: string,
  days: number = POPULARITY_WINDOW_DAYS
): Promise<Popularity> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("menu_item_popularity", {
    p_restaurant_id: restaurantId,
    p_days: days,
  });

  if (error || !data) return EMPTY;

  const rows = data as { menu_item_id: string; units: number }[];
  const units = new Map<string, number>();
  for (const row of rows) {
    if (row.menu_item_id && row.units > 0) {
      units.set(row.menu_item_id, Number(row.units));
    }
  }

  if (units.size < MIN_RANKED) return { units, top: [], basis: "picks" };

  const top = [...units.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, POPULAR_LIMIT)
    .map(([id]) => id);

  return { units, top, basis: "orders" };
}
