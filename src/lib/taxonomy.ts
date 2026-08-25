import { findFoodCategory } from "@/lib/search/dishes";
import type { Category, StoreCategory } from "@/types";

/**
 * The product's live taxonomies — the cuisine strip on Home and the storefront
 * types on the Stores tab.
 *
 * These used to live in `lib/data.ts` alongside the Phase 1 mock catalogue,
 * orders, addresses and user. Everything else in that module is a demo fixture
 * reachable only behind `!isSupabaseConfigured`, which cannot be true in a
 * production build — but these two are ungated and render for every customer on
 * every visit. Sitting in a file headed "Static mock data" made them look
 * disposable, and made the mock module look load-bearing. They are separated so
 * that each file means one thing.
 */

/**
 * Which cuisines the Home strip features, in display order.
 *
 * Ids, not full records, because every chip links to `/search?category=<id>` and
 * the search taxonomy is the thing that decides whether that link goes anywhere.
 * `FOOD_CATEGORIES` in `lib/search/dishes.ts` is that taxonomy and it stays the
 * source of the label — a strip carrying its own copy is how a chip ends up
 * advertising a category search cannot answer.
 *
 * Ordered for a Tier-3 Indian market, most-ordered first: thali and biryani open
 * the strip, the metro shorthand (pizza, burgers) sits mid-list, and "Healthy"
 * is deliberately absent — salad-and-bowl demand is a metro pattern and the
 * front page is finite. It stays searchable, just not featured.
 */
const HOME_CATEGORY_IDS = [
  "thali",
  "biryani",
  "chinese",
  "momos",
  "snacks",
  "south",
  "rolls",
  "paratha",
  "chicken",
  "egg",
  "pizza",
  "burgers",
  "desserts",
  "icecream",
  "beverages",
] as const;

type HomeCategoryId = (typeof HOME_CATEGORY_IDS)[number];

/**
 * Emoji per chip. A fallback only — the tile renders a photograph, and this is
 * what shows if the image is still loading or fails outright.
 */
const CATEGORY_EMOJI: Record<HomeCategoryId, string> = {
  thali: "🍛",
  biryani: "🍚",
  chinese: "🥡",
  momos: "🥟",
  snacks: "🥠",
  south: "🥞",
  rolls: "🌯",
  paratha: "🫓",
  chicken: "🍗",
  egg: "🥚",
  pizza: "🍕",
  burgers: "🍔",
  desserts: "🍮",
  icecream: "🍨",
  beverages: "🥤",
};

/**
 * The gradient behind each tile, showing while the photo loads and underneath
 * it if it never does — the same "photography is the colour, gradient is the
 * backdrop" rule `PhotoTile` follows for restaurant covers.
 */
const CATEGORY_TINT: Record<HomeCategoryId, string> = {
  thali: "linear-gradient(135deg,#f6c453,#e8552d)",
  biryani: "linear-gradient(135deg,#f2a65a,#c2410c)",
  chinese: "linear-gradient(135deg,#f87171,#991b1b)",
  momos: "linear-gradient(135deg,#e5e7eb,#9ca3af)",
  snacks: "linear-gradient(135deg,#fbbf24,#b45309)",
  south: "linear-gradient(135deg,#fde68a,#d97706)",
  rolls: "linear-gradient(135deg,#fca5a5,#b91c1c)",
  paratha: "linear-gradient(135deg,#fcd34d,#92400e)",
  chicken: "linear-gradient(135deg,#f97316,#7c2d12)",
  egg: "linear-gradient(135deg,#fef3c7,#f59e0b)",
  pizza: "linear-gradient(135deg,#fb923c,#b91c1c)",
  burgers: "linear-gradient(135deg,#fbbf24,#78350f)",
  desserts: "linear-gradient(135deg,#f9a8d4,#be185d)",
  icecream: "linear-gradient(135deg,#bfdbfe,#6366f1)",
  beverages: "linear-gradient(135deg,#86efac,#047857)",
};

/**
 * Default photograph per category.
 *
 * Every slug here is taken from the curated pool in
 * `scripts/lib/unsplash-images.ts` — the same verified set that seeds restaurant
 * and menu-item covers, so the strip and the catalogue beneath it are shot from
 * one library rather than two. Copied rather than imported because that module
 * lives under `scripts/` and is not part of the app bundle.
 *
 * These are stock photographs of the dish family, not of any particular shop's
 * food. An operator replaces any of them with a real photo of the real product
 * from Admin → Storage, which writes `category_images` (migration
 * 0037) and takes effect without a deploy. See `lib/categories.ts`.
 *
 * `images.unsplash.com` is one of only two hosts the CSP allows for images (the
 * other being Supabase Storage, which is where an uploaded replacement lands).
 */
const CATEGORY_PHOTO: Record<HomeCategoryId, string> = {
  thali: "photo-1585937421612-70a008356fbe",
  biryani: "photo-1563379091339-03b21ab4a4f8",
  chinese: "photo-1585032226651-759b368d7246",
  momos: "photo-1496116218417-1a781b1c416c",
  snacks: "photo-1601050690117-94f5f6fa8bd7",
  south: "photo-1668236543090-82eba5ee5976",
  rolls: "photo-1541014741259-de529411b96a",
  paratha: "photo-1601050690597-df0568f70950",
  chicken: "photo-1610057099443-fde8c4d50f91",
  egg: "photo-1482049016688-2d3e1b311543",
  pizza: "photo-1513104890138-7c749659a591",
  burgers: "photo-1568901346375-23c9450c58cd",
  desserts: "photo-1551024506-0bccd828d307",
  icecream: "photo-1578985545062-69928b1d9587",
  beverages: "photo-1544145945-f90425340c7e",
};

/**
 * A tile is 64px at 1x. 200px covers a 3x screen with room to spare, and keeps
 * fifteen of these off a Tier-3 mobile connection's budget — the strip is the
 * first thing under the header, so it is competing with the page's own paint.
 */
function unsplashTile(slug: string): string {
  return `https://images.unsplash.com/${slug}?w=200&h=200&q=70&auto=format&fit=crop`;
}

/**
 * Throws at module load if a featured id has no search category behind it.
 *
 * Deliberately loud. The alternative — skipping the chip, or falling back to a
 * title-cased id — hides a broken link behind something that looks fine, and a
 * customer tapping "South Indian" and landing on unfiltered search has no way
 * to tell it was a bug. This fails the build instead.
 */
export const HOME_CATEGORIES: Category[] = HOME_CATEGORY_IDS.map((id) => {
  const food = findFoodCategory(id);
  if (!food) {
    throw new Error(
      `taxonomy: home category "${id}" has no FOOD_CATEGORIES entry, so its chip would link to a search that ignores it.`
    );
  }
  return {
    id,
    label: food.label,
    emoji: CATEGORY_EMOJI[id],
    image: unsplashTile(CATEGORY_PHOTO[id]),
    tint: CATEGORY_TINT[id],
  };
});

/**
 * The Stores tab taxonomy. A store lands in a category when one of its cuisine
 * tags matches — so onboarding a bakery means tagging it "Bakery", nothing more.
 * "Pick & Drop" is an errand service rather than a storefront, which is why it
 * has no food tags of its own.
 *
 * Which of these are actually offered is an admin setting — see
 * `lib/store-categories.ts`.
 */
export const STORE_CATEGORIES: StoreCategory[] = [
  { id: "bakery", label: "Bakery", emoji: "🥐", tags: ["Bakery", "Desserts"] },
  { id: "dairy", label: "Dairy", emoji: "🥛", tags: ["Dairy"] },
  { id: "groceries", label: "Groceries", emoji: "🛒", tags: ["Groceries", "Kirana"] },
  { id: "pick-drop", label: "Pick & Drop", emoji: "🛵", tags: ["Pick & Drop"] },
  { id: "raw-meat", label: "Raw Meat", emoji: "🍗", tags: ["Raw Meat", "Meat", "Fish"] },
  { id: "chowpaty", label: "Chowpaty", emoji: "🍧", tags: ["Chowpaty", "Street Food", "Chaat"] },
];
