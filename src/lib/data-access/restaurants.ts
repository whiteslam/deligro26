import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Cuisine, MenuItem, PriceTier, Restaurant } from "@/types";

interface DbMenuItem {
  id: string;
  external_id: string | null;
  name: string;
  description: string | null;
  price: number;
  veg: boolean;
  available: boolean;
  category: string | null;
  image_url: string | null;
  popular: boolean;
  bestseller: boolean;
}

interface DbRestaurantRow {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  is_open: boolean;
  image_url: string | null;
  accent_tint: string | null;
  cuisines: string[];
  rating: number;
  rating_count: number;
  eta_min: number | null;
  eta_max: number | null;
  price_tier: number;
  cost_for_two: number | null;
  distance_km: number | null;
  offer: string | null;
  promoted: boolean;
  menu_items: DbMenuItem[];
}

const RESTAURANT_SELECT = `
  id, slug, name, tagline, is_open,
  image_url, accent_tint, cuisines, rating, rating_count,
  eta_min, eta_max, price_tier, cost_for_two, distance_km,
  offer, promoted,
  menu_items (
    id, external_id, name, description, price, veg, available,
    category, image_url, popular, bestseller
  )
`;

const FALLBACK_TINT = "linear-gradient(135deg,#f6c453,#e8552d)";

function mapMenuItem(row: DbMenuItem): MenuItem {
  return {
    id: row.external_id ?? row.id,
    name: row.name,
    description: row.description ?? "",
    price: row.price,
    category: row.category ?? "Popular",
    veg: row.veg,
    image: row.image_url ?? undefined,
    soldOut: !row.available,
    popular: row.popular,
    bestseller: row.bestseller,
  };
}

function mapRestaurant(row: DbRestaurantRow): Restaurant {
  const menu = (row.menu_items ?? []).map(mapMenuItem);
  const categories = [
    "Popular",
    ...Array.from(new Set(menu.map((m) => m.category).filter((c) => c !== "Popular"))),
  ];

  return {
    slug: row.slug,
    name: row.name,
    tagline: row.tagline ?? "",
    cuisines: row.cuisines as Cuisine[],
    rating: Number(row.rating),
    ratingCount: row.rating_count,
    etaMin: row.eta_min ?? 25,
    etaMax: row.eta_max ?? 35,
    priceTier: row.price_tier as PriceTier,
    costForTwo: row.cost_for_two ?? 400,
    distanceKm: Number(row.distance_km ?? 2),
    offer: row.offer ?? undefined,
    promoted: row.promoted,
    open: row.is_open,
    categories,
    menu,
    accentTint: row.accent_tint ?? FALLBACK_TINT,
    image: row.image_url ?? "",
  };
}

/** Approved restaurants with menu — readable by anon (RLS). */
export async function listRestaurantsFromDb(): Promise<Restaurant[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("restaurants")
    .select(RESTAURANT_SELECT)
    .eq("approved", true)
    .order("promoted", { ascending: false })
    .order("name");

  if (error) throw error;
  return (data as DbRestaurantRow[]).map(mapRestaurant);
}

export async function getRestaurantFromDb(
  slug: string
): Promise<Restaurant | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("restaurants")
    .select(RESTAURANT_SELECT)
    .eq("slug", slug)
    .eq("approved", true)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return mapRestaurant(data as DbRestaurantRow);
}
