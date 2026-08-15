import "server-only";
import { createClient } from "@/lib/supabase/server";

/**
 * Coupon *pricing* — the preview half of the feature.
 *
 * This says what a code would be worth. It does not apply anything, and
 * nothing it returns is billed. The authority is `apply_coupon_to_order()`
 * (migration 0031), which re-derives the amount from the order's own
 * `order_items` inside one transaction that also records the redemption.
 *
 * The split is the same one `computeChargesWith` already makes for fees: the
 * client is shown a number so the checkout is honest about what it is about to
 * do, and the server independently decides what is actually charged. A preview
 * that disagrees with the bill is a bug in this file; a preview that the client
 * could *substitute* for the bill would be a hole, and there isn't one — the
 * discount column cannot be written from a client at insert or update.
 *
 * Two callers, deliberately:
 *   * `/api/coupons/validate` — the checkout's "apply code" button.
 *   * `createOrder()` — a last check before anything is written, because an
 *     order cannot be rolled back once it exists.
 */

export interface CouponResult {
  ok: boolean;
  error?: string;
  code?: string;
  /** Rupees off. On a `min_order` failure this carries the minimum instead. */
  discount?: number;
}

export async function evaluateCoupon(
  code: string,
  subtotal: number
): Promise<CouponResult> {
  const normalized = code.trim().toUpperCase();
  if (!normalized) return { ok: false, error: "empty" };

  const supabase = await createClient();
  const { data: coupon } = await supabase
    .from("coupons")
    .select(
      "code, kind, value, min_order, max_discount, active, expires_at, max_per_customer"
    )
    .eq("code", normalized)
    .maybeSingle();

  if (!coupon || !coupon.active) return { ok: false, error: "invalid" };
  if (coupon.expires_at && new Date(coupon.expires_at).getTime() < Date.now()) {
    return { ok: false, error: "expired" };
  }
  if (subtotal < Number(coupon.min_order)) {
    return { ok: false, error: "min_order", discount: Number(coupon.min_order) };
  }

  // Per-customer limit (0031). Worth checking here even though the RPC checks
  // it again: "you have already used this code" is the single most likely
  // refusal, and finding out at the preview costs the customer nothing while
  // finding out at submit costs them the discount they were expecting.
  //
  // RLS scopes `coupon_redemptions` to the caller's own rows, so this counts
  // *their* uses without being able to see anyone else's. The campaign-wide
  // cap is deliberately not checked here — it is not visible to a customer,
  // and the RPC holds it.
  //
  // `head: true` with an exact count: we want the number, never the rows.
  if (coupon.max_per_customer != null) {
    const { count, error } = await supabase
      .from("coupon_redemptions")
      .select("*", { count: "exact", head: true })
      .eq("code", normalized);

    // A database still on 0030 has no such table. That is not a reason to
    // refuse a coupon — it is a reason to let the RPC be the only judge.
    if (!error && (count ?? 0) >= Number(coupon.max_per_customer)) {
      return { ok: false, error: "already_used" };
    }
  }

  let discount =
    coupon.kind === "percent"
      ? (subtotal * Number(coupon.value)) / 100
      : Number(coupon.value);
  if (coupon.max_discount != null) discount = Math.min(discount, Number(coupon.max_discount));
  discount = Math.min(Math.round(discount), subtotal);

  return { ok: true, code: normalized, discount };
}
