/**
 * Dish-first search.
 *
 * The catalog is modelled as restaurants that own menus, but a hungry person
 * searches for *food* — "paneer tikka", "cold coffee", "biryani" — and wants the
 * dish, with the shop as an attribute of it. Everything here turns the
 * restaurant-shaped catalog into a flat, rankable list of dishes.
 *
 * Deliberately pure and framework-free (no "server-only"): the customer app
 * already loads the whole approved catalog with menus for the feed, so search
 * runs over that same array on the client and stays instant while typing. If the
 * catalog outgrows that, the seam to move is `buildDishIndex` — swap it for a
 * server query and the ranking below is unchanged.
 */

import type { MenuItem, Restaurant } from "@/types";

/** A dish kept with the kitchen that cooks it — the unit a food search returns. */
export interface IndexedDish {
  /**
   * Globally unique. `MenuItem.id` is only unique *within one menu* (it is the
   * vendor's external id when they set one), so two shops can both call a dish
   * "veg-1" — this is what React keys and cart lookups must use.
   */
  key: string;
  item: MenuItem;
  restaurant: Restaurant;
  // Pre-lowercased haystacks. Built once per catalog, reused on every keystroke.
  name: string;
  category: string;
  description: string;
  cuisines: string;
  shop: string;
}

export interface DishHit extends IndexedDish {
  score: number;
  /**
   * True when the dish only answers *some* of the words typed. Only ever set
   * when nothing matched all of them — the UI says so rather than passing a
   * near-miss off as the thing that was asked for.
   */
  partial?: boolean;
}

/** A restaurant plus the dishes of its that answered the query. */
export interface ShopHit {
  restaurant: Restaurant;
  score: number;
  /** Best-matching dishes first. Empty when the shop matched by name alone. */
  dishes: DishHit[];
}

export type DishSort = "relevance" | "price" | "eta" | "rating";

export interface SearchFilters {
  /** Dish-level: the dish itself is vegetarian. */
  veg?: boolean;
  /** Dish-level: flagged popular / ranked a bestseller. */
  popular?: boolean;
  /** Dish-level: price at or under this many rupees. */
  maxPrice?: number | null;
  /** Shop-level. */
  fast?: boolean;
  rating?: boolean;
  offers?: boolean;
  /** Food category id from FOOD_CATEGORIES. */
  category?: string | null;
}

/* ------------------------------------------------------------------ *
 * Index
 * ------------------------------------------------------------------ */

export function buildDishIndex(restaurants: Restaurant[]): IndexedDish[] {
  const index: IndexedDish[] = [];
  for (const restaurant of restaurants) {
    const shop = restaurant.name.toLowerCase();
    const cuisines = restaurant.cuisines.join(" ").toLowerCase();
    for (const item of restaurant.menu) {
      index.push({
        key: `${restaurant.slug}:${item.id}`,
        item,
        restaurant,
        name: item.name.toLowerCase(),
        category: item.category.toLowerCase(),
        description: item.description.toLowerCase(),
        cuisines,
        shop,
      });
    }
  }
  return index;
}

/* ------------------------------------------------------------------ *
 * Matching
 * ------------------------------------------------------------------ */

/** Letters and digits in any script — Devanagari dish names tokenize too. */
const WORD_CHAR = /[\p{L}\p{N}]/u;

export function tokenize(query: string): string[] {
  return query.trim().toLowerCase().split(/\s+/).filter(Boolean);
}

/** Does `token` start a word inside `hay`? "tikka" matches "paneer tikka". */
function startsWord(hay: string, token: string): boolean {
  let i = hay.indexOf(token);
  while (i !== -1) {
    if (i === 0 || !WORD_CHAR.test(hay[i - 1])) return true;
    i = hay.indexOf(token, i + 1);
  }
  return false;
}

/**
 * How well one dish answers one word, highest-signal field first. Zero means
 * this word is nowhere in the dish, which disqualifies the dish entirely —
 * tokens are ANDed, so "paneer roll" will not surface every roll on the menu.
 */
function scoreToken(d: IndexedDish, token: string): number {
  if (d.name === token) return 140;
  if (d.name.startsWith(token)) return 100;
  if (startsWord(d.name, token)) return 80;
  if (d.name.includes(token)) return 55;
  if (startsWord(d.category, token)) return 36;
  if (d.category.includes(token)) return 28;
  if (startsWord(d.cuisines, token)) return 24;
  if (startsWord(d.shop, token)) return 20;
  if (d.shop.includes(token)) return 15;
  if (startsWord(d.description, token)) return 12;
  if (d.description.includes(token)) return 6;
  return 0;
}

/**
 * The part of the score that has nothing to do with the words typed: what sells,
 * what's rated well, what actually arrives soon. Also what pushes a sold-out
 * dish or a shut kitchen below everything orderable without hiding it — "they
 * have it, just not now" is a useful answer.
 */
function baseScore(d: IndexedDish): number {
  let s = 0;
  if (d.item.popular || d.item.bestseller) s += 14;
  s += Math.min(d.item.unitsSold ?? 0, 100) * 0.15;
  s += d.restaurant.rating * 2;
  s -= Math.min(d.restaurant.etaMin, 60) * 0.15;
  if (d.item.soldOut) s -= 60;
  if (!d.restaurant.open) s -= 45;
  return s;
}

/* ------------------------------------------------------------------ *
 * Food categories — what the chips and the home strip mean
 * ------------------------------------------------------------------ */

/**
 * A category of *food*, not of shop.
 *
 * The old search mapped "Pizza" onto the Italian cuisine tag, so it answered
 * "which restaurants are Italian?" rather than "who has pizza?". `keywords`
 * match the dish; `cuisines` are only a fallback for menus whose dish names give
 * nothing away (a legacy import of "Item 14"), so the chip is never a dead end.
 */
export interface FoodCategory {
  id: string;
  label: string;
  keywords: string[];
  cuisines: string[];
}

/** Ids match `CATEGORIES` in lib/data so `/search?category=pizza` keeps working. */
export const FOOD_CATEGORIES: FoodCategory[] = [
  {
    id: "biryani",
    label: "Biryani",
    keywords: ["biryani", "biriyani", "dum", "pulao", "pulav"],
    cuisines: ["Biryani", "North Indian"],
  },
  {
    id: "pizza",
    label: "Pizza",
    keywords: ["pizza", "margherita", "calzone", "garlic bread"],
    cuisines: ["Italian"],
  },
  {
    id: "burgers",
    label: "Burgers",
    keywords: ["burger", "fries", "sandwich", "nuggets"],
    cuisines: ["Fast Food"],
  },
  {
    id: "rolls",
    label: "Rolls",
    keywords: ["roll", "kathi", "frankie", "wrap", "shawarma"],
    cuisines: ["Fast Food"],
  },
  {
    id: "chinese",
    label: "Chinese",
    keywords: [
      "noodle",
      "noodles",
      "hakka",
      "manchurian",
      "momo",
      "fried rice",
      "schezwan",
      "chowmein",
      "spring roll",
    ],
    cuisines: ["Chinese"],
  },
  {
    id: "south",
    label: "South Indian",
    keywords: ["dosa", "idli", "vada", "uttapam", "sambar", "upma", "appam"],
    cuisines: ["South Indian"],
  },
  {
    id: "healthy",
    label: "Healthy",
    keywords: ["salad", "bowl", "smoothie", "grill", "soup", "sprout", "quinoa"],
    cuisines: ["Healthy"],
  },
  {
    id: "desserts",
    label: "Desserts",
    keywords: [
      "cake",
      "ice cream",
      "brownie",
      "gulab",
      "jamun",
      "kulfi",
      "halwa",
      "pastry",
      "dessert",
      "falooda",
    ],
    cuisines: ["Desserts"],
  },
  {
    id: "beverages",
    label: "Drinks",
    keywords: [
      "coffee",
      "tea",
      "chai",
      "lassi",
      "shake",
      "juice",
      "mojito",
      "soda",
      "cola",
      "beverage",
      "drink",
    ],
    cuisines: [],
  },
];

export function findFoodCategory(id: string | null | undefined): FoodCategory | null {
  if (!id) return null;
  return FOOD_CATEGORIES.find((c) => c.id === id) ?? null;
}

function matchesKeywords(d: IndexedDish, cat: FoodCategory): boolean {
  return cat.keywords.some(
    (k) => startsWord(d.name, k) || startsWord(d.category, k)
  );
}

/**
 * Dishes in a category. Keyword-matched against the dish itself; only if the
 * whole catalog yields nothing that way do we fall back to the shop's cuisine
 * tags, so the chip degrades to the old restaurant-level behaviour instead of
 * showing an empty screen.
 */
function filterCategory(dishes: IndexedDish[], cat: FoodCategory): IndexedDish[] {
  const byDish = dishes.filter((d) => matchesKeywords(d, cat));
  if (byDish.length || !cat.cuisines.length) return byDish;
  return dishes.filter((d) =>
    d.restaurant.cuisines.some((c) => cat.cuisines.includes(c))
  );
}

/**
 * How a category chip is being answered — so the screen can caption itself
 * truthfully. "cuisine" means no dish on any menu is actually a roll and what
 * you're looking at is the fast-food shops instead; saying that out loud is the
 * difference between a helpful fallback and a milkshake filed under Rolls.
 */
export function categoryBasis(
  index: IndexedDish[],
  id: string | null | undefined
): "dish" | "cuisine" | "none" {
  const cat = findFoodCategory(id);
  if (!cat) return "none";
  if (index.some((d) => matchesKeywords(d, cat))) return "dish";
  if (!cat.cuisines.length) return "none";
  return index.some((d) => d.restaurant.cuisines.some((c) => cat.cuisines.includes(c)))
    ? "cuisine"
    : "none";
}

/* ------------------------------------------------------------------ *
 * Search
 * ------------------------------------------------------------------ */

function passesFilters(d: IndexedDish, f: SearchFilters): boolean {
  if (f.veg && !d.item.veg) return false;
  if (f.popular && !(d.item.popular || d.item.bestseller)) return false;
  if (f.maxPrice != null && d.item.price > f.maxPrice) return false;
  if (f.fast && d.restaurant.etaMax > 25) return false;
  if (f.rating && d.restaurant.rating < 4.5) return false;
  if (f.offers && !d.restaurant.offer) return false;
  return true;
}

function compare(a: DishHit, b: DishHit, sort: DishSort): number {
  switch (sort) {
    case "price":
      return a.item.price - b.item.price || b.score - a.score;
    case "eta":
      return a.restaurant.etaMin - b.restaurant.etaMin || b.score - a.score;
    case "rating":
      return b.restaurant.rating - a.restaurant.rating || b.score - a.score;
    default:
      return b.score - a.score || a.name.localeCompare(b.name);
  }
}

/**
 * Rank dishes for a query. An empty query is not an empty result: it means
 * "show me the food", ranked by what sells and how good the kitchen is — which
 * is what makes the search tab worth opening before you've typed anything.
 */
export function searchDishes(
  index: IndexedDish[],
  query: string,
  filters: SearchFilters = {},
  sort: DishSort = "relevance"
): DishHit[] {
  const category = findFoodCategory(filters.category);
  const pool = category ? filterCategory(index, category) : index;
  const tokens = tokenize(query);

  const eligible = pool.filter((d) => passesFilters(d, filters));

  if (!tokens.length) {
    return eligible
      .map((d) => ({ ...d, score: baseScore(d) }))
      .sort((a, b) => compare(a, b, sort));
  }

  const hits = rank(eligible, tokens, true);

  // "chicken tikka" with no tikka anywhere would otherwise be a dead end, so a
  // phrase that matches nothing whole is re-run word by word. Flagged partial:
  // these are near misses, and the screen labels them as such.
  const results = hits.length ? hits : rank(eligible, tokens, false);

  return results.sort((a, b) => compare(a, b, sort));
}

/**
 * Score a pool against every token. `all` = a dish must answer every word
 * (the precise pass); otherwise one word is enough (the near-miss pass).
 */
function rank(pool: IndexedDish[], tokens: string[], all: boolean): DishHit[] {
  const hits: DishHit[] = [];
  for (const d of pool) {
    let sum = 0;
    let matched = 0;
    for (const token of tokens) {
      const s = scoreToken(d, token);
      if (s === 0) {
        if (all) {
          matched = -1;
          break;
        }
        continue;
      }
      sum += s;
      matched += 1;
    }
    if (matched <= 0) continue;
    const hit: DishHit = { ...d, score: baseScore(d) + sum / tokens.length };
    if (!all) hit.partial = true;
    hits.push(hit);
  }
  return hits;
}

/**
 * The same result set seen as restaurants: who can cook this, best match first,
 * carrying the dishes that matched so the card can say *why* it's here.
 *
 * Shops with an empty menu can never produce a dish hit, so they are matched on
 * name and cuisine directly — otherwise a shop you searched by name would
 * vanish the moment its menu was empty.
 */
export function groupByShop(
  hits: DishHit[],
  restaurants: Restaurant[],
  query: string,
  filters: SearchFilters = {},
  sort: DishSort = "relevance"
): ShopHit[] {
  const bySlug = new Map<string, ShopHit>();

  for (const hit of hits) {
    const existing = bySlug.get(hit.restaurant.slug);
    if (existing) {
      existing.dishes.push(hit);
      existing.score = Math.max(existing.score, hit.score);
    } else {
      bySlug.set(hit.restaurant.slug, {
        restaurant: hit.restaurant,
        score: hit.score,
        dishes: [hit],
      });
    }
  }

  const tokens = tokenize(query);
  const dishOnlyFilter =
    Boolean(filters.veg) ||
    Boolean(filters.popular) ||
    filters.maxPrice != null ||
    Boolean(filters.category);

  // Menu-less shops: no dish can vouch for them, so match the shop itself. Left
  // out entirely when a dish-level filter is on — "Pure Veg" cannot be honestly
  // claimed for a shop with nothing to inspect.
  if (!dishOnlyFilter) {
    for (const r of restaurants) {
      if (r.menu.length || bySlug.has(r.slug)) continue;
      if (filters.fast && r.etaMax > 25) continue;
      if (filters.rating && r.rating < 4.5) continue;
      if (filters.offers && !r.offer) continue;

      const shop = r.name.toLowerCase();
      const cuisines = r.cuisines.join(" ").toLowerCase();
      const matched =
        !tokens.length ||
        tokens.every((t) => startsWord(shop, t) || startsWord(cuisines, t));
      if (!matched) continue;

      bySlug.set(r.slug, {
        restaurant: r,
        score: r.rating * 2 - (tokens.length ? 30 : 0),
        dishes: [],
      });
    }
  }

  const shops = [...bySlug.values()];
  for (const shop of shops) shop.dishes.sort((a, b) => b.score - a.score);

  return shops.sort((a, b) => {
    switch (sort) {
      case "price":
        return cheapest(a) - cheapest(b) || b.score - a.score;
      case "eta":
        return a.restaurant.etaMin - b.restaurant.etaMin || b.score - a.score;
      case "rating":
        return b.restaurant.rating - a.restaurant.rating || b.score - a.score;
      default:
        return b.score - a.score;
    }
  });
}

function cheapest(shop: ShopHit): number {
  // Reduced rather than Math.min(...spread): a long menu would be a long
  // argument list, and this runs on every re-sort.
  return shop.dishes.reduce(
    (min, d) => Math.min(min, d.item.price),
    Number.MAX_SAFE_INTEGER
  );
}
