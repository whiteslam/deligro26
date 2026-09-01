import "server-only";
import { toLocal10 } from "@/lib/auth/phone";
import { recordProvider } from "@/lib/obs/emit";

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

  // A failure here is a customer who cannot sign in at all — the most severe
  // outcome in the app that produces no error anywhere the caller can see. The
  // OTP route already receives `detail` and does nothing durable with it, so
  // this is where it becomes a record.
  //
  // Note what is NOT recorded: the URL. It carries RENFLAIR_API_KEY and the
  // customer's phone number as query parameters, which is why the operation is
  // named rather than described.
  const started = Date.now();
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
    const detail = ok ? undefined : text.slice(0, 200);
    recordProvider("renflair", "send-otp", {
      ok,
      durationMs: Date.now() - started,
      status: res.status,
      detail,
    });
    return { sent: ok, devMode: false, detail };
  } catch (e) {
    const detail = (e as Error).message;
    recordProvider("renflair", "send-otp", {
      ok: false,
      durationMs: Date.now() - started,
      detail,
    });
    return { sent: false, devMode: false, detail };
  }
}
