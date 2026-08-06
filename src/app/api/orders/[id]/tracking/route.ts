import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { getOrderTrackingSnapshot } from "@/lib/data-access/order-tracking";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";

/** GET /api/orders/:id/tracking — live map + rider snapshot for customer tracking. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isSupabaseConfigured) {
    return NextResponse.json({ error: "backend_not_configured" }, { status: 503 });
  }

  const { id } = await params;

  // getOrderTrackingSnapshot checks the session and scopes the order read
  // through RLS, so authorization is handled. This is a polling endpoint (the
  // live map hits it repeatedly), so the cap is generous — it exists to stop
  // scripted enumeration, not normal tracking.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    const limit = await rateLimit(`order-tracking:${user.id}`, 120, 60_000);
    if (!limit.ok) return tooManyRequests(limit);
  }

  try {
    const tracking = await getOrderTrackingSnapshot(id);
    if (!tracking) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    return NextResponse.json({ tracking });
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
