import "server-only";
import { createHash, randomInt } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { phoneToSyntheticEmail } from "@/lib/auth/phone";

/**
 * Server-side OTP lifecycle. All queries use the service-role client (the
 * otp_codes table is RLS-locked with no policies). The verify step mints a real
 * Supabase session by generating an admin magic-link token the client then
 * exchanges, so downstream RLS on auth.uid() keeps working unchanged.
 */

const CODE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_MS = 30 * 1000;
const MAX_PER_HOUR = 6;

/**
 * The pepper is the only secret in the code hash: with it, a leaked
 * `otp_codes.code_hash` is useless; without it, six digits are brute-forced in
 * microseconds. So there is deliberately no default — a fallback value that
 * ships in the repository is not a secret, and silently running on one is worse
 * than refusing to run. Set OTP_PEPPER in every environment.
 */
function pepper(): string {
  const value = process.env.OTP_PEPPER;
  if (!value) {
    throw new Error(
      "OTP_PEPPER is not set. Generate one (`openssl rand -hex 32`) and add it " +
        "to the server environment — OTP hashes are worthless without it."
    );
  }
  return value;
}

function hashCode(phone: string, code: string): string {
  return createHash("sha256")
    .update(`${code}:${phone}:${pepper()}`)
    .digest("hex");
}

export interface RequestResult {
  ok: boolean;
  code?: string; // only returned in dev mode (no SMS provider)
  error?: string;
  retryAfter?: number; // seconds
}

/** Create + persist a fresh 6-digit code for this phone (with rate limits). */
export async function createOtp(phone: string): Promise<RequestResult> {
  const supabase = createAdminClient();
  const now = Date.now();

  // Rate limit: cooldown + hourly cap.
  const { data: recent } = await supabase
    .from("otp_codes")
    .select("created_at")
    .eq("phone", phone)
    .gte("created_at", new Date(now - 60 * 60 * 1000).toISOString())
    .order("created_at", { ascending: false });

  if (recent && recent.length > 0) {
    const last = new Date(recent[0].created_at).getTime();
    if (now - last < RESEND_COOLDOWN_MS) {
      return { ok: false, error: "cooldown", retryAfter: Math.ceil((RESEND_COOLDOWN_MS - (now - last)) / 1000) };
    }
    if (recent.length >= MAX_PER_HOUR) {
      return { ok: false, error: "too_many", retryAfter: 3600 };
    }
  }

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const { error } = await supabase.from("otp_codes").insert({
    phone,
    code_hash: hashCode(phone, code),
    expires_at: new Date(now + CODE_TTL_MS).toISOString(),
  });
  if (error) return { ok: false, error: "db_error" };

  return { ok: true, code };
}

export interface VerifyResult {
  ok: boolean;
  error?: string;
  tokenHash?: string; // magic-link token the client exchanges for a session
  email?: string;
  isNewUser?: boolean;
}

/** Check the code, resolve/create the auth user, and mint a session token. */
export async function verifyOtp(phone: string, code: string): Promise<VerifyResult> {
  const supabase = createAdminClient();

  const { data: row } = await supabase
    .from("otp_codes")
    .select("id, code_hash, attempts, consumed, expires_at")
    .eq("phone", phone)
    .eq("consumed", false)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!row) return { ok: false, error: "no_code" };
  if (new Date(row.expires_at).getTime() < Date.now()) return { ok: false, error: "expired" };
  if (row.attempts >= MAX_ATTEMPTS) return { ok: false, error: "locked" };

  if (row.code_hash !== hashCode(phone, code)) {
    await supabase.from("otp_codes").update({ attempts: row.attempts + 1 }).eq("id", row.id);
    return { ok: false, error: "invalid" };
  }

  await supabase.from("otp_codes").update({ consumed: true }).eq("id", row.id);

  // Resolve the user: existing profile by phone (any role) wins, so operators
  // can OTP into their real account; otherwise create a phone-only customer.
  const { user, email, isNewUser } = await resolveUser(phone);
  if (!user) return { ok: false, error: "user_error" };

  // Mint a magic-link token the browser exchanges to establish the session.
  const { data: link, error: linkErr } = await supabase.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  if (linkErr || !link?.properties?.hashed_token) {
    return { ok: false, error: "session_error" };
  }

  return { ok: true, tokenHash: link.properties.hashed_token, email, isNewUser };
}

async function resolveUser(
  phone: string
): Promise<{ user: { id: string } | null; email: string; isNewUser: boolean }> {
  const supabase = createAdminClient();

  // 1. Existing profile with this phone?
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("phone", phone)
    .maybeSingle();

  if (profile?.id) {
    const { data } = await supabase.auth.admin.getUserById(profile.id);
    const existingEmail = data.user?.email;
    if (existingEmail) return { user: { id: profile.id }, email: existingEmail, isNewUser: false };
  }

  // 2. Phone-only synthetic user (create if needed).
  const email = phoneToSyntheticEmail(phone);
  const { data: created, error } = await supabase.auth.admin.createUser({
    email,
    phone,
    email_confirm: true,
    phone_confirm: true,
    user_metadata: { phone },
  });

  if (error) {
    // Likely already exists — look it up by listing (small scale) then match email.
    const { data: list } = await supabase.auth.admin.listUsers({ perPage: 200 });
    const found = list?.users.find((u) => u.email === email);
    if (found) {
      await supabase.from("profiles").update({ phone }).eq("id", found.id);
      return { user: { id: found.id }, email, isNewUser: false };
    }
    return { user: null, email, isNewUser: false };
  }

  // Backfill the phone onto the auto-created profile (signup trigger made it).
  await supabase.from("profiles").update({ phone }).eq("id", created.user.id);
  return { user: { id: created.user.id }, email, isNewUser: true };
}
