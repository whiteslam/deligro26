import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getOrderTrackingSnapshot } from "@/lib/data-access/order-tracking";

/** GET /api/orders/:id/tracking — live map + rider snapshot for customer tracking. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isSupabaseConfigured) {
    return NextResponse.json({ error: "backend_not_configured" }, { status: 503 });
  }

  const { id } = await params;

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
