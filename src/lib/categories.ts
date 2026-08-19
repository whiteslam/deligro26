import "server-only";
import { cache } from "react";
import { HOME_CATEGORIES } from "@/lib/taxonomy";
import { getCategoryImageOverrides } from "@/lib/data-access/category-images";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { Category } from "@/types";

/**
 * The Home cuisine strip, with each tile's picture resolved.
 *
 * Curated defaults from `lib/taxonomy.ts`, overridden per category by whatever
 * an operator has set in `category_images` (migration 0037) — so the strip is
 * right on a fresh install and can be swapped to photographs of real local
 * product without a deploy.
 *
 * Mirrors `settings.ts`: `cache()` dedupes within a request, and a backend that
 * is absent or un-migrated degrades to the defaults rather than to nothing.
 *
 * The failure direction is deliberately the opposite of `getSettings()`. A
 * settings read that fails must not invent permissive config, because config
 * decides what customers are charged and whether orders are taken. A picture
 * decides what a tile looks like: falling back to the shipped default is
 * strictly better than an empty strip, and there is nothing here to get wrong
 * about money or availability.
 */
export const getHomeCategories = cache(async (): Promise<Category[]> => {
  if (!isSupabaseConfigured) return HOME_CATEGORIES;

  try {
    const overrides = await getCategoryImageOverrides();
    if (overrides.size === 0) return HOME_CATEGORIES;

    return HOME_CATEGORIES.map((c) => {
      const override = overrides.get(c.id);
      return override ? { ...c, image: override } : c;
    });
  } catch {
    // Un-migrated, unreachable, or an RLS regression — the defaults still make
    // a correct strip, so this is not worth failing a page render over.
    return HOME_CATEGORIES;
  }
});
