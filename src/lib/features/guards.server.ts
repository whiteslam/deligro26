import "server-only";
import { NextResponse } from "next/server";
import { getProfile } from "@/lib/auth";
import { resolveVendorRestaurant } from "@/lib/data-access/vendor-restaurant";
import { FEATURE_OFF_MESSAGE, type FeatureKey } from "@/lib/features/catalog";
import { FeatureDisabledError, isFeatureOn } from "@/lib/features/flags.server";

/**
 * The server half of every feature switch — call AFTER the role check.
 *
 * An admin is never switched off: the switches restrict what a vendor,
 * manager or rider may do, and an admin acting through those portals is
 * support, not the subject of the restriction.
 */

/** Vendor features are set per shop: the shop this vendor is working in. */
export async function vendorFeatureOn(key: FeatureKey): Promise<boolean> {
  const profile = await getProfile();
  if (profile?.role === "admin") return true;
  const shop = await resolveVendorRestaurant().catch(() => null);
  return isFeatureOn(key, shop?.id ?? null);
}

/** Manager and rider features are set per person. */
export async function staffFeatureOn(key: FeatureKey): Promise<boolean> {
  const profile = await getProfile();
  if (!profile || profile.role === "admin") return true;
  return isFeatureOn(key, profile.id);
}

export async function assertVendorFeature(key: FeatureKey): Promise<void> {
  if (!(await vendorFeatureOn(key))) throw new FeatureDisabledError(key);
}

/**
 * Profile edits go through routes every signed-in user shares (/api/profile,
 * /api/profile/avatar). Only a RIDER with "Edit profile" switched off is
 * refused; customers, vendors and managers are never affected.
 */
export async function riderProfileEditBlocked(): Promise<boolean> {
  const profile = await getProfile();
  if (profile?.role !== "driver") return false;
  return !(await isFeatureOn("driver.profile_edit", profile.id));
}

/** For route handlers: the 403 a switched-off feature answers with. */
export function featureOffResponse(key: FeatureKey) {
  return NextResponse.json(
    { ok: false, error: "feature_disabled", feature: key, message: FEATURE_OFF_MESSAGE },
    { status: 403 }
  );
}
