import "server-only";
import { createClient } from "@/lib/supabase/server";

/**
 * The two handover codes, generated per order by column default in migration
 * 0006 and read here through RLS — so who may see which is decided by the
 * database, not by remembering to filter.
 *
 * They are read with separate one-column queries on purpose. A single helper
 * returning both would hand the caller a code its role has no business
 * showing, and the only thing stopping it reaching a screen would be everyone
 * downstream remembering not to render it.
 */

/** The customer's delivery handover code (RLS: only the order owner can read). */
export async function getDeliveryOtp(orderId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("orders")
    .select("delivery_otp")
    .eq("id", orderId)
    .maybeSingle();
  return (data?.delivery_otp as string | undefined) ?? null;
}

/**
 * The rider's pickup code, read to the restaurant at handover — the symmetric
 * half of the delivery code, and the one that has had no UI since 0006 added
 * the column.
 *
 * RLS scopes this to the order's own actively-assigned driver (and the
 * customer and the owning restaurant, who are the other parties to the same
 * handover). A rider not on this delivery sees no row at all, and gets null —
 * indistinguishable from an order that does not exist.
 */
export async function getPickupOtp(orderId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("orders")
    .select("pickup_otp")
    .eq("id", orderId)
    .maybeSingle();
  return (data?.pickup_otp as string | undefined) ?? null;
}
