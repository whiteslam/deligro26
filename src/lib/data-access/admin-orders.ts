import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { shortOrderId } from "@/lib/utils/order-map";
import { formatDateTime } from "@/lib/utils/relative-time";
import type { AdminOrderRow } from "@/lib/roles-data";

/**
 * Admin all-orders feed. Admins may see every order (is_admin() in RLS); we use
 * the service-role client here so the customer/restaurant joins come back in one
 * query for the demo. The caller MUST already be role-gated to admin (the portal
 * layout's requireRole + the page's own check).
 */

interface Row {
  id: string;
  status: string;
  total: number;
  created_at: string;
  restaurants: { name: string } | { name: string }[] | null;
  profiles: { full_name: string | null } | { full_name: string | null }[] | null;
}

const STATUS_MAP: Record<string, AdminOrderRow["status"]> = {
  placed: "PLACED",
  kitchen: "KITCHEN",
  ready: "KITCHEN",
  on_the_way: "ON_THE_WAY",
  delivered: "DELIVERED",
  cancelled: "CANCELLED",
};

function one<T>(v: T | T[] | null): T | null {
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

export async function listAllOrders(limit = 50): Promise<AdminOrderRow[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("orders")
    .select("id, status, total, created_at, restaurants(name), profiles(full_name)")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;

  return (data as Row[]).map((r) => ({
    code: `#${shortOrderId(r.id)}`,
    customer: one(r.profiles)?.full_name?.trim() || "Customer",
    restaurant: one(r.restaurants)?.name ?? "—",
    status: STATUS_MAP[r.status] ?? "PLACED",
    total: r.total,
    placedAt: formatDateTime(r.created_at),
  }));
}
