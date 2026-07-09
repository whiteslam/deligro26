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

  // In dev (no RENFLAIR_API_KEY) surface the code so the flow is testable.
  const devCode = sms.devMode ? result.code : undefined;

  return NextResponse.json({
    ok: true,
    sent: sms.sent,
    devMode: sms.devMode,
    devCode,
  });
}
