import "server-only";
import { BANNERS } from "@/lib/data";
import {
  BannersNotMigratedError,
  bannersTableExists,
  getBannerFromDb,
  listActiveBannersFromDb,
  listAllBannersFromDb,
} from "@/lib/data-access/banners";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { Banner, BannerPlacement } from "@/types";

/**
 * Server facade for promotional banners: live Supabase campaigns when the
 * backend is configured, otherwise the demo `BANNERS` (mock mode). Mirrors
 * `catalog.ts` so the surface the app imports never changes with the backend.
 */

/** Is a mock banner live and attached to this placement? Mirrors the RLS rule. */
function mockIsServable(banner: Banner, placement: BannerPlacement): boolean {
  if (banner.status !== "active") return false;
  if (!banner.placements.includes(placement)) return false;
  const now = Date.now();
  if (banner.startsAt && new Date(banner.startsAt).getTime() > now) return false;
  if (banner.endsAt && new Date(banner.endsAt).getTime() <= now) return false;
  return true;
}

function mockActive(placement: BannerPlacement): Banner[] {
  return BANNERS.filter((b) => mockIsServable(b, placement)).sort(
    (a, b) => b.priority - a.priority || a.displayOrder - b.displayOrder
  );
}

/** The active campaigns for a placement, best-priority first. */
export async function listActiveBanners(
  placement: BannerPlacement
): Promise<Banner[]> {
  if (!isSupabaseConfigured) return mockActive(placement);

  try {
    return await listActiveBannersFromDb(placement);
  } catch (err) {
    // Table not created yet → show the demo set so the carousel still renders
    // during rollout. Any other failure → empty (a broken read isn't a promo).
    if (err instanceof BannersNotMigratedError) return mockActive(placement);
    return [];
  }
}

function mockAll(): Banner[] {
  return [...BANNERS].sort(
    (a, b) => b.priority - a.priority || a.displayOrder - b.displayOrder
  );
}

/** One campaign by id — the Admin edit screen. */
export async function getBanner(id: string): Promise<Banner | null> {
  if (!isSupabaseConfigured) {
    return BANNERS.find((b) => b.id === id) ?? null;
  }

  try {
    return await getBannerFromDb(id);
  } catch (err) {
    if (err instanceof BannersNotMigratedError) {
      return BANNERS.find((b) => b.id === id) ?? null;
    }
    return null;
  }
}

/** Every campaign for the Admin list. Falls back to the demo set in mock mode. */
export async function listAllBanners(): Promise<Banner[]> {
  if (!isSupabaseConfigured) return mockAll();

  try {
    return await listAllBannersFromDb();
  } catch (err) {
    if (err instanceof BannersNotMigratedError) return mockAll();
    return [];
  }
}

/**
 * Is the banners backend live and migrated? Drives the Admin notice: writes only
 * persist once this is true. False in demo mode or before migration 0014 runs.
 */
export async function bannersBackendReady(): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  try {
    return await bannersTableExists();
  } catch {
    return false;
  }
}
