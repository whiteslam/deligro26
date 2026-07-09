import "server-only";
import { toLocal10 } from "@/lib/auth/phone";

/**
 * Renflair SMS gateway — the same provider the legacy Deligro site used.
 * GET https://sms.renflair.in/V1.php?API=<key>&PHONE=<10-digit>&OTP=<code>
 *
 * The key comes from env (RENFLAIR_API_KEY). If it's absent we treat the app as
 * being in "dev SMS" mode: no message is sent and the caller surfaces the code
 * locally so the flow is testable without spending an SMS.
 */

const ENDPOINT = "https://sms.renflair.in/V1.php";

export const smsConfigured = Boolean(process.env.RENFLAIR_API_KEY);

export interface SmsResult {
  sent: boolean;
  devMode: boolean;
  detail?: string;
}

export async function sendOtpSms(e164: string, code: string): Promise<SmsResult> {
  const key = process.env.RENFLAIR_API_KEY;
  if (!key) return { sent: false, devMode: true, detail: "RENFLAIR_API_KEY not set" };

  const url = `${ENDPOINT}?API=${encodeURIComponent(key)}&PHONE=${encodeURIComponent(
    toLocal10(e164)
  )}&OTP=${encodeURIComponent(code)}`;

  try {
    const res = await fetch(url, { method: "GET", cache: "no-store" });
    const text = await res.text();
    // Renflair returns JSON like {"status":"success","message":"..."}.
    let ok = res.ok;
    try {
      const json = JSON.parse(text);
      ok = ok && String(json.status ?? "").toLowerCase() !== "error";
    } catch {
      /* non-JSON body — fall back to HTTP status */
    }
    return { sent: ok, devMode: false, detail: ok ? undefined : text.slice(0, 200) };
  } catch (e) {
    return { sent: false, devMode: false, detail: (e as Error).message };
  }
}
