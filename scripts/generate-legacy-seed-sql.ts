/**
 * Generate Supabase-ready SQL from the legacy phpMyAdmin JSON export.
 *
 * Output: supabase/seed/legacy_catalog.sql
 * Paste that file into Supabase → SQL Editor after db:seed-users.
 *
 *   npm run db:generate-legacy-sql
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  aggregateShopRatings,
  buildCategoryMap,
  inferCuisines,
  inferVeg,
  loadLegacyExport,
  parseEtaMinutes,
  parsePrice,
  productsForShop,
  resolveMenuSeedImage,
  resolveRestaurantSeedImage,
  resolveShopImportScope,
  selectShops,
  shopSlug,
} from "./lib/legacy-db";

const __dirname = dirname(fileURLToPath(import.meta.url));
const shopScope = resolveShopImportScope();
const VENDOR_EMAIL = "vendor@deligro.demo";

const jsonPath = resolve(
  process.env.LEGACY_DB_JSON ??
    join(__dirname, "..", "..", "u231346219_deligro.json")
);
const assetsBase = process.env.LEGACY_ASSETS_BASE_URL;
const imageOpts = {
  assetsBaseUrl: assetsBase,
  usePexels: process.env.USE_PEXELS_IMAGES !== "0",
};
const outPath = join(__dirname, "..", "supabase", "seed", "legacy_catalog.sql");

function sqlStr(value: string | null | undefined): string {
  if (value == null || value === "") return "NULL";
  return `'${value.replace(/'/g, "''")}'`;
}

function sqlBool(value: boolean): string {
  return value ? "true" : "false";
}

function sqlArray(values: string[]): string {
  if (values.length === 0) return "ARRAY[]::text[]";
  return `ARRAY[${values.map((v) => sqlStr(v)).join(", ")}]`;
}

function estimatePriceTier(avgPrice: number): number {
  if (avgPrice < 80) return 1;
  if (avgPrice < 180) return 2;
  return 3;
}

function main() {
  const legacy = loadLegacyExport(jsonPath);
  const shops = selectShops(legacy.shops, shopScope);
  const shopIds = new Set(shops.map((s) => s.id));
  const categoryMap = buildCategoryMap(legacy.categories);
  const ratings = aggregateShopRatings(legacy.reviews, shopIds);

  const lines: string[] = [
    "-- ============================================================",
    "-- Deligro — legacy catalog seed (generated)",
    "-- ------------------------------------------------------------",
    `-- Source: ${jsonPath}`,
    `-- Shops: ${shops.length} (${shopScope}) · generated ${new Date().toISOString()}`,
    "--",
    "-- Prereqs:",
    "--   1. Run migrations 0001–0003",
    "--   2. Run npm run db:seed-users (creates vendor@deligro.demo)",
    "--   3. Paste this file into Supabase → SQL Editor → Run",
    "--",
    "-- Idempotent: upserts on restaurants.slug and",
    "-- menu_items (restaurant_id, external_id).",
    "-- ============================================================",
    "",
    "BEGIN;",
    "",
    "DO $$",
    "BEGIN",
    `  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = ${sqlStr(VENDOR_EMAIL)}) THEN`,
    `    RAISE EXCEPTION 'Missing vendor user ${VENDOR_EMAIL}. Run npm run db:seed-users first.';`,
    "  END IF;",
    "END $$;",
    "",
  ];

  let menuTotal = 0;

  for (const shop of shops) {
    const slug = shopSlug(shop);
    const cuisines = inferCuisines(shop);
    const { etaMin, etaMax } = parseEtaMinutes(shop.deliverytime || "25 Min");
    const ratingMeta = ratings.get(shop.id);
    const legacyRating = Number.parseFloat(shop.rating);
    const rating =
      ratingMeta?.rating ??
      (Number.isFinite(legacyRating) ? legacyRating : 4.5);
    const ratingCount = ratingMeta?.ratingCount ?? 0;
    const imageUrl = resolveRestaurantSeedImage(shop, cuisines, imageOpts) || null;
    const tagline =
      shop.famous && shop.famous !== "NO" ? shop.famous : shop.tags || null;
    const products = productsForShop(legacy.products, shop.id);
    const prices = products
      .map((p) => parsePrice(p.price))
      .filter((n) => n > 0);
    const avgPrice =
      prices.length > 0
        ? prices.reduce((a, b) => a + b, 0) / prices.length
        : 0;
    const priceTier = estimatePriceTier(avgPrice);
    const costForTwo =
      avgPrice > 0 ? Math.round(avgPrice * 2.5) : null;

    const menuRows: string[] = [];
    for (const p of products) {
      const price = parsePrice(p.price);
      if (!p.pname?.trim() || price <= 0) continue;
      const externalId = `legacy-${p.id}`;
      const category = categoryMap.get(p.category_id) ?? "Popular";
      const imageUrlItem = resolveMenuSeedImage(
        category,
        p.pname.trim(),
        imageOpts,
        { aimage: p.aimage, pimage: p.pimage, description: p.pdesc }
      );
      const popular = Boolean(p.badge?.trim());
      menuRows.push(
        [
          sqlStr(externalId),
          sqlStr(p.pname.trim()),
          sqlStr(p.pdesc?.trim() || null),
          String(price),
          sqlBool(inferVeg(p.pname)),
          sqlBool(p.status === "ON"),
          sqlStr(category),
          sqlStr(imageUrlItem),
          sqlBool(popular),
          sqlBool(popular),
        ].join(", ")
      );
      menuTotal++;
    }

    lines.push(`-- ${shop.sname} (legacy shop #${shop.id})`);
    lines.push("WITH owner AS (");
    lines.push(
      `  SELECT id AS owner_id FROM auth.users WHERE email = ${sqlStr(VENDOR_EMAIL)} LIMIT 1`
    );
    lines.push("),");
    lines.push("upsert_restaurant AS (");
    lines.push("  INSERT INTO public.restaurants (");
    lines.push(
      "    owner_id, slug, name, tagline, is_open, approved, image_url, accent_tint,"
    );
    lines.push(
      "    cuisines, rating, rating_count, eta_min, eta_max, price_tier, cost_for_two, offer, promoted"
    );
    lines.push("  )");
    lines.push("  SELECT");
    lines.push("    owner.owner_id,");
    lines.push(`    ${sqlStr(slug)},`);
    lines.push(`    ${sqlStr(shop.sname.trim())},`);
    lines.push(`    ${sqlStr(tagline)},`);
    lines.push(`    ${sqlBool(shop.status === "ON")},`);
    lines.push(`    ${sqlBool(shop.approve === "YES")},`);
    lines.push(`    ${sqlStr(imageUrl)},`);
    lines.push(`    ${sqlStr("linear-gradient(135deg,#f6c453,#e8552d)")},`);
    lines.push(`    ${sqlArray(cuisines)},`);
    lines.push(`    ${rating},`);
    lines.push(`    ${ratingCount},`);
    lines.push(`    ${etaMin},`);
    lines.push(`    ${etaMax},`);
    lines.push(`    ${priceTier},`);
    lines.push(`    ${costForTwo ?? "NULL"},`);
    lines.push(
      `    ${shop.promoted === "YES" ? sqlStr("Featured") : "NULL"},`
    );
    lines.push(`    ${sqlBool(shop.promoted === "YES")}`);
    lines.push("  FROM owner");
    lines.push("  ON CONFLICT (slug) DO UPDATE SET");
    lines.push("    name = EXCLUDED.name,");
    lines.push("    tagline = EXCLUDED.tagline,");
    lines.push("    is_open = EXCLUDED.is_open,");
    lines.push("    approved = EXCLUDED.approved,");
    lines.push("    image_url = EXCLUDED.image_url,");
    lines.push("    cuisines = EXCLUDED.cuisines,");
    lines.push("    rating = EXCLUDED.rating,");
    lines.push("    rating_count = EXCLUDED.rating_count,");
    lines.push("    eta_min = EXCLUDED.eta_min,");
    lines.push("    eta_max = EXCLUDED.eta_max,");
    lines.push("    price_tier = EXCLUDED.price_tier,");
    lines.push("    cost_for_two = EXCLUDED.cost_for_two,");
    lines.push("    offer = EXCLUDED.offer,");
    lines.push("    promoted = EXCLUDED.promoted");
    lines.push("  RETURNING id");
    lines.push(menuRows.length > 0 ? ")," : ")");

    if (menuRows.length === 0) {
      lines.push("SELECT id FROM upsert_restaurant;");
    } else {
      lines.push("menu_data AS (");
      lines.push("  SELECT * FROM (");
      lines.push("    VALUES");
      lines.push(
        menuRows
          .map((row, i) => `      (${row})${i < menuRows.length - 1 ? "," : ""}`)
          .join("\n")
      );
      lines.push(
        "  ) AS v(external_id, name, description, price, veg, available, category, image_url, popular, bestseller)"
      );
      lines.push(")");
      lines.push("INSERT INTO public.menu_items (");
      lines.push(
        "  restaurant_id, external_id, name, description, price, veg, available,"
      );
      lines.push("  category, image_url, popular, bestseller");
      lines.push(")");
      lines.push("SELECT");
      lines.push("  upsert_restaurant.id,");
      lines.push(
        "  menu_data.external_id, menu_data.name, menu_data.description, menu_data.price,"
      );
      lines.push(
        "  menu_data.veg, menu_data.available, menu_data.category, menu_data.image_url,"
      );
      lines.push("  menu_data.popular, menu_data.bestseller");
      lines.push("FROM upsert_restaurant");
      lines.push("CROSS JOIN menu_data");
      lines.push(
        "ON CONFLICT (restaurant_id, external_id) WHERE external_id IS NOT NULL DO UPDATE SET"
      );
      lines.push("  name = EXCLUDED.name,");
      lines.push("  description = EXCLUDED.description,");
      lines.push("  price = EXCLUDED.price,");
      lines.push("  veg = EXCLUDED.veg,");
      lines.push("  available = EXCLUDED.available,");
      lines.push("  category = EXCLUDED.category,");
      lines.push("  image_url = EXCLUDED.image_url,");
      lines.push("  popular = EXCLUDED.popular,");
      lines.push("  bestseller = EXCLUDED.bestseller;");
    }
    lines.push("");
  }

  if (legacy.settings) {
    lines.push("-- Legacy delivery rules (reference — wire into app config separately):");
    lines.push(
      `-- min order ₹${legacy.settings.min_order_amount}, free delivery above ₹${legacy.settings.free_delivery}`
    );
    lines.push("");
  }

  lines.push("COMMIT;");
  lines.push("");
  lines.push("-- Verify import (this is what the SQL Editor result should show):");
  lines.push("SELECT");
  lines.push(
    "  (SELECT count(*)::int FROM public.restaurants) AS total_restaurants,"
  );
  lines.push(
    "  (SELECT count(*)::int FROM public.menu_items WHERE external_id LIKE 'legacy-%') AS legacy_menu_items,"
  );
  lines.push(
    "  (SELECT count(*)::int FROM public.restaurants WHERE is_open = true) AS open_restaurants;"
  );
  lines.push("");
  lines.push(`-- Expected after full seed: ~62 restaurants, ~${menuTotal} legacy menu items`);

  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, lines.join("\n"), "utf8");
  console.log(`Wrote ${outPath}`);
  console.log(`${shops.length} restaurants, ${menuTotal} menu items`);
}

main();
