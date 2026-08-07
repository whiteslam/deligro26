import { createClient } from "@/lib/supabase/server";
import { adminOrderStatus } from "@/lib/data-access/admin-orders";
import type { AdminOrderRow } from "@/lib/roles-data";
import { shortOrderId } from "@/lib/utils/order-map";
import { formatDateTime } from "@/lib/utils/relative-time";
import type { PaymentMethod, PaymentStatus } from "@/types";
import { columnKnownMissing, isMissingColumn, rememberColumn } from "./schema-probe";

/**
 * The manager's operational view of the order pipeline.
 *
 * Every read and write in this file goes through the RLS client — the manager's
 * own JWT — not `createAdminClient()`. Migration 0023 grants a manager exactly
 * what they need here (read all orders, update orders, read profiles and
 * order_items, full management of `deliveries`) and deliberately withholds the
 * rest. Routing these queries through the service role would work, and would
 * quietly convert every limit 0023 imposes on purpose into no limit at all.
 */

/** The stages a manager works: everything still in flight. */
const ACTIVE = ["placed", "kitchen", "ready", "on_the_way"] as const;

const PAYMENT_COLUMNS = "orders.payment_method";

export interface ManagerOrderRow {
  id: string;
  code: string;
  customer: string;
  customerPhone: string | null;
  restaurant: string;
  status: AdminOrderRow["status"];
  dbStatus: string;
  total: number;
  placedAt: string;
  createdAtIso: string;
  itemCount: number;
  /** Undefined when the column is absent — not "cash". See slice A/D. */
  paymentMethod?: PaymentMethod;
  paymentStatus?: PaymentStatus;
  /** The rider carrying it, when one has been assigned. */
  rider: { id: string; name: string; phone: string | null } | null;
  deliveryStatus: string | null;
}

interface OrderRow {
  id: string;
  status: string;
  total: number | null;
  created_at: string;
  payment_method?: PaymentMethod | null;
  payment_status?: PaymentStatus | null;
  order_items: { id: string }[] | null;
  restaurants: { name: string | null } | { name: string | null }[] | null;
  customer:
    | { full_name: string | null; phone: string | null }
    | { full_name: string | null; phone: string | null }[]
    | null;
}

interface DeliveryJoin {
  order_id: string;
  status: string | null;
  driver_id: string | null;
}

function one<T>(v: T | T[] | null | undefined): T | null {
  return Array.isArray(v) ? (v[0] ?? null) : (v ?? null);
}

function columns(withPayment: boolean): string {
  return [
    "id, status, total, created_at",
    withPayment ? ", payment_method, payment_status" : "",
    ", order_items(id)",
    ", restaurants(name)",
    ", customer:profiles!orders_customer_id_fkey(full_name, phone)",
  ].join("");
}

/**
 * Every order still in flight, across every restaurant, oldest first.
 *
 * Oldest-first is the opposite of the admin feed and is deliberate: this is a
 * work queue, not a news feed. The order that has been waiting longest is the
 * one that needs a decision, and on a phone screen it has to be the one in
 * reach rather than the one pushed off the bottom.
 */
export async function listActiveOrders(): Promise<ManagerOrderRow[]> {
  const supabase = await createClient();

  const run = async (withPayment: boolean) =>
    supabase
      .from("orders")
      .select(columns(withPayment))
      .in("status", ACTIVE)
      .order("created_at", { ascending: true })
      .overrideTypes<Record<string, unknown>[]>();

  let withPayment = !columnKnownMissing(PAYMENT_COLUMNS);
  let { data, error } = await run(withPayment);

  if (error && withPayment && isMissingColumn(error)) {
    // 0025 not applied here. The board still works; it just cannot say how
    // anything was paid, and says nothing rather than guessing "cash".
    rememberColumn(PAYMENT_COLUMNS, false);
    withPayment = false;
    ({ data, error } = await run(false));
  } else if (!error && withPayment) {
    rememberColumn(PAYMENT_COLUMNS, true);
  }

  if (error) throw error;

  const rows = (data ?? []) as unknown as OrderRow[];
  if (rows.length === 0) return [];

  // One query for the delivery legs rather than one per order.
  const { data: legs } = await supabase
    .from("deliveries")
    .select("order_id, status, driver_id")
    .in(
      "order_id",
      rows.map((r) => r.id)
    );

  const deliveries = new Map<string, DeliveryJoin>();
  for (const d of (legs ?? []) as DeliveryJoin[]) deliveries.set(d.order_id, d);

  // And one for the riders named by those legs.
  const driverIds = [
    ...new Set(
      [...deliveries.values()].map((d) => d.driver_id).filter((v): v is string => Boolean(v))
    ),
  ];
  const riders = new Map<string, { full_name: string | null; phone: string | null }>();
  if (driverIds.length > 0) {
    const { data: people } = await supabase
      .from("profiles")
      .select("id, full_name, phone")
      .in("id", driverIds);
    for (const p of (people ?? []) as {
      id: string;
      full_name: string | null;
      phone: string | null;
    }[]) {
      riders.set(p.id, p);
    }
  }

  return rows.map((r) => {
    const leg = deliveries.get(r.id) ?? null;
    const rider = leg?.driver_id ? riders.get(leg.driver_id) : null;
    const customer = one(r.customer);

    return {
      id: r.id,
      code: `#${shortOrderId(r.id)}`,
      customer: customer?.full_name?.trim() || "Customer",
      customerPhone: customer?.phone?.trim() || null,
      restaurant: one(r.restaurants)?.name ?? "—",
      status: adminOrderStatus(r.status),
      dbStatus: r.status,
      total: Number(r.total ?? 0),
      placedAt: formatDateTime(r.created_at),
      createdAtIso: r.created_at,
      itemCount: r.order_items?.length ?? 0,
      paymentMethod: r.payment_method ?? undefined,
      paymentStatus: r.payment_status ?? undefined,
      rider:
        leg?.driver_id && rider
          ? {
              id: leg.driver_id,
              name: rider.full_name?.trim() || "Rider",
              phone: rider.phone?.trim() || null,
            }
          : null,
      deliveryStatus: leg?.status ?? null,
    };
  });
}

export interface ManagerRider {
  id: string;
  name: string;
  phone: string | null;
  /** How many deliveries they are already carrying — dispatch needs this. */
  activeJobs: number;
}

/**
 * The riders a manager can dispatch to, least-loaded first.
 *
 * The load count is the point: assigning by name alone is how one rider ends up
 * with four jobs while another has none. `assigned` and `picked_up` are both
 * live work; `delivered` is finished and does not count against them.
 */
export async function listRiders(): Promise<ManagerRider[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, phone")
    .eq("role", "driver");

  if (error) throw error;

  const riders = (data ?? []) as {
    id: string;
    full_name: string | null;
    phone: string | null;
  }[];
  if (riders.length === 0) return [];

  const { data: legs } = await supabase
    .from("deliveries")
    .select("driver_id")
    .in("status", ["assigned", "picked_up"]);

  const load = new Map<string, number>();
  for (const l of (legs ?? []) as { driver_id: string | null }[]) {
    if (l.driver_id) load.set(l.driver_id, (load.get(l.driver_id) ?? 0) + 1);
  }

  return riders
    .map((r) => ({
      id: r.id,
      name: r.full_name?.trim() || "Rider",
      phone: r.phone?.trim() || null,
      activeJobs: load.get(r.id) ?? 0,
    }))
    .sort((a, b) => a.activeJobs - b.activeJobs || a.name.localeCompare(b.name));
}
