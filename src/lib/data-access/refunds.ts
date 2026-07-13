import "server-only";
import { createClient } from "@/lib/supabase/server";

/**
 * The refund queue, for real.
 *
 * The admin refunds screen used to render three invented refunds, and its
 * Approve button only set local React state — it rendered "Approved · logged"
 * and nothing was approved, and nothing was logged. An admin could believe they
 * had settled a customer's ₹660 and be wrong.
 *
 * Writes go through RLS ("refunds — admin decide", 0001_init), so a non-admin
 * cannot decide a refund even if this code were called from the wrong place.
 */

export type RefundStatus = "pending" | "approved" | "rejected";

export interface RefundRow {
  id: string;
  orderId: string;
  amount: number;
  reason: string | null;
  status: RefundStatus;
  createdAt: string;
  customerName: string | null;
  restaurantName: string | null;
}

const SELECT = `
  id, order_id, amount, reason, status, created_at,
  orders (
    profiles:customer_id ( full_name ),
    restaurants ( name )
  )
`;

interface Row {
  id: string;
  order_id: string;
  amount: number;
  reason: string | null;
  status: RefundStatus;
  created_at: string;
  orders?: {
    profiles?: { full_name: string | null } | null;
    restaurants?: { name: string | null } | null;
  } | null;
}

function first<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export async function listRefunds(limit = 50): Promise<RefundRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("refunds")
    .select(SELECT)
    // Pending first — that's the work; decided ones are just history.
    .order("status", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;

  return ((data ?? []) as unknown as Row[]).map((r) => {
    const order = first(r.orders);
    return {
      id: r.id,
      orderId: r.order_id,
      amount: r.amount,
      reason: r.reason,
      status: r.status,
      createdAt: r.created_at,
      customerName: first(order?.profiles)?.full_name ?? null,
      restaurantName: first(order?.restaurants)?.name ?? null,
    };
  });
}

/**
 * Decide a refund. Records *who* decided it (decided_by), which is the part the
 * old screen claimed to do — "every admin action here is logged" — and didn't.
 */
export async function decideRefund(
  id: string,
  decision: Exclude<RefundStatus, "pending">
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("unauthorized");

  const { error } = await supabase
    .from("refunds")
    .update({ status: decision, decided_by: user.id })
    .eq("id", id)
    // Only a pending refund can be decided — never silently flip a settled one.
    .eq("status", "pending");

  if (error) throw error;
}
