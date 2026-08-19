"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { toE164 } from "@/lib/auth/phone";
import { rateLimit } from "@/lib/rate-limit";

/**
 * Mobile-number + password sign-in for the operator portals.
 *
 * Vendors are onboarded by hand: an admin creates the shop, hands the owner
 * their mobile number and a password, and that is the whole of what they are
 * told. They do not reliably know the email address the account was created
 * with — it is often one the admin typed for them — so the email/password form
 * is a door they cannot open, and OTP depends on the SMS gateway being up and
 * the handset being in the room.
 *
 * This is deliberately a Server Action rather than a client call, because the
 * lookup it performs — number → profile → auth user's email — must never be
 * exposed as an endpoint that answers before the password is checked. The email
 * is resolved with the service role, used immediately, and never returned; a
 * wrong password and an unknown number produce exactly the same reply.
 *
 * It grants nothing on its own: this only establishes a session. Whether that
 * account may open the portal it was used at is still decided server-side by
 * the portal layout's `requireRole()` / `requireVendorAccess()`.
 */

export interface MobileLoginResult {
  ok: boolean;
  error?: string;
}

/** Deliberately identical for "no such number" and "wrong password". */
const BAD_CREDENTIALS = "Incorrect mobile number or password.";

/** Per-IP and per-number caps. Password guessing is the whole threat here. */
const IP_LIMIT = 20;
const PHONE_LIMIT = 10;
const WINDOW_MS = 15 * 60_000;

/** The caller's IP, from the same headers `clientIp()` reads on route handlers. */
async function callerIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return h.get("x-real-ip")?.trim() || "unknown";
}

export async function signInWithMobileAction(
  mobile: string,
  password: string
): Promise<MobileLoginResult> {
  if (!isSupabaseConfigured) {
    return {
      ok: false,
      error:
        "Auth isn't configured yet. Add your Supabase keys to .env.local, then run the migrations.",
    };
  }

  const e164 = toE164(mobile ?? "");
  if (!e164 || !password) return { ok: false, error: BAD_CREDENTIALS };

  // Two buckets: one stops a single client walking a list of numbers, the other
  // stops a distributed attempt on one known number. Both must pass.
  const ip = await callerIp();
  const [byIp, byPhone] = await Promise.all([
    rateLimit(`pw-login-ip:${ip}`, IP_LIMIT, WINDOW_MS),
    rateLimit(`pw-login-phone:${e164}`, PHONE_LIMIT, WINDOW_MS),
  ]);
  if (!byIp.ok || !byPhone.ok) {
    return {
      ok: false,
      error: "Too many sign-in attempts. Wait a few minutes and try again.",
    };
  }

  // Service role: `profiles` is not readable across users by an anonymous
  // caller, and this runs before anyone is signed in. Nothing read here is
  // returned to the browser.
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("id")
    .eq("phone", e164)
    .maybeSingle();

  const ownerId = (profile as { id: string } | null)?.id;
  if (!ownerId) return { ok: false, error: BAD_CREDENTIALS };

  const { data: userData, error: userErr } =
    await admin.auth.admin.getUserById(ownerId);
  const email = userData?.user?.email;
  if (userErr || !email) {
    // A real account with no email address cannot hold a password. Say so
    // plainly — this is a setup problem an admin has to fix, and pretending the
    // credentials were wrong would send the vendor round the same loop for ever.
    return {
      ok: false,
      error:
        "This account has no email address, so it can't use a password. Sign in with OTP, or ask an admin to add one.",
    };
  }

  // The cookie-bound client, so a success lands as a session on this response.
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, error: BAD_CREDENTIALS };

  return { ok: true };
}
