import "server-only";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_SETTINGS } from "@/lib/settings-defaults";
import {
  columnKnownMissing,
  isMissingColumn,
  rememberColumn,
} from "@/lib/data-access/schema-probe";
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
  feature_online_payment?: boolean;
}

/** `feature_online_payment` only exists once migration 0025 has been applied. */
const ONLINE_PAYMENT_COLUMN = "platform_settings.feature_online_payment";

function select(withOnlinePayment: boolean): string {
  return `
  delivery_fee, tax_rate, free_delivery_threshold, min_order,
  business_name, support_phone, support_email, support_whatsapp, business_address,
  accepting_orders, maintenance_message,
  feature_grocery, feature_pharmacy, feature_pick_drop,
  default_prep_minutes, delivery_radius_km, rider_commission, rider_min_payout
  ${withOnlinePayment ? ", feature_online_payment" : ""}
`;
}

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
    // Absent column (pre-0025) reads as off, which is the safe direction.
    featureOnlinePayment: row.feature_online_payment ?? false,
  };
}

export async function getSettingsFromDb(): Promise<PlatformSettings> {
  const supabase = await createClient();

  const read = (withOnlinePayment: boolean) =>
    supabase
      .from("platform_settings")
      .select(select(withOnlinePayment))
      .eq("id", true)
      .maybeSingle();

  const asked = !columnKnownMissing(ONLINE_PAYMENT_COLUMN);
  let result = await read(asked);

  // Checked BEFORE isMissingTable: PostgREST's missing-column message also
  // contains "does not exist", so the table check would swallow it and hand
  // back DEFAULT_SETTINGS — quietly billing default fees on a database whose
  // admin had configured real ones. A missing column costs the one column.
  if (asked && result.error && isMissingColumn(result.error)) {
    rememberColumn(ONLINE_PAYMENT_COLUMN, false);
    result = await read(false);
  } else if (asked && !result.error) {
    rememberColumn(ONLINE_PAYMENT_COLUMN, true);
  }

  if (result.error) {
    if (isMissingTable(result.error)) throw new SettingsNotMigratedError();
    // A configured-but-failing read shouldn't crash the app it configures.
    return DEFAULT_SETTINGS;
  }
  if (!result.data) return DEFAULT_SETTINGS;
  return mapSettings(result.data as unknown as SettingsRow);
}

export async function updateSettings(
  input: PlatformSettings
): Promise<void> {
  const supabase = await createClient();
  const base: Record<string, unknown> = {
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
  };

  const write = (withOnlinePayment: boolean) =>
    supabase
      .from("platform_settings")
      .update(
        withOnlinePayment
          ? { ...base, feature_online_payment: input.featureOnlinePayment }
          : base
      )
      .eq("id", true);

  const asked = !columnKnownMissing(ONLINE_PAYMENT_COLUMN);
  const { error } = await write(asked);

  if (asked && error && isMissingColumn(error)) {
    // Pre-0025. Save everything else rather than failing the whole form over a
    // toggle whose only honest value on this database is "off" anyway.
    rememberColumn(ONLINE_PAYMENT_COLUMN, false);
    const { error: retry } = await write(false);
    if (retry) throw retry;
    return;
  }

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
