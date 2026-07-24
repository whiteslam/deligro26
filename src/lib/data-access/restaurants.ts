import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getMenuPopularity, type Popularity } from "@/lib/data-access/menu-popularity";
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
  // Optional: absent entirely on a database that predates migration 0009.
  lat?: number | null;
  lng?: number | null;
  address?: string | null;
  offer: string | null;
  promoted: boolean;
  menu_items: DbMenuItem[];
}

/**
 * The shop-location columns (migration 0009) are selected only when the database
 * actually has them. Asking for a column that doesn't exist is a hard 400 from
 * PostgREST, which would take the whole catalog down — so a database that hasn't
 * run 0009 yet simply serves shops without a pin, and they fall back to the
 * seeded `distance_km`. Delete this branch once every environment is migrated.
 */
function restaurantSelect(withLocation: boolean): string {
  return `
    id, slug, name, tagline, is_open,
    image_url, accent_tint, cuisines, rating, rating_count,
    eta_min, eta_max, price_tier, cost_for_two, distance_km,
    ${withLocation ? "lat, lng, address," : ""}
    offer, promoted,
    menu_items (
      id, external_id, name, description, price, veg, available,
      category, image_url, popular, bestseller
    )
  `;
}

/** null = not asked yet. Latches after the first query, so we probe once. */
let hasShopLocation: boolean | null = null;

/** PostgREST's "column does not exist". */
const UNDEFINED_COLUMN = "42703";

interface QueryResult<T> {
  data: T | null;
  error: { code?: string } | null;
}

/**
 * Run a catalog query with the shop-location columns, retrying without them if
 * the database predates migration 0009.
 */
async function selectRestaurants<T>(
  run: (select: string) => PromiseLike<QueryResult<T>>
): Promise<T | null> {
  if (hasShopLocation !== false) {
    const { data, error } = await run(restaurantSelect(true));
    if (!error) {
      hasShopLocation = true;
      return data;
    }
    if (error.code !== UNDEFINED_COLUMN) throw error;
    hasShopLocation = false;
  }

  const { data, error } = await run(restaurantSelect(false));
  if (error) throw error;
  return data;
}

const FALLBACK_TINT = "linear-gradient(135deg,#f6c453,#e8552d)";

function mapMenuItem(row: DbMenuItem, popularity?: Popularity): MenuItem {
  // Ranked by sales when there's enough history; otherwise the seeded flags
  // stand in. `popular` and `bestseller` are set together so every consumer —
  // the Popular tab, the row badge — agrees on one answer.
  const ranked = popularity?.basis === "orders";
  const popular = ranked ? popularity.top.includes(row.id) : row.popular || row.bestseller;

  return {
    id: row.external_id ?? row.id,
    name: row.name,
    description: row.description ?? "",
    price: row.price,
    category: row.category ?? "Popular",
    veg: row.veg,
    image: row.image_url ?? undefined,
    soldOut: !row.available,
    popular,
    bestseller: popular,
    unitsSold: popularity?.units.get(row.id) ?? 0,
  };
}

function mapRestaurant(row: DbRestaurantRow, popularity?: Popularity): Restaurant {
  const menu = (row.menu_items ?? []).map((item) => mapMenuItem(item, popularity));

  // Popular is a derived tab, so it only earns its place when it has dishes in
  // it. Legacy menus carry no badges and may have no orders yet — offering an
  // empty tab (and opening on it) is worse than not offering it at all.
  const hasPopular = menu.some((m) => m.popular);
  const categories = [
    ...(hasPopular ? ["Popular"] : []),
    ...Array.from(new Set(menu.map((m) => m.category).filter((c) => c !== "Popular"))),
  ];

  return {
    popularBasis: popularity?.basis ?? "picks",
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
    lat: row.lat ?? null,
    lng: row.lng ?? null,
    address: row.address ?? null,
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
  const rows = await selectRestaurants<DbRestaurantRow[]>((select) =>
    supabase
      .from("restaurants")
      .select(select)
      .eq("approved", true)
      .order("promoted", { ascending: false })
      .order("name")
      .overrideTypes<DbRestaurantRow[]>()
  );

  return (rows ?? []).map((row) => mapRestaurant(row));
}

/**
 * The signed-in user's hearted restaurants, with menus. Empty for guests or when
 * nothing is saved. RLS scopes the favourites read to the caller, so the id list
 * is already "mine"; we then fetch only those approved restaurants.
 */
export async function listFavoriteRestaurantsFromDb(): Promise<Restaurant[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: favRows, error: favErr } = await supabase
    .from("favorites")
    .select("restaurant_id");
  if (favErr || !favRows?.length) return [];

  const ids = favRows.map((r) => r.restaurant_id);
  const rows = await selectRestaurants<DbRestaurantRow[]>((select) =>
    supabase
      .from("restaurants")
      .select(select)
      .in("id", ids)
      .eq("approved", true)
      .order("name")
      .overrideTypes<DbRestaurantRow[]>()
  );

  return (rows ?? []).map((row) => mapRestaurant(row));
}

/**
 * One restaurant, with its menu ranked by sales. The feed lists deliberately
 * skip the ranking — it's one RPC per restaurant, and no card shows dish-level
 * popularity — so only the menu screen pays for it.
 */
export async function getRestaurantFromDb(
  slug: string
): Promise<Restaurant | null> {
  const supabase = await createClient();
  const row = await selectRestaurants<DbRestaurantRow>((select) =>
    supabase
      .from("restaurants")
      .select(select)
      .eq("slug", slug)
      .eq("approved", true)
      .maybeSingle()
      .overrideTypes<DbRestaurantRow>()
  );

  if (!row) return null;

  const popularity = await getMenuPopularity(row.id);
  return mapRestaurant(row, popularity);
}

/**
 * Pin the signed-in vendor's shop. This is what makes a real distance possible:
 * without it we only have the seeded `distance_km`, which is the same number
 * however far away the customer actually is.
 *
 * Scoped to the caller's own restaurant twice over — the owner_id filter here,
 * and the "restaurants — owner manage" RLS policy in the database.
 */
export async function updateShopLocation(input: {
  lat: number;
  lng: number;
  address: string;
}): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("unauthorized");

  const { error } = await supabase
    .from("restaurants")
    .update({
      lat: input.lat,
      lng: input.lng,
      address: input.address.slice(0, 300),
    })
    .eq("owner_id", user.id);

  if (error) throw error;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Flip menu_items.available for a dish the signed-in vendor owns.
 * `itemId` is the customer-facing id (external_id when present, else the row uuid).
 * RLS + owner_id scoping both gate the write.
 */
export async function updateMenuItemAvailability(
  itemId: string,
  available: boolean
): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("unauthorized");

  const { data: restaurant, error: restErr } = await supabase
    .from("restaurants")
    .select("id")
    .eq("owner_id", user.id)
    .order("name")
    .limit(1)
    .maybeSingle();
  if (restErr) throw restErr;
  if (!restaurant) return false;

  let query = supabase
    .from("menu_items")
    .update({ available })
    .eq("restaurant_id", restaurant.id);

  query = UUID_RE.test(itemId)
    ? query.eq("id", itemId)
    : query.eq("external_id", itemId);

  const { data, error } = await query.select("id").maybeSingle();
  if (error) throw error;
  return Boolean(data?.id);
}

/**
 * The signed-in vendor's own restaurant + menu, ranked the same way the diner's
 * menu screen is — so the Popular list a vendor is shown is the very same list
 * their customers see, not a second implementation of the idea.
 *
 * Unapproved is included on purpose: a vendor still needs their menu before the
 * storefront goes live. RLS scopes the row to its owner.
 */
export async function getOwnedRestaurantFromDb(): Promise<Restaurant | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const row = await selectRestaurants<DbRestaurantRow>((select) =>
    supabase
      .from("restaurants")
      .select(select)
      .eq("owner_id", user.id)
      .order("name")
      .limit(1)
      .maybeSingle()
      .overrideTypes<DbRestaurantRow>()
  );

  if (!row) return null;

  const popularity = await getMenuPopularity(row.id);
  return mapRestaurant(row, popularity);
}
