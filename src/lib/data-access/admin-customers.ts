import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatDateTime } from "@/lib/utils/relative-time";

/**
 * Admin customers directory. Every signup lands in `public.profiles` (the
 * handle_new_user trigger on auth.users, see 0001_init), so this IS the live
 * list of people who have joined — ordered newest first, so a fresh
 * registration surfaces at the top with a "New" tag.
 *
 * Service-role client: an admin may read every profile (is_admin() in the RLS
 * policies), and we fold the per-customer order count into the same query. The
 * caller MUST already be admin-gated — the /admin layout's requireRole runs
 * before this does.
 */

const NEW_WINDOW_DAYS = 7;

export interface AdminCustomerRow {
  id: string;
  name: string;
  phone: string | null;
  orders: number;
  joinedAt: string; // human, e.g. "28 Jul, 2:14 PM"
  joinedAtIso: string; // raw timestamp, for any client-side formatting
  isNew: boolean; // joined within the last NEW_WINDOW_DAYS
}

interface Row {
  id: string;
  full_name: string | null;
  phone: string | null;
  created_at: string;
  // PostgREST returns the aggregate embed as `[{ count }]`; tolerate both shapes.
  orders: { count: number }[] | { count: number } | null;
}

function orderCount(v: Row["orders"]): number {
  if (!v) return 0;
  return Array.isArray(v) ? (v[0]?.count ?? 0) : (v.count ?? 0);
}

export async function listCustomers(limit = 100): Promise<AdminCustomerRow[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, phone, created_at, orders(count)")
    .eq("role", "customer")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;

  const cutoff = Date.now() - NEW_WINDOW_DAYS * 24 * 60 * 60 * 1000;

  return (data as Row[]).map((r) => ({
    id: r.id,
    name: r.full_name?.trim() || "Customer",
    phone: r.phone,
    orders: orderCount(r.orders),
    joinedAt: formatDateTime(r.created_at),
    joinedAtIso: r.created_at,
    isNew: new Date(r.created_at).getTime() >= cutoff,
  }));
}
