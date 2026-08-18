import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { requireRole, requireUser, type Profile } from "@/lib/auth";
import { PORTALS } from "@/lib/auth/portals";

/**
 * Vendor access is ownership-based, not role-based. A person can be a customer
 * AND run a shop ("stay both"): their profile stays `customer` (so order-insert
 * RLS still lets them shop), and they reach the vendor portal because they own a
 * restaurant. The vendor-data RLS already keys on `owner_id`, so this only
 * governs the app-level portal gate.
 */

/** True when the user owns at least one restaurant. */
export async function ownsAnyRestaurant(userId: string): Promise<boolean> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("restaurants")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", userId);
  return (count ?? 0) > 0;
}

/** Vendor-portal access = a real restaurant role, an admin, OR any shop owner. */
export async function hasVendorAccess(
  profile: Profile | null
): Promise<boolean> {
  if (!profile) return false;
  if (profile.role === "restaurant" || profile.role === "admin") return true;
  return ownsAnyRestaurant(profile.id);
}

/** Redirecting guard for vendor layouts/pages/actions (mirrors requireRole). */
export async function requireVendorAccess(): Promise<Profile> {
  // Demo mode (no Supabase keys): mirror requireRole's passthrough so the static
  // vendor UI still renders.
  if (!isSupabaseConfigured) return requireRole("restaurant");

  const profile = await requireUser();
  if (await hasVendorAccess(profile)) return profile;
  redirect(`${PORTALS.vendor.login}?denied=1`);
}
