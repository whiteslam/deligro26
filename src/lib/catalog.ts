import "server-only";
import {
  RESTAURANTS,
  getRestaurant as getMockRestaurant,
} from "@/lib/data";
import {
  getRestaurantFromDb,
  listRestaurantsFromDb,
} from "@/lib/data-access/restaurants";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { Restaurant } from "@/types";

/**
 * Server facade: live Supabase catalog when configured and seeded,
 * otherwise Phase 1 mock data (demo mode).
 */

/**
 * A catalog read that says whether it worked.
 *
 * `listRestaurants()` used to swallow every exception and return `[]`, which the
 * storefront renders as "we haven't onboarded a store near you" — a confident
 * statement about the customer's city, made on the strength of a failed query.
 * The two states look identical to a caller and are nothing alike, so they are
 * now distinguishable and the UI says which one it is looking at.
 */
export interface CatalogResult {
  restaurants: Restaurant[];
  /** False when the read failed. `restaurants` is then empty but meaningless. */
  ok: boolean;
}

export async function listRestaurantsResult(): Promise<CatalogResult> {
  if (!isSupabaseConfigured) return { restaurants: RESTAURANTS, ok: true };

  try {
    return { restaurants: await listRestaurantsFromDb(), ok: true };
  } catch (err) {
    console.error("[catalog] listRestaurants failed", err);
    return { restaurants: [], ok: false };
  }
}

/**
 * The list alone, for callers with nothing useful to say about a failure —
 * `listRestaurantSlugs` below, and route params. Anything that renders an empty
 * state to a customer should use `listRestaurantsResult` instead.
 */
export async function listRestaurants(): Promise<Restaurant[]> {
  return (await listRestaurantsResult()).restaurants;
}

export async function getRestaurant(slug: string): Promise<Restaurant | undefined> {
  if (!isSupabaseConfigured) return getMockRestaurant(slug);

  try {
    const live = await getRestaurantFromDb(slug);
    if (live) return live;
  } catch {
    // no mock fallback when backend is configured
  }

  return undefined;
}

export async function listRestaurantSlugs(): Promise<string[]> {
  const restaurants = await listRestaurants();
  return restaurants.map((r) => r.slug);
}
