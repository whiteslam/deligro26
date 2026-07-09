import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { submitReview } from "@/lib/data-access/reviews";

/** POST /api/reviews  { orderId, rating, comment? } */
export async function POST(request: Request) {
  if (!isSupabaseConfigured) return NextResponse.json({ error: "backend_not_configured" }, { status: 503 });

  let body: { orderId?: string; rating?: number; comment?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  if (!body.orderId || !body.rating) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const result = await submitReview(body.orderId, body.rating, body.comment);
  if (!result.ok) {
    const status = result.error === "unauthorized" ? 401 : result.error === "not_found" ? 404 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }
  return NextResponse.json({ ok: true });
}
