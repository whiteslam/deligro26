import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { KitchenOrder } from "@/lib/roles-data";
import { shortOrderId } from "@/lib/utils/order-map";
import { formatRelativeTime } from "@/lib/utils/relative-time";

interface VendorOrderRow {
  id: string;
  status: string;
  total: number;
  created_at: string;
  address: { label?: string; line?: string } | null;
  order_items: { name: string; qty: number; price: number }[];
  profiles?: { full_name: string | null } | { full_name: string | null }[] | null;
}

const SELECT =
  "id, status, total, created_at, address, order_items(name, qty, price), profiles(full_name)";

function mapKitchenOrder(row: VendorOrderRow): KitchenOrder {
  const profile = row.profiles;
  const customer = Array.isArray(profile) ? profile[0] : profile;

  const customerName = customer?.full_name?.trim() || "Customer";

  return {
    id: row.id,
    code: `#${shortOrderId(row.id)}`,
    customer: customerName,
    area: row.address?.label ?? row.address?.line ?? "Delivery",
    placedAgo: formatRelativeTime(row.created_at),
    lines: row.order_items.map((item) => ({
      name: item.name,
      qty: item.qty,
      price: item.price,
    })),
    total: row.total,
  };
}

/** Kitchen board — scoped by RLS to the signed-in vendor's restaurant. */
export async function listKitchenOrders(): Promise<{
  incoming: KitchenOrder[];
  preparing: KitchenOrder[];
}> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("orders")
    .select(SELECT)
    .in("status", ["placed", "kitchen", "ready"])
    .order("created_at", { ascending: false });

  if (error) throw error;

  const rows = (data ?? []) as VendorOrderRow[];
  const incoming = rows
    .filter((r) => r.status === "placed")
    .map(mapKitchenOrder);
  const preparing = rows
    .filter((r) => r.status === "kitchen" || r.status === "ready")
    .map(mapKitchenOrder);

  return { incoming, preparing };
}

export async function updateKitchenOrderStatus(
  orderId: string,
  status: "kitchen" | "ready" | "cancelled"
): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("orders")
    .update({ status })
    .eq("id", orderId)
    .select("id")
    .maybeSingle();

  if (error) throw error;
  return Boolean(data?.id);
}
