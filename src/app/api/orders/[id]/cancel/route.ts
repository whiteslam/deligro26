import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/orders/:id/cancel — a customer cancels their own order, but only
 * before the kitchen has started (status placed/kitchen). The customer can't
 * update orders under RLS, so we verify ownership + state here and write with
 * the service-role client.
 */
const CANCELLABLE = new Set(["placed", "kitchen"]);

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSupabaseConfigured) return NextResponse.json({ error: "backend_not_configured" }, { status: 503 });
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data: order } = await admin
    .from("orders")
    .select("id, customer_id, status")
    .eq("id", id)
    .maybeSingle();

  // Consistent 404 — never leak whether someone else's order exists.
  if (!order || order.customer_id !== user.id) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (!CANCELLABLE.has(order.status)) {
    return NextResponse.json({ error: "too_late" }, { status: 409 });
  }

  const { error } = await admin.from("orders").update({ status: "cancelled" }).eq("id", id);
  if (error) return NextResponse.json({ error: "server_error" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
