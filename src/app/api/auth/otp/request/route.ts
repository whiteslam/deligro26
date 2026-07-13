import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { toE164 } from "@/lib/auth/phone";
import { createOtp } from "@/lib/data-access/otp";
import { sendOtpSms } from "@/lib/sms/renflair";

/** POST /api/auth/otp/request  { phone } → sends a code via Renflair. */
export async function POST(request: Request) {
  if (!isSupabaseConfigured) {
    return NextResponse.json({ error: "backend_not_configured" }, { status: 503 });
  }

  let body: { phone?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const phone = toE164(body.phone ?? "");
  if (!phone) {
    return NextResponse.json({ error: "invalid_phone" }, { status: 400 });
  }

  const result = await createOtp(phone);
  if (!result.ok) {
    const status = result.error === "cooldown" || result.error === "too_many" ? 429 : 400;
    return NextResponse.json({ error: result.error, retryAfter: result.retryAfter }, { status });
  }

  const sms = await sendOtpSms(phone, result.code!);

  // Handing the code back in the response makes the flow testable without an SMS
  // provider — and would hand anyone the login code for any phone number, which
  // is a complete pre-auth account takeover. `devMode` alone is not enough of a
  // guard: it is true whenever RENFLAIR_API_KEY is missing, and a key missing
  // from the production environment is exactly the accident that must not become
  // an authentication bypass. So it is also fenced behind a non-production build.
  const inProduction = process.env.NODE_ENV === "production";
  const devCode = sms.devMode && !inProduction ? result.code : undefined;

  // A production deploy with no SMS provider can't sign anyone in. Say so,
  // rather than silently returning ok:true for a code that was never delivered.
  if (sms.devMode && inProduction) {
    console.error(
      "OTP requested but RENFLAIR_API_KEY is not set — no SMS was sent."
    );
    return NextResponse.json({ error: "sms_unavailable" }, { status: 503 });
  }

  return NextResponse.json({
    ok: true,
    sent: sms.sent,
    devMode: sms.devMode,
    devCode,
  });
}
