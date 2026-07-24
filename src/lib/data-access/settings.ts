import "server-only";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_SETTINGS } from "@/lib/settings-defaults";
import type { PlatformSettings } from "@/types";

/**
 * The single platform-settings row, from Supabase. Reads ride the public-read
 * policy; the update rides the admin-write policy (a non-admin write is rejected
 * by RLS, so it throws — a silently-dropped settings save is worse than a loud
 * one). Missing table (migration 0015 not applied) is signalled distinctly so
 * the facade can fall back to defaults during rollout.
 */

export class SettingsNotMigratedError extends Error {
  constructor() {
    super("settings_not_migrated");
    this.name = "SettingsNotMigratedError";
  }
}

function isMissingTable(
  error: { code?: string; message?: string } | null
): boolean {
  if (!error) return false;
  const code = error.code ?? "";
  const msg = (error.message ?? "").toLowerCase();
  return (
    code === "42P01" ||
    code === "PGRST205" ||
    msg.includes("schema cache") ||
    msg.includes("does not exist")
  );
}

interface SettingsRow {
  delivery_fee: number;
  tax_rate: number | string;
  free_delivery_threshold: number;
  min_order: number;
  business_name: string;
  support_phone: string;
  support_email: string;
  support_whatsapp: string;
  business_address: string;
  accepting_orders: boolean;
  maintenance_message: string;
  feature_grocery: boolean;
  feature_pharmacy: boolean;
  feature_pick_drop: boolean;
  default_prep_minutes: number;
  delivery_radius_km: number | string;
  rider_commission: number | string;
  rider_min_payout: number;
}

const SELECT = `
  delivery_fee, tax_rate, free_delivery_threshold, min_order,
  business_name, support_phone, support_email, support_whatsapp, business_address,
  accepting_orders, maintenance_message,
  feature_grocery, feature_pharmacy, feature_pick_drop,
  default_prep_minutes, delivery_radius_km, rider_commission, rider_min_payout
`;

function mapSettings(row: SettingsRow): PlatformSettings {
  return {
    deliveryFee: Number(row.delivery_fee),
    taxRate: Number(row.tax_rate),
    freeDeliveryThreshold: Number(row.free_delivery_threshold),
    minOrder: Number(row.min_order),
    businessName: row.business_name,
    supportPhone: row.support_phone,
    supportEmail: row.support_email,
    supportWhatsapp: row.support_whatsapp,
    businessAddress: row.business_address,
    acceptingOrders: row.accepting_orders,
    maintenanceMessage: row.maintenance_message,
    featureGrocery: row.feature_grocery,
    featurePharmacy: row.feature_pharmacy,
    featurePickDrop: row.feature_pick_drop,
    defaultPrepMinutes: Number(row.default_prep_minutes),
    deliveryRadiusKm: Number(row.delivery_radius_km),
    riderCommission: Number(row.rider_commission),
    riderMinPayout: Number(row.rider_min_payout),
  };
}

export async function getSettingsFromDb(): Promise<PlatformSettings> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("platform_settings")
    .select(SELECT)
    .eq("id", true)
    .maybeSingle();

  if (error) {
    if (isMissingTable(error)) throw new SettingsNotMigratedError();
    // A configured-but-failing read shouldn't crash the app it configures.
    return DEFAULT_SETTINGS;
  }
  if (!data) return DEFAULT_SETTINGS;
  return mapSettings(data as SettingsRow);
}

export async function updateSettings(
  input: PlatformSettings
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("platform_settings")
    .update({
      delivery_fee: input.deliveryFee,
      tax_rate: input.taxRate,
      free_delivery_threshold: input.freeDeliveryThreshold,
      min_order: input.minOrder,
      business_name: input.businessName,
      support_phone: input.supportPhone,
      support_email: input.supportEmail,
      support_whatsapp: input.supportWhatsapp,
      business_address: input.businessAddress,
      accepting_orders: input.acceptingOrders,
      maintenance_message: input.maintenanceMessage,
      feature_grocery: input.featureGrocery,
      feature_pharmacy: input.featurePharmacy,
      feature_pick_drop: input.featurePickDrop,
      default_prep_minutes: input.defaultPrepMinutes,
      delivery_radius_km: input.deliveryRadiusKm,
      rider_commission: input.riderCommission,
      rider_min_payout: input.riderMinPayout,
      updated_at: new Date().toISOString(),
    })
    .eq("id", true);
  if (error) throw error;
}

/** Does the settings table exist yet? Drives the Admin "run migration" notice. */
export async function settingsTableExists(): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("platform_settings")
    .select("id", { head: true, count: "exact" })
    .limit(1);
  if (error) return !isMissingTable(error);
  return true;
}
