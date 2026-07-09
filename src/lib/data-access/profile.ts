import "server-only";
import { createClient } from "@/lib/supabase/server";

/**
 * Summary shown on the customer Profile tab. Everything here is the signed-in
 * user's own data — RLS scopes the order/address counts to them, so no explicit
 * `where user = me` is needed. Returns null when signed out.
 */
export interface ProfileSummary {
  name: string;
  phone: string | null;
  initials: string;
  memberSince: string; // year, e.g. "2024"
  orders: number;
  addresses: number;
}

function initialsFrom(name: string, phone: string | null): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  if (words.length === 1 && /[a-z]/i.test(words[0])) return words[0].slice(0, 2).toUpperCase();
  // Name is empty or numeric — fall back to the last two phone digits.
  const digits = (phone ?? "").replace(/\D/g, "");
  return digits.slice(-2) || "🙂";
}

export async function getProfileSummary(): Promise<ProfileSummary | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, phone, created_at")
    .eq("id", user.id)
    .maybeSingle();

  // Cheap head counts — no rows fetched, just the totals.
  const [{ count: orderCount }, { count: addressCount }] = await Promise.all([
    supabase.from("orders").select("id", { count: "exact", head: true }),
    supabase.from("addresses").select("id", { count: "exact", head: true }),
  ]);

  const name = profile?.full_name?.trim() || "Deligro Customer";
  const phone = profile?.phone ?? user.phone ?? null;
  const memberSince = profile?.created_at
    ? new Date(profile.created_at as string).getFullYear().toString()
    : new Date(user.created_at).getFullYear().toString();

  return {
    name,
    phone,
    initials: initialsFrom(name, phone),
    memberSince,
    orders: orderCount ?? 0,
    addresses: addressCount ?? 0,
  };
}
