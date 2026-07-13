import "server-only";
import { createClient } from "@/lib/supabase/server";

/**
 * Favourite restaurants. RLS scopes every row to its owner, so none of these
 * queries need a `where user = me` — the session is the filter.
 *
 * Reads never throw: a missing favourites table (migration not run) or a signed
 * -out visitor simply means "not a favourite", and the restaurant page still
 * renders. Writes do throw, because a heart that silently fails is worse than
 * one that reports it.
 */

/** The restaurant the slug names, or null. Needed because the client speaks slugs. */
async function restaurantIdForSlug(slug: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("restaurants")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  return data?.id ?? null;
}

/** Has the signed-in user hearted this restaurant? False for guests. */
export async function isFavorite(slug: string): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const restaurantId = await restaurantIdForSlug(slug);
  if (!restaurantId) return false;

  const { data, error } = await supabase
    .from("favorites")
    .select("restaurant_id")
    .eq("restaurant_id", restaurantId)
    .maybeSingle();

  if (error) return false;
  return Boolean(data);
}

/** How many restaurants this user has saved — the Profile tab's count. */
export async function countFavorites(): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("favorites")
    .select("restaurant_id", { count: "exact", head: true });

  if (error) return 0;
  return count ?? 0;
}

export async function addFavorite(slug: string): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("unauthorized");

  const restaurantId = await restaurantIdForSlug(slug);
  if (!restaurantId) throw new Error("not_found");

  // upsert, not insert: hearting an already-hearted restaurant (a double tap, a
  // stale tab) is a no-op, not a duplicate-key error.
  const { error } = await supabase
    .from("favorites")
    .upsert(
      { user_id: user.id, restaurant_id: restaurantId },
      { onConflict: "user_id,restaurant_id" }
    );
  if (error) throw error;
  return true;
}

export async function removeFavorite(slug: string): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("unauthorized");

  const restaurantId = await restaurantIdForSlug(slug);
  if (!restaurantId) throw new Error("not_found");

  const { error } = await supabase
    .from("favorites")
    .delete()
    .eq("restaurant_id", restaurantId);
  if (error) throw error;
  return true;
}
