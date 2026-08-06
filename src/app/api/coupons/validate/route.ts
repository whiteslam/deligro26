import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { evaluateCoupon } from "@/lib/data-access/coupons";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";

/** POST /api/coupons/validate  { code, subtotal } → { discount } */
export async function POST(request: Request) {
  if (!isSupabaseConfigured) return NextResponse.json({ error: "backend_not_configured" }, { status: 503 });

  // Only a signed-in customer is ever about to check out, and requiring a
  // session turns "enumerate the whole promo-code namespace anonymously" into
  // an attributable, rate-limited action against a known account.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const limit = await rateLimit(`coupon-validate:${user.id}`, 20, 60_000);
  if (!limit.ok) return tooManyRequests(limit);

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
