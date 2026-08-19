import { STORE_CATEGORIES } from "@/lib/taxonomy";
import type { PlatformSettings } from "@/types";

/**
 * Which storefront categories are actually on offer.
 *
 * `platform_settings.feature_grocery` / `feature_pick_drop` are editable in the
 * admin Settings tab, validated, clamped and written to the database — and were
 * read by no customer-facing code at all. An admin switching Groceries off to
 * handle a supplier outage got a "Saved" confirmation and a storefront where the
 * category tile, the grocery hero and its WhatsApp CTA all carried on taking
 * orders. This is the consumer that was missing.
 *
 * Pure, and shared by the category strip and the Stores page, so a category
 * cannot be hidden from one and reachable from the other — a tile that is gone
 * but whose `?category=` link still works is the same bug wearing a hat.
 *
 * ## feature_pharmacy
 *
 * Deliberately absent. There is no pharmacy category, hero or vertical anywhere
 * in the product, so the toggle has nothing to gate: wiring it here would create
 * the appearance of a control over a feature that does not exist. It has been
 * removed from the Settings form instead. The column stays — dropping it is a
 * migration, and it costs nothing where it is — but nothing now presents it as
 * operational.
 */
const CATEGORY_FEATURE: Record<string, keyof PlatformSettings> = {
  groceries: "featureGrocery",
  "pick-drop": "featurePickDrop",
};

export function isStoreCategoryEnabled(
  id: string,
  settings: Pick<PlatformSettings, "featureGrocery" | "featurePickDrop">
): boolean {
  const flag = CATEGORY_FEATURE[id];
  if (!flag) return true;
  return Boolean((settings as Record<string, unknown>)[flag]);
}

export function enabledStoreCategories(
  settings: Pick<PlatformSettings, "featureGrocery" | "featurePickDrop">
) {
  return STORE_CATEGORIES.filter((c) => isStoreCategoryEnabled(c.id, settings));
}
