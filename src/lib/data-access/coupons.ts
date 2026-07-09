import "server-only";
import { createClient } from "@/lib/supabase/server";

/**
 * Coupon validation. Read-only here: given a code + cart subtotal, return the
 * discount. Actually *applying* it to an order total is done server-side at
 * order creation (pairs with the payments branch) so the client can never set
 * its own discount.
 */

export interface CouponResult {
  ok: boolean;
  error?: string;
  code?: string;
  discount?: number; // rupees off, already capped
}

export async function evaluateCoupon(code: string, subtotal: number): Promise<CouponResult> {
  const normalized = code.trim().toUpperCase();
  if (!normalized) return { ok: false, error: "empty" };

  const supabase = await createClient();
  const { data: coupon } = await supabase
    .from("coupons")
    .select("code, kind, value, min_order, max_discount, active, expires_at")
    .eq("code", normalized)
    .maybeSingle();

  if (!coupon || !coupon.active) return { ok: false, error: "invalid" };
  if (coupon.expires_at && new Date(coupon.expires_at).getTime() < Date.now()) {
    return { ok: false, error: "expired" };
  }
  if (subtotal < Number(coupon.min_order)) {
    return { ok: false, error: "min_order", discount: Number(coupon.min_order) };
  }

  let discount =
    coupon.kind === "percent" ? (subtotal * Number(coupon.value)) / 100 : Number(coupon.value);
  if (coupon.max_discount != null) discount = Math.min(discount, Number(coupon.max_discount));
  discount = Math.min(Math.round(discount), subtotal);

  return { ok: true, code: normalized, discount };
}
