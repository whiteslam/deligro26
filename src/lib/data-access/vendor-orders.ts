import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { KitchenOrder } from "@/lib/roles-data";
import type {
  VendorHistoryQuery,
} from "@/types/vendor-orders";
import { shortOrderId } from "@/lib/utils/order-map";
import { formatRelativeTime } from "@/lib/utils/relative-time";
import { addIstDays, startOfIstMonth } from "@/lib/utils/ist-time";

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
  ready: KitchenOrder[];
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
    .filter((r) => r.status === "kitchen")
    .map(mapKitchenOrder);
  const ready = rows
    .filter((r) => r.status === "ready")
    .map(mapKitchenOrder);

  return { incoming, preparing, ready };
}

/** Completed + cancelled order history for the selected restaurant. */
export async function listVendorOrderHistory(
  restaurantId: string,
  limit = 6
): Promise<{ completed: KitchenOrder[]; cancelled: KitchenOrder[] }> {
  const supabase = await createClient();
  const [completedRes, cancelledRes] = await Promise.all([
    supabase
      .from("orders")
      .select(SELECT)
      .eq("restaurant_id", restaurantId)
      .eq("status", "delivered")
      .order("created_at", { ascending: false })
      .limit(limit),
    supabase
      .from("orders")
      .select(SELECT)
      .eq("restaurant_id", restaurantId)
      .eq("status", "cancelled")
      .order("created_at", { ascending: false })
      .limit(limit),
  ]);

  if (completedRes.error) throw completedRes.error;
  if (cancelledRes.error) throw cancelledRes.error;

  return {
    completed: ((completedRes.data ?? []) as VendorOrderRow[]).map(
      mapKitchenOrder
    ),
    cancelled: ((cancelledRes.data ?? []) as VendorOrderRow[]).map(
      mapKitchenOrder
    ),
  };
}

function monthBounds(offsetMonths: number): { start: Date; end: Date } {
  const now = new Date();
  let cursor = startOfIstMonth(now);
  if (offsetMonths < 0) {
    for (let i = 0; i < -offsetMonths; i += 1) {
      cursor = startOfIstMonth(addIstDays(cursor, -1));
    }
  } else if (offsetMonths > 0) {
    for (let i = 0; i < offsetMonths; i += 1) {
      cursor = startOfIstMonth(addIstDays(cursor, 32));
    }
  }
  const start = cursor;
  const end = startOfIstMonth(addIstDays(start, 32));
  return { start, end };
}

function dayBounds(isoDate: string): { start: Date; end: Date } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate.trim());
  if (!match) return null;
  const start = new Date(`${match[1]}-${match[2]}-${match[3]}T00:00:00+05:30`);
  if (Number.isNaN(start.getTime())) return null;
  const end = addIstDays(start, 1);
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
      : (["delivered"] as const);

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

const KITCHEN_TRANSITIONS: Record<
  string,
  ReadonlyArray<"kitchen" | "ready" | "cancelled">
> = {
  placed: ["kitchen", "cancelled"],
  kitchen: ["ready", "cancelled"],
  ready: ["cancelled"],
};

/**
 * Vendor kitchen status update — requires restaurant ownership and a valid
 * transition from the order's current status.
 */
export async function updateKitchenOrderStatus(
  orderId: string,
  status: "kitchen" | "ready" | "cancelled"
): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data: order, error: loadError } = await supabase
    .from("orders")
    .select("id, status, restaurant_id, restaurants!inner(owner_id)")
    .eq("id", orderId)
    .maybeSingle();

  if (loadError) throw loadError;
  if (!order) return false;

  const restaurant = Array.isArray(order.restaurants)
    ? order.restaurants[0]
    : order.restaurants;
  if (!restaurant || restaurant.owner_id !== user.id) {
    throw new Error("forbidden");
  }

  const allowed = KITCHEN_TRANSITIONS[order.status] ?? [];
  if (!allowed.includes(status)) {
    throw new Error("invalid_transition");
  }

  const { data, error } = await supabase
    .from("orders")
    .update({ status })
    .eq("id", orderId)
    .eq("status", order.status)
    .select("id")
    .maybeSingle();

  if (error) throw error;
  return Boolean(data?.id);
}
