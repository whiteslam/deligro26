import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { toE164 } from "@/lib/auth/phone";
import { checkOtp } from "@/lib/data-access/otp";

/**
 * POST /api/admin/vendors/verify-phone  { phone, code }
 *
 * Confirms an OTP code an admin entered while onboarding a vendor, proving the
 * vendor's mobile is reachable. It only validates + consumes the code
 * (`checkOtp`) — unlike the login verify route it never mints a session, so the
 * admin stays signed in as themselves. Admin-gated. The code is sent by reusing
 * the public /api/auth/otp/request endpoint.
 */
export async function POST(request: Request) {
  await requireRole("admin");
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

  const result = await checkOtp(phone, code);
  if (!result.ok) {
    const status =
      result.error === "invalid" || result.error === "expired" || result.error === "locked"
        ? 401
        : 400;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({ ok: true });
}
