/**
 * Pexels CDN URLs for legacy catalog seeding.
 * Same format as src/lib/data.ts — allowed by CSP (images.pexels.com).
 *
 * Matching priority: item NAME first (most specific dish wins), then category.
 * e.g. "Chicken Momo" → momo photo, not chicken curry.
 */

export function pexelsUrl(id: number, w = 800): string {
  return `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${w}`;
}

/** Curated Pexels ids — one pool per dish family. */
const PHOTOS = {
  momo: [36173262, 32938725, 7363674],
  biryani: [12737656, 7625056],
  dosa: [291528, 6412834],
  pizza: [1146760, 3026808, 5410400],
  burger: [1639557, 2280545],
  bread: [461198, 2456435],
  samosa: [958545, 825661],
  chinese: [5175551, 616404, 9095802],
  soup: [5175551, 616404],
  salad: [1640777, 825661],
  beverage: [376464, 9095802],
  paneer: [9797126, 1279330],
  chicken: [1109197, 1279330],
  fish: [7252875, 1109197],
  egg: [20858362, 1109197],
  dessert: [15913441, 2456435, 376464],
  thali: [958545, 825661, 1213710],
  roll: [8846006, 5175551],
  curry: [9797126, 1109197, 1279330],
  default: [958545, 825661, 1213710, 1907098],
} as const;

type PhotoPool = readonly number[];

interface DishRule {
  /** Higher = checked first among rules in the same pass. */
  priority: number;
  patterns: RegExp[];
  pool: PhotoPool;
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hashKey(value: string): number {
  let h = 0;
  for (let i = 0; i < value.length; i++) {
    h = (Math.imul(31, h) + value.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function pickPool(pool: PhotoPool, key: string): number {
  return pool[hashKey(key) % pool.length]!;
}

function firstMatch(text: string, rules: DishRule[]): PhotoPool | null {
  const sorted = [...rules].sort((a, b) => b.priority - a.priority);
  for (const rule of sorted) {
    if (rule.patterns.some((p) => p.test(text))) return rule.pool;
  }
  return null;
}

/**
 * Name-first rules — ordered by priority so "chicken momo" hits momo, not chicken.
 */
const NAME_RULES: DishRule[] = [
  {
    priority: 100,
    patterns: [/\bmomos?\b/, /\bdumpling/, /\bdim\s*sum\b/],
    pool: PHOTOS.momo,
  },
  {
    priority: 95,
    patterns: [/\bbiryani\b/, /\bpulao\b/, /\bpulav\b/, /\bmatka\b/],
    pool: PHOTOS.biryani,
  },
  {
    priority: 90,
    patterns: [
      /\bdosa\b/,
      /\bidli\b/,
      /\buttapam\b/,
      /\bupma\b/,
      /\bvada\b/,
      /\bsambar\b/,
      /\bmedu\b/,
    ],
    pool: PHOTOS.dosa,
  },
  {
    priority: 88,
    patterns: [/\bpizza\b/, /\bbrusett/, /\bbruschetta\b/],
    pool: PHOTOS.pizza,
  },
  {
    priority: 86,
    patterns: [/\bburger\b/, /\bsmash\b/],
    pool: PHOTOS.burger,
  },
  {
    priority: 89,
    patterns: [/\bsamosa\b/, /\bkachori\b/, /\bpakoda\b/, /\bpakora\b/, /\bbonda\b/],
    pool: PHOTOS.samosa,
  },
  {
    priority: 84,
    patterns: [
      /\bchowmein\b/,
      /\bnoodle/,
      /\bmanchurian\b/,
      /\bschezwan\b/,
      /\bfried\s*rice\b/,
      /\bmaggi\b/,
      /\bchilli\s*garlic\b/,
    ],
    pool: PHOTOS.chinese,
  },
  {
    priority: 82,
    patterns: [
      /\bparatha\b/,
      /\bnaan\b/,
      /\broti\b/,
      /\bbhatur/,
      /\bkulcha\b/,
      /\bchapati\b/,
      /\btandoori\s*roti\b/,
    ],
    pool: PHOTOS.bread,
  },
  {
    priority: 78,
    patterns: [/\bsoup\b/],
    pool: PHOTOS.soup,
  },
  {
    priority: 76,
    patterns: [/\bsalad\b/, /\braita\b/, /\bpapad\b/, /\bkachumber\b/],
    pool: PHOTOS.salad,
  },
  {
    priority: 74,
    patterns: [
      /\bshake\b/,
      /\bjuice\b/,
      /\blassi\b/,
      /\bcoffee\b/,
      /\btea\b/,
      /\bmilk\s*shake\b/,
      /\bcold\s*coffee\b/,
      /\bbeverage\b/,
      /\bdrink\b/,
    ],
    pool: PHOTOS.beverage,
  },
  {
    priority: 72,
    patterns: [/\bspring\s*roll\b/, /\begg\s*roll\b/, /\bchicken\s*roll\b/, /\bveg\s*roll\b/],
    pool: PHOTOS.roll,
  },
  {
    priority: 70,
    patterns: [/\bthali\b/],
    pool: PHOTOS.thali,
  },
  {
    priority: 68,
    patterns: [
      /\bsweet\b/,
      /\bdessert\b/,
      /\bcake\b/,
      /\bice\s*cream\b/,
      /\bhalwa\b/,
      /\bjamun\b/,
      /\bkulfi\b/,
    ],
    pool: PHOTOS.dessert,
  },
  {
    priority: 60,
    patterns: [/\bpaneer\b/],
    pool: PHOTOS.paneer,
  },
  {
    priority: 58,
    patterns: [/\bfish\b/, /\bprawn\b/, /\bshrimp\b/],
    pool: PHOTOS.fish,
  },
  {
    priority: 56,
    patterns: [
      /\bchicken\b/,
      /\btandoori\b/,
      /\btikka\b/,
      /\bkebab\b/,
      /\broast\s*chicken\b/,
      /\bleg\s*piece\b/,
    ],
    pool: PHOTOS.chicken,
  },
  {
    priority: 54,
    patterns: [/\bmutton\b/, /\blamb\b/, /\bkeema\b/],
    pool: PHOTOS.chicken,
  },
  {
    priority: 52,
    patterns: [/\begg\b/, /\banda\b/, /\bbhurji\b/],
    pool: PHOTOS.egg,
  },
  {
    priority: 50,
    patterns: [/\bdal\b/, /\bcurry\b/, /\bmasala\b/, /\bgravy\b/, /\bkadai\b/, /\bkadhai\b/],
    pool: PHOTOS.curry,
  },
];

/** Category fallback when the dish name is vague ("Special", "Combo", etc.). */
const CATEGORY_RULES: DishRule[] = [
  { priority: 40, patterns: [/\bmomo/], pool: PHOTOS.momo },
  { priority: 40, patterns: [/\bbiryani/], pool: PHOTOS.biryani },
  { priority: 40, patterns: [/\bsouth\s*indian/, /\bdosa/, /\bidli/], pool: PHOTOS.dosa },
  { priority: 40, patterns: [/\bpizza/], pool: PHOTOS.pizza },
  { priority: 40, patterns: [/\bburger/], pool: PHOTOS.burger },
  { priority: 40, patterns: [/\bchinese/, /\bnoodle/, /\bchow/], pool: PHOTOS.chinese },
  { priority: 40, patterns: [/\broti/, /\bparatha/, /\bnaan/, /\bbread/], pool: PHOTOS.bread },
  { priority: 40, patterns: [/\bsoup/], pool: PHOTOS.soup },
  { priority: 40, patterns: [/\bsalad/, /\braita/, /\bpapad/], pool: PHOTOS.salad },
  { priority: 40, patterns: [/\bbeverage/, /\bdrink/, /\bshake/, /\bcoffee/], pool: PHOTOS.beverage },
  { priority: 40, patterns: [/\bstarter/, /\bstarters/, /\bpakoda/], pool: PHOTOS.samosa },
  { priority: 40, patterns: [/\bcurry/, /\bgravy/, /\bmain/], pool: PHOTOS.curry },
];

function resolvePool(
  category: string,
  itemName: string,
  hint = ""
): PhotoPool {
  const name = normalize(itemName);
  const cat = normalize(category);

  let byName = firstMatch(name, NAME_RULES);
  if (!byName && hint) byName = firstMatch(normalize(hint), NAME_RULES);
  if (byName) return byName;

  const byCategory = firstMatch(cat, CATEGORY_RULES);
  if (byCategory) return byCategory;

  if (hint) {
    const byHint = firstMatch(normalize(hint), CATEGORY_RULES);
    if (byHint) return byHint;
  }

  return PHOTOS.default;
}

/** Menu item cover — matched to the dish name first. */
export function pexelsForMenuItem(
  category: string,
  itemName: string,
  hint = ""
): string {
  const pool = resolvePool(category, itemName, hint);
  return pexelsUrl(pickPool(pool, `${category}:${itemName}`), 600);
}

/** Restaurant hero — matched from shop name + cuisines. */
export function pexelsForRestaurant(
  name: string,
  cuisines: string[],
  famous?: string
): string {
  const text = normalize([name, ...cuisines, famous ?? ""].join(" "));
  const pool =
    firstMatch(text, NAME_RULES) ??
    firstMatch(text, CATEGORY_RULES) ??
    PHOTOS.default;
  return pexelsUrl(pickPool(pool, `restaurant:${name}`), 1200);
}

/** @internal — exposed for quick sanity checks in scripts. */
export function debugMatch(
  category: string,
  itemName: string,
  hint = ""
): string {
  const pool = resolvePool(category, itemName, hint);
  const poolName =
    Object.entries(PHOTOS).find(([, ids]) => ids === pool)?.[0] ?? "default";
  return poolName;
}
