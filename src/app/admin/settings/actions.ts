"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { updateSettings } from "@/lib/data-access/settings";
import type { PlatformSettings } from "@/types";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

function num(raw: FormDataEntryValue | null, fallback: number): number {
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

function int(raw: FormDataEntryValue | null, fallback: number): number {
  return Math.max(0, Math.trunc(num(raw, fallback)));
}

function str(raw: FormDataEntryValue | null): string {
  return typeof raw === "string" ? raw.trim() : "";
}

/** A checkbox is present in the FormData only when checked. */
function bool(form: FormData, name: string): boolean {
  return form.get(name) === "on";
}

/** Read the settings form into the domain shape. Percentages → fractions. */
function parse(form: FormData): PlatformSettings {
  const taxPct = num(form.get("taxRatePct"), 5);
  const commissionPct = num(form.get("riderCommissionPct"), 8);
  return {
    deliveryFee: int(form.get("deliveryFee"), 29),
    // Stored as a fraction; the admin edits whole percent. Clamp 0–100%.
    taxRate: Math.min(1, Math.max(0, taxPct / 100)),
    freeDeliveryThreshold: int(form.get("freeDeliveryThreshold"), 0),
    minOrder: int(form.get("minOrder"), 0),

    businessName: str(form.get("businessName")) || "Deligro",
    supportPhone: str(form.get("supportPhone")),
    supportEmail: str(form.get("supportEmail")),
    supportWhatsapp: str(form.get("supportWhatsapp")),
    businessAddress: str(form.get("businessAddress")),

    acceptingOrders: bool(form, "acceptingOrders"),
    maintenanceMessage: str(form.get("maintenanceMessage")),
    featureGrocery: bool(form, "featureGrocery"),
    featurePharmacy: bool(form, "featurePharmacy"),
    featurePickDrop: bool(form, "featurePickDrop"),

    defaultPrepMinutes: int(form.get("defaultPrepMinutes"), 20),
    deliveryRadiusKm: Math.max(0, num(form.get("deliveryRadiusKm"), 8)),
    riderCommission: Math.min(1, Math.max(0, commissionPct / 100)),
    riderMinPayout: int(form.get("riderMinPayout"), 30),
  };
}

export async function saveSettingsAction(
  _prev: ActionResult,
  form: FormData
): Promise<ActionResult> {
  await requireRole("admin");
  if (!isSupabaseConfigured) {
    return {
      ok: false,
      error:
        "Demo mode: connect Supabase and apply migration 0015 to persist settings.",
    };
  }

  try {
    await updateSettings(parse(form));
  } catch {
    return { ok: false, error: "Couldn't save settings. Try again." };
  }

  // Fees, availability and support text are read across the app — rebuild it.
  revalidatePath("/", "layout");
  revalidatePath("/admin/settings");
  return { ok: true };
}
