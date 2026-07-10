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
  customer?:
    | { full_name: string | null; phone: string | null }
    | { full_name: string | null; phone: string | null }[]
    | null;
}

const SELECT =
  "id, status, total, created_at, address, order_items(name, qty, price), customer:profiles!orders_customer_id_fkey(full_name, phone)";

function customerInitials(name: string, phone: string | null): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  const digits = (phone ?? "").replace(/\D/g, "");
  return digits.slice(-2) || "CU";
}

function mapKitchenOrder(row: VendorOrderRow): KitchenOrder {
  const profile = row.customer;
  const customer = Array.isArray(profile) ? profile[0] : profile;
  const customerName = customer?.full_name?.trim() || "Customer";
  const customerPhone = customer?.phone?.trim() || null;
  const deliveryLabel = row.address?.label?.trim();
  const deliveryLine = row.address?.line?.trim();

  return {
    id: row.id,
    code: `#${shortOrderId(row.id)}`,
    customer: customerName,
    customerProfile: {
      name: customerName,
      phone: customerPhone,
      initials: customerInitials(customerName, customerPhone),
    },
    area: deliveryLabel ?? deliveryLine ?? "Delivery",
    deliveryLine:
      deliveryLabel && deliveryLine && deliveryLabel !== deliveryLine
        ? deliveryLine
        : undefined,
    placedAgo: formatRelativeTime(row.created_at),
    lines: row.order_items.map((item) => ({
      name: item.name,
      qty: item.qty,
      price: item.price,
    })),
    total: row.total,
    status: row.status,
  };
}

/** Kitchen board for one restaurant — scoped by restaurant_id + RLS. */
export async function listKitchenOrders(restaurantId: string): Promise<{
  incoming: KitchenOrder[];
  preparing: KitchenOrder[];
}> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("orders")
    .select(SELECT)
    .eq("restaurant_id", restaurantId)
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

/** Completed + cancelled order history for the selected restaurant. */
export async function listVendorOrderHistory(
  restaurantId: string,
  limit = 15
): Promise<{ completed: KitchenOrder[]; cancelled: KitchenOrder[] }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("orders")
    .select(SELECT)
    .eq("restaurant_id", restaurantId)
    .in("status", ["delivered", "cancelled", "on_the_way"])
    .order("created_at", { ascending: false })
    .limit(limit * 2);

  if (error) throw error;

  const rows = ((data ?? []) as VendorOrderRow[]).map(mapKitchenOrder);
  const cancelled = rows.filter((r) => r.status === "cancelled").slice(0, limit);
  const completed = rows
    .filter((r) => r.status !== "cancelled")
    .slice(0, limit);

  return { completed, cancelled };
}

/** @deprecated Use listVendorOrderHistory */
export async function listRecentVendorOrders(
  restaurantId: string,
  limit = 10
): Promise<KitchenOrder[]> {
  const { completed, cancelled } = await listVendorOrderHistory(
    restaurantId,
    limit
  );
  return [...completed, ...cancelled].slice(0, limit);
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
