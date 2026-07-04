import "server-only";
import { createClient } from "@/lib/supabase/server";

/**
 * Secure data access for orders. Every query here runs through the anon key,
 * so Row Level Security is in force: the database returns a row ONLY if the
 * caller is allowed to see it (own order / owning restaurant / actively-assigned
 * driver / admin). App code cannot accidentally widen that — the fix for IDOR
 * lives in the DB, not in remembering to add a `where`.
 */

export interface OrderItem {
  name: string;
  qty: number;
  price: number;
}

export interface Order {
  id: string;
  restaurant_id: string;
  status: string;
  total: number;
  created_at: string;
  order_items: OrderItem[];
}

const SELECT =
  "id, restaurant_id, status, total, created_at, order_items(name, qty, price)";

/** One order by id, or null if it doesn't exist OR isn't visible to the caller. */
export async function getOrderById(id: string): Promise<Order | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("orders")
    .select(SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return (data as Order) ?? null;
}

/**
 * Orders visible to the current user. No explicit `where user = me` needed:
 * RLS already scopes the result to what this role may see. A customer gets
 * their own; a vendor gets its restaurant's; a driver gets active assignments.
 */
export async function listVisibleOrders(): Promise<Order[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("orders")
    .select(SELECT)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data as Order[]) ?? [];
}
