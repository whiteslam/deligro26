import "server-only";
import { cache } from "react";
import { DEFAULT_SETTINGS } from "@/lib/settings-defaults";
import {
  SettingsNotMigratedError,
  getSettingsFromDb,
  settingsTableExists,
} from "@/lib/data-access/settings";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { PlatformSettings } from "@/types";

/**
 * Server facade for platform settings. Live Supabase row when configured and
 * migrated, otherwise the shared defaults — so the app behaves identically
 * before the Settings tab is ever opened. Mirrors `catalog.ts` / `banners.ts`.
 *
 * `cache()` dedupes the read within a single request: the fee, the availability
 * gate, and the support footer can each call `getSettings()` and hit the DB once.
 */
export const getSettings = cache(async (): Promise<PlatformSettings> => {
  if (!isSupabaseConfigured) return DEFAULT_SETTINGS;

  try {
    return await getSettingsFromDb();
  } catch (err) {
    // Not migrated yet → defaults, so nothing breaks during rollout.
    if (err instanceof SettingsNotMigratedError) return DEFAULT_SETTINGS;
    return DEFAULT_SETTINGS;
  }
});

/** Is the settings backend live and migrated? Drives the Admin notice. */
export async function settingsBackendReady(): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  try {
    return await settingsTableExists();
  } catch {
    return false;
  }
}
