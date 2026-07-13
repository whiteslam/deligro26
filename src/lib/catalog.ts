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
export async function listRestaurants(): Promise<Restaurant[]> {
  if (!isSupabaseConfigured) return RESTAURANTS;

  try {
    const live = await listRestaurantsFromDb();
    return live;
  } catch {
    return [];
  }
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
