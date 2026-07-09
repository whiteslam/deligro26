import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { evaluateCoupon } from "@/lib/data-access/coupons";

/** POST /api/coupons/validate  { code, subtotal } → { discount } */
export async function POST(request: Request) {
  if (!isSupabaseConfigured) return NextResponse.json({ error: "backend_not_configured" }, { status: 503 });

  let body: { code?: string; subtotal?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  if (!body.code || typeof body.subtotal !== "number") {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const result = await evaluateCoupon(body.code, body.subtotal);
  if (!result.ok) return NextResponse.json({ error: result.error, minOrder: result.discount }, { status: 400 });
  return NextResponse.json({ ok: true, code: result.code, discount: result.discount });
}
