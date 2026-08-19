/**
 * QA — dish ranking and multi-vendor grouping.
 *
 * The question this suite exists to answer: when six kitchens sell the same
 * dish, which one does the customer see first, and is that defensible?
 *
 * Before the ranking work these were the answers, and all five were wrong:
 * price was not a factor at all, distance was not a factor at all, a 5.0 from
 * zero ratings outranked a 4.6 from two hundred, one shop could take the whole
 * screen, and a new vendor could never surface. Each of those has a test below
 * that fails against the old scoring.
 *
 * Runs offline — no Supabase, no network, no environment. Tests
 * `lib/search/dishes.ts` directly, which is the module every food surface runs.
 *
 * Usage:
 *   npm run test:ranking
 */
import {
  bayesRating,
  buildDishIndex,
  capPerVendor,
  groupByDish,
  normalizeDishName,
  searchDishes,
  type RankContext,
} from "../../src/lib/search/dishes";
import type { MenuItem, Restaurant } from "../../src/types";

let passed = 0;
let failed = 0;

function check(name: string, actual: unknown, expected: unknown): void {
  const ok = Object.is(actual, expected);
  if (ok) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.log(`  ✗ ${name} — expected ${String(expected)}, got ${String(actual)}`);
  }
}

function near(name: string, actual: number, expected: number, tol = 0.01): void {
  const ok = Math.abs(actual - expected) <= tol;
  if (ok) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.log(`  ✗ ${name} — expected ≈${expected}, got ${actual}`);
  }
}

/* ------------------------------------------------------------------ *
 * Fixtures
 * ------------------------------------------------------------------ */

/** Bemetara town centre — the app's pinned origin. */
const ORIGIN = { lat: 21.7157, lng: 81.5335 };

/** Roughly 1 km north, and roughly 6 km north, of the origin. */
const NEAR_PIN = { lat: 21.7247, lng: 81.5335 };
const FAR_PIN = { lat: 21.7697, lng: 81.5335 };

function dish(over: Partial<MenuItem> = {}): MenuItem {
  return {
    id: "d1",
    name: "Paneer Butter Masala",
    description: "",
    price: 120,
    category: "Main Course",
    veg: true,
    ...over,
  };
}

function shop(over: Partial<Restaurant> = {}): Restaurant {
  return {
    slug: "shop",
    name: "Shop",
    tagline: "",
    cuisines: ["North Indian"],
    rating: 4.2,
    ratingCount: 50,
    etaMin: 25,
    etaMax: 35,
    priceTier: 2,
    costForTwo: 200,
    distanceKm: null,
    open: true,
    categories: [],
    menu: [dish()],
    accentTint: "",
    image: "",
    ...over,
  };
}

/* ------------------------------------------------------------------ *
 * Bayesian rating — a 5.0 from nobody is not a 5.0
 * ------------------------------------------------------------------ */

console.log("\n═══ Bayesian rating ═══");

near("5.0 from 0 ratings collapses to the prior mean", bayesRating(5, 0), 4.0);
near("4.6 from 200 ratings barely moves", bayesRating(4.6, 200), 4.5455);
near("1.0 from 0 ratings also collapses to the prior", bayesRating(1, 0), 4.0);
check(
  "a well-reviewed 4.6 outranks an unreviewed 5.0",
  bayesRating(4.6, 200) > bayesRating(5, 0),
  true
);
near("negative counts are clamped, not trusted", bayesRating(5, -10), 4.0);

/* ------------------------------------------------------------------ *
 * Name normalization — conservative on purpose
 * ------------------------------------------------------------------ */

console.log("\n═══ Dish name normalization ═══");

check(
  "case, punctuation and spacing collapse",
  normalizeDishName("PANEER-Butter  Masala."),
  "paneer butter masala"
);
check(
  "ampersand and 'and' are the same word",
  normalizeDishName("Roti & Paratha") === normalizeDishName("Roti and Paratha"),
  true
);
check(
  "half and full stay DIFFERENT dishes",
  normalizeDishName("Thali (Half)") === normalizeDishName("Thali (Full)"),
  false
);
check(
  "word order is not normalized away",
  normalizeDishName("Butter Paneer Masala") === normalizeDishName("Paneer Butter Masala"),
  false
);

/* ------------------------------------------------------------------ *
 * D1 — price is a factor
 * ------------------------------------------------------------------ */

console.log("\n═══ D1: cheaper wins, all else equal ═══");

{
  const cheap = shop({ slug: "cheap", name: "Cheap", menu: [dish({ price: 120 })] });
  const dear = shop({ slug: "dear", name: "Dear", menu: [dish({ price: 180 })] });
  const index = buildDishIndex([dear, cheap]);
  const groups = groupByDish(searchDishes(index, "paneer"));

  check("one group for one dish name", groups.length, 1);
  check("the cheaper kitchen is champion", groups[0].champion.restaurant.slug, "cheap");
  check("both kitchens are counted", groups[0].vendorCount, 2);
  check("nothing cheaper than the champion", groups[0].cheaperElsewhere, null);
}

/* ------------------------------------------------------------------ *
 * D2 — distance is a factor
 * ------------------------------------------------------------------ */

console.log("\n═══ D2: nearer wins, all else equal ═══");

{
  const near1 = shop({ slug: "near", name: "Near", lat: NEAR_PIN.lat, lng: NEAR_PIN.lng });
  const far = shop({ slug: "far", name: "Far", lat: FAR_PIN.lat, lng: FAR_PIN.lng });
  const index = buildDishIndex([far, near1]);
  const ctx: RankContext = { origin: ORIGIN };

  const groups = groupByDish(searchDishes(index, "paneer", {}, "relevance", ctx), ctx);
  check("the nearer kitchen is champion", groups[0].champion.restaurant.slug, "near");

  // And without an origin the term contributes nothing rather than guessing.
  const blind = groupByDish(searchDishes(index, "paneer"));
  check("no origin → distance is simply not consulted", blind.length, 1);
}

{
  // An unpinned shop must be neither buried nor promoted: a vendor who hasn't
  // pinned their shop would otherwise never get an order, so never pin it.
  const pinned = shop({ slug: "pinned", lat: NEAR_PIN.lat, lng: NEAR_PIN.lng, rating: 4.0 });
  const unpinned = shop({ slug: "unpinned", rating: 4.0 });
  const ctx: RankContext = { origin: ORIGIN };
  const hits = searchDishes(buildDishIndex([pinned, unpinned]), "paneer", {}, "relevance", ctx);
  const gap = Math.abs(hits[0].score - hits[1].score);
  check("unpinned shop is close behind a 1 km one, not buried", gap < 6, true);
}

/* ------------------------------------------------------------------ *
 * D3 — rating count matters
 * ------------------------------------------------------------------ */

console.log("\n═══ D3: an unreviewed 5.0 does not win ═══");

{
  // Exactly the seeded shape: `rating 5, rating_count 0`.
  const unproven = shop({ slug: "unproven", rating: 5, ratingCount: 0 });
  const proven = shop({ slug: "proven", rating: 4.6, ratingCount: 200 });
  const index = buildDishIndex([unproven, proven]);
  const groups = groupByDish(searchDishes(index, "paneer"));
  check("the genuinely reviewed kitchen is champion", groups[0].champion.restaurant.slug, "proven");
}

/* ------------------------------------------------------------------ *
 * D4 — one vendor cannot own the screen
 * ------------------------------------------------------------------ */

console.log("\n═══ D4: per-vendor diversity cap ═══");

{
  const flooder = shop({
    slug: "flooder",
    name: "Flooder",
    menu: Array.from({ length: 8 }, (_, i) =>
      dish({ id: `f${i}`, name: `Paneer Special ${i}`, price: 100 + i })
    ),
  });
  const other = shop({ slug: "other", name: "Other", menu: [dish({ id: "o1", name: "Paneer Tikka" })] });

  const hits = searchDishes(buildDishIndex([flooder, other]), "paneer");
  const capped = capPerVendor(hits, 2, 10);

  check("nothing is dropped", capped.length, hits.length);
  // The cap defers rather than drops, so in a list this short every deferred
  // dish still appears — just below. What it buys is the *leading* rows: the
  // second kitchen surfaces at position 3 instead of position 9.
  check(
    "the flooder holds at most 2 of the leading rows",
    capped.slice(0, 3).filter((h) => h.restaurant.slug === "flooder").length,
    2
  );
  check(
    "the other kitchen surfaces immediately after the cap",
    capped[2].restaurant.slug,
    "other"
  );
  check(
    "the deferred dishes follow, none lost",
    capped.slice(3).every((h) => h.restaurant.slug === "flooder"),
    true
  );
}

/* ------------------------------------------------------------------ *
 * Availability — closed kitchens demoted, never hidden
 * ------------------------------------------------------------------ */

console.log("\n═══ Availability ═══");

{
  const closed = shop({ slug: "closed", open: false, menu: [dish({ price: 80 })] });
  const open = shop({ slug: "open", open: true, menu: [dish({ price: 200 })] });
  const groups = groupByDish(searchDishes(buildDishIndex([closed, open]), "paneer"));

  check("an open kitchen champions over a cheaper closed one", groups[0].champion.restaurant.slug, "open");
  check("the closed one is still listed as an alternative", groups[0].alternatives.length, 1);
  check(
    "and it is honestly reported as cheaper",
    groups[0].cheaperElsewhere,
    80
  );
}

{
  // When everyone is shut the dish must still resolve to a row.
  const a = shop({ slug: "a", open: false });
  const b = shop({ slug: "b", open: false });
  const groups = groupByDish(searchDishes(buildDishIndex([a, b]), "paneer"));
  check("all sellers closed → the dish is still shown", groups.length, 1);
  check("with a champion", Boolean(groups[0].champion), true);
}

{
  const soldOut = shop({ slug: "soldout", menu: [dish({ price: 80, soldOut: true })] });
  const inStock = shop({ slug: "instock", menu: [dish({ price: 200 })] });
  const groups = groupByDish(searchDishes(buildDishIndex([soldOut, inStock]), "paneer"));
  check("a sold-out dish never champions over an available one", groups[0].champion.restaurant.slug, "instock");
}

/* ------------------------------------------------------------------ *
 * Grouping mechanics
 * ------------------------------------------------------------------ */

console.log("\n═══ Grouping ═══");

{
  // One shop listing the same dish twice is ONE place that sells it.
  const twice = shop({
    slug: "twice",
    menu: [dish({ id: "a", price: 150 }), dish({ id: "b", price: 120 })],
  });
  const groups = groupByDish(searchDishes(buildDishIndex([twice]), "paneer"));
  check("duplicate listings collapse to one vendor", groups[0].vendorCount, 1);
  check("represented by its cheaper listing", groups[0].champion.item.price, 120);
}

{
  const a = shop({ slug: "a", menu: [dish({ price: 120 })] });
  const b = shop({ slug: "b", menu: [dish({ price: 150 })] });
  const c = shop({ slug: "c", menu: [dish({ price: 200 })] });
  const groups = groupByDish(searchDishes(buildDishIndex([a, b, c]), "paneer"));

  check("three kitchens, one row", groups.length, 1);
  check("counted", groups[0].vendorCount, 3);
  check("label is the champion's own name, not the key", groups[0].label, "Paneer Butter Masala");
  check("alternatives carry the rest", groups[0].alternatives.length, 2);
}

{
  // The label the UI prints must never undercut the ADD button beside it.
  const dear = shop({ slug: "dear", rating: 4.9, ratingCount: 500, menu: [dish({ price: 200 })] });
  const cheap = shop({ slug: "cheap", rating: 3.0, ratingCount: 500, menu: [dish({ price: 100 })] });
  const groups = groupByDish(searchDishes(buildDishIndex([dear, cheap]), "paneer"));
  const g = groups[0];
  check(
    "cheaperElsewhere is null, or genuinely below the champion's price",
    g.cheaperElsewhere === null || g.cheaperElsewhere < g.champion.item.price,
    true
  );
}

/* ------------------------------------------------------------------ *
 * D5 — rotation is bounded and deterministic
 * ------------------------------------------------------------------ */

console.log("\n═══ D5: fairness rotation ═══");

{
  const a = shop({ slug: "a", lat: NEAR_PIN.lat, lng: NEAR_PIN.lng });
  const b = shop({ slug: "b", lat: NEAR_PIN.lat, lng: NEAR_PIN.lng });
  const index = buildDishIndex([a, b]);

  const run = (seed: string) => {
    const ctx: RankContext = { origin: ORIGIN, rotationSeed: seed };
    return groupByDish(searchDishes(index, "paneer", {}, "relevance", ctx), ctx)[0]
      .champion.restaurant.slug;
  };

  check("same seed → same champion, every time", run("u1:200") === run("u1:200"), true);

  // Across many days both comparable vendors should get turns.
  const winners = new Set(Array.from({ length: 60 }, (_, d) => run(`u1:${d}`)));
  check("comparable vendors both get turns across days", winners.size, 2);
}

{
  // Rotation must never overturn a difference the customer would notice.
  const cheap = shop({ slug: "cheap", menu: [dish({ price: 100 })] });
  const dear = shop({ slug: "dear", menu: [dish({ price: 200 })] });
  const index = buildDishIndex([cheap, dear]);

  const always = Array.from({ length: 60 }, (_, d) => {
    const ctx: RankContext = { rotationSeed: `u1:${d}` };
    return groupByDish(searchDishes(index, "paneer", {}, "relevance", ctx), ctx)[0]
      .champion.restaurant.slug;
  });

  check("a 2× price gap is never rotated away", new Set(always).size, 1);
  check("and the cheap one always wins it", always[0], "cheap");
}

/* ------------------------------------------------------------------ *
 * Regression guards on existing behaviour
 * ------------------------------------------------------------------ */

console.log("\n═══ Existing behaviour preserved ═══");

{
  const s = shop({
    slug: "s",
    menu: [dish({ id: "1", name: "Paneer Tikka" }), dish({ id: "2", name: "Veg Biryani" })],
  });
  const index = buildDishIndex([s]);

  // Tokens are ANDed in the precise pass — no dish here is both paneer AND
  // biryani — but a query that matches nothing whole is deliberately re-run
  // word by word rather than dead-ending. Those come back flagged `partial`,
  // and the screen says so.
  const split = searchDishes(index, "paneer biryani");
  check("an unanswerable phrase falls back rather than dead-ending", split.length, 2);
  check("and every fallback hit is flagged partial", split.every((h) => h.partial), true);
  check("a near miss still answers", searchDishes(index, "paneer tikka masala")[0]?.partial, true);
  check(
    "a phrase that IS answerable whole is not partial",
    searchDishes(index, "paneer tikka")[0]?.partial,
    undefined
  );
  check("empty query means 'show me the food'", searchDishes(index, "").length, 2);
  check("category filter still applies", searchDishes(index, "", { category: "biryani" }).length, 1);
  check("veg filter still applies", searchDishes(index, "", { veg: true }).length, 2);
  check("maxPrice filter still applies", searchDishes(index, "", { maxPrice: 100 }).length, 0);
}

/* ------------------------------------------------------------------ *

 * ------------------------------------------------------------------ */

console.log(`\n${failed === 0 ? "✓" : "✗"} ${passed} passed, ${failed} failed\n`);
process.exit(failed === 0 ? 0 : 1);
