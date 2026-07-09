import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { toE164 } from "@/lib/auth/phone";
import { verifyOtp } from "@/lib/data-access/otp";

/**
 * POST /api/auth/otp/verify  { phone, code }
 * → { tokenHash, email } which the client exchanges via
 *   supabase.auth.verifyOtp({ token_hash, type: "email" }) to set its session.
 */
export async function POST(request: Request) {
  if (!isSupabaseConfigured) {
    return NextResponse.json({ error: "backend_not_configured" }, { status: 503 });
  }

  let body: { phone?: string; code?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const phone = toE164(body.phone ?? "");
  const code = (body.code ?? "").replace(/\D/g, "");
  if (!phone || code.length !== 6) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const result = await verifyOtp(phone, code);
  if (!result.ok) {
    const status = result.error === "invalid" || result.error === "expired" || result.error === "locked" ? 401 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({
    ok: true,
    tokenHash: result.tokenHash,
    email: result.email,
    isNewUser: result.isNewUser,
  });
}
