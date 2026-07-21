import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { KitchenOrder } from "@/lib/roles-data";
import type {
  VendorHistoryQuery,
} from "@/types/vendor-orders";
import { shortOrderId } from "@/lib/utils/order-map";
import { formatRelativeTime } from "@/lib/utils/relative-time";

export type {
  VendorHistoryKind,
  VendorHistoryQuery,
  VendorHistoryRange,
} from "@/types/vendor-orders";

interface VendorOrderItemRow {
  name: string;
  qty: number;
  price: number;
  menu_items?:
    | { description: string | null; image_url: string | null }
    | { description: string | null; image_url: string | null }[]
    | null;
}

interface VendorOrderRow {
  id: string;
  status: string;
  total: number;
  created_at: string;
  address: { label?: string; line?: string } | null;
  order_items: VendorOrderItemRow[];
  customer?:
    | { full_name: string | null; phone: string | null }
    | { full_name: string | null; phone: string | null }[]
    | null;
}

const SELECT =
  "id, status, total, created_at, address, order_items(name, qty, price, menu_items(description, image_url)), customer:profiles!orders_customer_id_fkey(full_name, phone)";

function customerInitials(name: string, phone: string | null): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  const digits = (phone ?? "").replace(/\D/g, "");
  return digits.slice(-2) || "CU";
}

function formatPlacedAt(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

function mapOrderItem(item: VendorOrderItemRow) {
  const menu = Array.isArray(item.menu_items)
    ? item.menu_items[0]
    : item.menu_items;
  return {
    name: item.name,
    qty: item.qty,
    price: item.price,
    description: menu?.description?.trim() || null,
    imageUrl: menu?.image_url?.trim() || null,
  };
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
    placedAt: formatPlacedAt(row.created_at),
    lines: (row.order_items ?? []).map(mapOrderItem),
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
  limit = 6
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

function monthBounds(offsetMonths: number): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() + offsetMonths, 1);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth() + offsetMonths + 1, 1);
  end.setHours(0, 0, 0, 0);
  return { start, end };
}

function dayBounds(isoDate: string): { start: Date; end: Date } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate.trim());
  if (!match) return null;
  const y = Number(match[1]);
  const m = Number(match[2]) - 1;
  const d = Number(match[3]);
  const start = new Date(y, m, d);
  if (Number.isNaN(start.getTime())) return null;
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

/** Full history for cancelled or completed, with optional date + search filters. */
export async function listVendorOrderArchive(
  query: VendorHistoryQuery
): Promise<{ orders: KitchenOrder[]; total: number }> {
  const supabase = await createClient();
  const statuses =
    query.kind === "cancelled"
      ? (["cancelled"] as const)
      : (["delivered", "on_the_way"] as const);

  let q = supabase
    .from("orders")
    .select(SELECT, { count: "exact" })
    .eq("restaurant_id", query.restaurantId)
    .in("status", [...statuses])
    .order("created_at", { ascending: false });

  const range = query.range ?? "all";
  if (range === "this_month") {
    const { start, end } = monthBounds(0);
    q = q.gte("created_at", start.toISOString()).lt("created_at", end.toISOString());
  } else if (range === "previous_month") {
    const { start, end } = monthBounds(-1);
    q = q.gte("created_at", start.toISOString()).lt("created_at", end.toISOString());
  } else if (range === "date" && query.date) {
    const bounds = dayBounds(query.date);
    if (bounds) {
      q = q
        .gte("created_at", bounds.start.toISOString())
        .lt("created_at", bounds.end.toISOString());
    }
  }

  const limit = Math.min(Math.max(query.limit ?? 100, 1), 200);
  q = q.limit(limit);

  const { data, error, count } = await q;
  if (error) throw error;

  let orders = ((data ?? []) as VendorOrderRow[]).map(mapKitchenOrder);

  const search = query.search?.trim().toLowerCase();
  if (search) {
    orders = orders.filter((o) => {
      const hay = [
        o.code,
        o.customer,
        o.area,
        o.deliveryLine,
        ...o.lines.map((l) => l.name),
        ...o.lines.map((l) => l.description ?? ""),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(search);
    });
  }

  return { orders, total: count ?? orders.length };
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
