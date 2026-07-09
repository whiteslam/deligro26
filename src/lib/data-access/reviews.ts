import "server-only";
import { createClient } from "@/lib/supabase/server";

/** Ratings & reviews. Insert is RLS-gated to the customer's own delivered order. */

export async function submitReview(
  orderId: string,
  rating: number,
  comment?: string
): Promise<{ ok: boolean; error?: string }> {
  if (rating < 1 || rating > 5) return { ok: false, error: "invalid_rating" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "unauthorized" };

  // Resolve the restaurant for this order (RLS lets the owner read their order).
  const { data: order } = await supabase
    .from("orders")
    .select("restaurant_id, status, customer_id")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) return { ok: false, error: "not_found" };

  const { error } = await supabase.from("reviews").insert({
    order_id: orderId,
    user_id: user.id,
    restaurant_id: order.restaurant_id,
    rating,
    comment: comment?.slice(0, 500) || null,
  });
  if (error) {
    // Unique(order_id) → already reviewed.
    if (error.code === "23505") return { ok: false, error: "already_reviewed" };
    return { ok: false, error: "server_error" };
  }
  return { ok: true };
}

export async function getRestaurantRating(
  restaurantId: string
): Promise<{ average: number; count: number }> {
  const supabase = await createClient();
  const { data } = await supabase.from("reviews").select("rating").eq("restaurant_id", restaurantId);
  const rows = (data ?? []) as { rating: number }[];
  if (!rows.length) return { average: 0, count: 0 };
  const sum = rows.reduce((s, r) => s + r.rating, 0);
  return { average: Math.round((sum / rows.length) * 10) / 10, count: rows.length };
}
