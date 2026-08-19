import "server-only";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_SETTINGS } from "@/lib/settings-defaults";
import {
  columnKnownMissing,
  columnKnownPresent,
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

/**
 * The table is there and we still could not read it — an RLS or grant
 * regression, an unreachable database, a column the probes did not catch.
 *
 * Distinct from `SettingsNotMigratedError` because the two mean opposite
 * things. "Not migrated" is a known state with a known answer: nothing is
 * configured, so the defaults ARE the configuration. This one means we do not
 * know what the admin configured, and the caller must not pretend otherwise.
 */
export class SettingsUnavailableError extends Error {
  constructor(readonly cause?: unknown) {
    super("settings_unavailable");
    this.name = "SettingsUnavailableError";
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
  review_window_days?: number;
  review_edit_window_hours?: number;
}

/**
 * Columns that postdate `platform_settings` itself. Each group sits behind its
 * own probe key, so one un-applied migration costs that group and nothing else.
 *
 * Grouped rather than listed per-column because the columns in a group arrive in
 * the same migration — if one is there they all are, so one probe answers for
 * the set.
 */
const OPTIONAL_GROUPS = [
  {
    /** Migration 0025. */
    key: "platform_settings.feature_online_payment",
    select: "feature_online_payment",
    write: (input: PlatformSettings): Record<string, unknown> => ({
      feature_online_payment: input.featureOnlinePayment,
    }),
  },
  {
    /** Migration 0033. */
    key: "platform_settings.review_window_days",
    select: "review_window_days, review_edit_window_hours",
    write: (input: PlatformSettings): Record<string, unknown> => ({
      review_window_days: input.reviewWindowDays,
      review_edit_window_hours: input.reviewEditWindowHours,
    }),
  },
] as const;

type OptionalGroup = (typeof OPTIONAL_GROUPS)[number];

const BASE_SELECT = `
  delivery_fee, tax_rate, free_delivery_threshold, min_order,
  business_name, support_phone, support_email, support_whatsapp, business_address,
  accepting_orders, maintenance_message,
  feature_grocery, feature_pharmacy, feature_pick_drop,
  default_prep_minutes, delivery_radius_km, rider_commission, rider_min_payout
`;

/**
 * Which optional groups this database actually has.
 *
 * Probed one group at a time rather than inferred from a failed combined read.
 * A single 42703 says "some column in this list is missing" but not which, so
 * dropping a group on that signal is a guess — and guessing wrong marks a
 * present column absent, which silently substitutes a default for a value the
 * admin configured. That is the exact failure the online-payment comment below
 * was written about, so it is not repeated here.
 *
 * The probes latch in `schema-probe`, so this costs one HEAD request per group
 * once per process, and nothing thereafter. A transient failure does not latch.
 */
async function availableGroups(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<OptionalGroup[]> {
  const available: OptionalGroup[] = [];

  for (const group of OPTIONAL_GROUPS) {
    if (columnKnownMissing(group.key)) continue;
    if (columnKnownPresent(group.key)) {
      available.push(group);
      continue;
    }

    const { error } = await supabase
      .from("platform_settings")
      .select(group.select, { head: true, count: "exact" })
      .limit(1);

    if (!error) {
      rememberColumn(group.key, true);
      available.push(group);
    } else if (isMissingColumn(error)) {
      rememberColumn(group.key, false);
    }
    // Anything else is transient: skip the group for this read without
    // latching, so the next request probes again instead of writing it off.
  }

  return available;
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
    // Absent columns (pre-0033) fall back to the shared defaults, so the review
    // windows behave identically before the migration lands.
    reviewWindowDays: Number(
      row.review_window_days ?? DEFAULT_SETTINGS.reviewWindowDays
    ),
    reviewEditWindowHours: Number(
      row.review_edit_window_hours ?? DEFAULT_SETTINGS.reviewEditWindowHours
    ),
  };
}

export async function getSettingsFromDb(): Promise<PlatformSettings> {
  const supabase = await createClient();
  const groups = await availableGroups(supabase);

  const columns = [BASE_SELECT, ...groups.map((g) => g.select)].join(", ");
  const result = await supabase
    .from("platform_settings")
    .select(columns)
    .eq("id", true)
    .maybeSingle();

  if (result.error) {
    // Checked BEFORE isMissingTable: PostgREST's missing-column message also
    // contains "does not exist", so the table check would swallow it and report
    // the wrong one of the two conditions. With the groups probed up front a
    // missing column here should be unreachable, so it is a real fault.
    if (isMissingColumn(result.error)) {
      throw new SettingsUnavailableError(result.error);
    }
    if (isMissingTable(result.error)) throw new SettingsNotMigratedError();
    // Every other failure used to `return DEFAULT_SETTINGS`, which is not a
    // fallback — it is an assertion, and a false one: "the fee is ₹29, the tax
    // is 5%, there is no minimum, and the platform is open for business". On a
    // database whose admin had paused ordering, that assertion un-paused it.
    // Throw; `lib/settings.ts` decides how to fail, and it fails closed.
    throw new SettingsUnavailableError(result.error);
  }
  // Table present, no row: migration 0015 seeds one, so this is a database
  // nobody has configured rather than one we cannot read. The defaults ARE the
  // configuration in that state, which is why this is not a fault.
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

  // Same probe as the read: only write columns this database actually has, so a
  // pre-0025 or pre-0033 install saves everything else rather than failing the
  // whole form over a field whose only honest value there is the default.
  const groups = await availableGroups(supabase);
  const payload = groups.reduce<Record<string, unknown>>(
    (acc, group) => Object.assign(acc, group.write(input)),
    { ...base }
  );

  const { error } = await supabase
    .from("platform_settings")
    .update(payload)
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
