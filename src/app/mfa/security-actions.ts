"use server";

import { revalidatePath } from "next/cache";
import { createClient as createIsolatedClient } from "@supabase/supabase-js";
import { requireUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/supabase/config";
import { roleNeedsMfa, roleAllowsMfa } from "@/lib/auth/mfa";
import {
  generateRecoveryCodes,
  markMfaDisabled,
} from "@/lib/data-access/mfa";

export interface MfaActionResult {
  ok: boolean;
  error?: string;
}

/** Where to revalidate after an MFA change — each operator has its own settings. */
function settingsPathFor(role: string): string {
  return role === "admin" ? "/admin/settings" : "/vendor/settings";
}

/**
 * Turn MFA OFF for an optional operator (vendor/restaurant/driver).
 *
 * Gated three ways: the role must be one that MAY opt out (admin cannot — MFA is
 * mandatory), the caller must re-enter their password (a second confirmation
 * that it's really them), and only then are their verified TOTP factors
 * unenrolled from Supabase and their recovery codes burned.
 */
export async function disableMfaAction(
  password: string
): Promise<MfaActionResult> {
  const profile = await requireUser();

  // Admin (and any non-operator) can't disable MFA.
  if (!roleAllowsMfa(profile.role) || roleNeedsMfa(profile.role)) {
    return { ok: false, error: "MFA is mandatory for this account." };
  }
  if (!password.trim()) {
    return { ok: false, error: "Enter your password to confirm." };
  }

  // signInWithPassword below is a password oracle, and because the call
  // originates server-side Supabase's own per-IP throttle sees our server for
  // every user — so it neither bounds this endpoint nor tells attackers apart.
  // Bound it per account: someone with a hijacked session should not be able to
  // grind the password here and then switch MFA off.
  const attempt = await rateLimit(`mfa-disable:${profile.id}`, 5, 15 * 60_000);
  if (!attempt.ok) {
    return {
      ok: false,
      error: "Too many attempts. Try again in a few minutes.",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) {
    // No password identity (e.g. phone-OTP-only account) — can't password-verify.
    return {
      ok: false,
      error:
        "This account has no password set, so it can't be verified this way.",
    };
  }

  // Re-authenticate on a throwaway client so verifying the password never
  // disturbs the live session cookie.
  const check = createIsolatedClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: pwError } = await check.auth.signInWithPassword({
    email: user.email,
    password,
  });
  if (pwError) {
    return { ok: false, error: "That password isn't right." };
  }

  // Password confirmed → tear the factor(s) down.
  try {
    const { data: factors } = await supabase.auth.mfa.listFactors();
    for (const f of factors?.all ?? []) {
      await supabase.auth.mfa.unenroll({ factorId: f.id });
    }
    await markMfaDisabled(profile.id);
  } catch {
    return { ok: false, error: "Couldn't disable MFA. Try again." };
  }

  revalidatePath(settingsPathFor(profile.role));
  return { ok: true };
}

/**
 * Issue a fresh set of one-time recovery codes and return them ONCE. Requires an
 * already-verified factor — recovery codes are the fallback for an existing
 * enrollment, not a way to skip setting MFA up.
 */
export async function generateRecoveryCodesAction(): Promise<
  MfaActionResult & { codes?: string[] }
> {
  const profile = await requireUser();
  if (!roleAllowsMfa(profile.role)) {
    return { ok: false, error: "MFA isn't available for this account." };
  }

  const supabase = await createClient();
  const { data: factors } = await supabase.auth.mfa.listFactors();
  const enrolled = Boolean(factors?.totp.some((f) => f.status === "verified"));
  if (!enrolled) {
    return { ok: false, error: "Turn MFA on before generating recovery codes." };
  }

  try {
    const codes = await generateRecoveryCodes(profile.id);
    revalidatePath(settingsPathFor(profile.role));
    return { ok: true, codes };
  } catch {
    return { ok: false, error: "Couldn't generate recovery codes. Try again." };
  }
}
