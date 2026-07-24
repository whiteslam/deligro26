import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfile, type Role } from "@/lib/auth";
import { roleNeedsMfa, roleAllowsMfa } from "@/lib/auth/mfa";

/**
 * MFA state that Supabase doesn't own: the recovery-code fallbacks (hashed) and
 * an audit mirror of when the user turned MFA on/off. The TOTP factor + secret
 * live in Supabase Auth; we read enrollment from there, never store it here.
 */

const RECOVERY_CODE_COUNT = 10;

/** Normalise a code for hashing: lowercase, digits+letters only. */
function normalize(code: string): string {
  return code.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function hashCode(code: string): string {
  return createHash("sha256").update(normalize(code)).digest("hex");
}

/** A human-friendly, high-entropy code like "3f9a1-b7c2d". */
function makeCode(): string {
  const hex = randomBytes(5).toString("hex"); // 10 hex chars
  return `${hex.slice(0, 5)}-${hex.slice(5)}`;
}

export interface MfaStatus {
  role: Role;
  /** MFA is mandatory for this role and cannot be turned off. */
  required: boolean;
  /** This role may opt in/out (optional). Admin is required, not toggleable. */
  canToggle: boolean;
  /** A verified TOTP factor exists in Supabase Auth. */
  enrolled: boolean;
  currentLevel: "aal1" | "aal2" | null;
  /** Unused recovery codes left. */
  recoveryRemaining: number;
  enrolledAt: string | null;
}

/** Everything the Security settings section needs, in one read. */
export async function getMfaStatus(): Promise<MfaStatus | null> {
  const profile = await getProfile();
  if (!profile) return null;
  const role = profile.role;

  const supabase = await createClient();
  const [{ data: factors }, { data: aal }] = await Promise.all([
    supabase.auth.mfa.listFactors(),
    supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
  ]);

  const enrolled = Boolean(
    factors?.totp.some((f) => f.status === "verified")
  );

  const [recoveryRemaining, enrolledAt] = await Promise.all([
    countRecoveryCodes(profile.id),
    getEnrolledAt(profile.id),
  ]);

  const currentLevel: "aal1" | "aal2" | null =
    aal?.currentLevel === "aal2"
      ? "aal2"
      : aal?.currentLevel === "aal1"
        ? "aal1"
        : null;

  return {
    role,
    required: roleNeedsMfa(role),
    canToggle: roleAllowsMfa(role) && !roleNeedsMfa(role),
    enrolled,
    currentLevel,
    recoveryRemaining,
    enrolledAt,
  };
}

/** Remaining unused recovery codes for a user. Service-role, keyed by id. */
export async function countRecoveryCodes(userId: string): Promise<number> {
  try {
    const admin = createAdminClient();
    const { count } = await admin
      .from("mfa_recovery_codes")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .is("used_at", null);
    return count ?? 0;
  } catch {
    return 0;
  }
}

async function getEnrolledAt(userId: string): Promise<string | null> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("user_mfa")
      .select("enrolled_at, enabled")
      .eq("user_id", userId)
      .maybeSingle();
    return data?.enabled ? (data.enrolled_at as string | null) : null;
  } catch {
    return null;
  }
}

/**
 * Issue a fresh set of recovery codes: burns any existing ones, stores the new
 * hashes, and returns the plaintext ONCE (the caller shows them and never can
 * again). Records the enrollment in the audit mirror.
 */
export async function generateRecoveryCodes(userId: string): Promise<string[]> {
  const admin = createAdminClient();
  const codes = Array.from({ length: RECOVERY_CODE_COUNT }, makeCode);

  // Replace, don't append — regenerating always invalidates the old set.
  await admin.from("mfa_recovery_codes").delete().eq("user_id", userId);
  const { error } = await admin.from("mfa_recovery_codes").insert(
    codes.map((c) => ({ user_id: userId, code_hash: hashCode(c) }))
  );
  if (error) throw error;

  await markMfaEnabled(userId);
  return codes;
}

/** Audit: record that MFA is on (idempotent upsert). */
export async function markMfaEnabled(userId: string): Promise<void> {
  const admin = createAdminClient();
  await admin.from("user_mfa").upsert(
    {
      user_id: userId,
      enabled: true,
      enrolled_at: new Date().toISOString(),
      disabled_at: null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );
}

/** Audit: record that MFA is off, and burn all recovery codes. */
export async function markMfaDisabled(userId: string): Promise<void> {
  const admin = createAdminClient();
  await admin.from("mfa_recovery_codes").delete().eq("user_id", userId);
  await admin.from("user_mfa").upsert(
    {
      user_id: userId,
      enabled: false,
      disabled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );
}

/**
 * Verify a recovery code and burn it. Returns true on a valid, unused match.
 * Used by the "lost my authenticator" reset flow.
 */
export async function consumeRecoveryCode(
  userId: string,
  code: string
): Promise<boolean> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("mfa_recovery_codes")
    .select("id")
    .eq("user_id", userId)
    .eq("code_hash", hashCode(code))
    .is("used_at", null)
    .maybeSingle();

  if (!data) return false;
  await admin
    .from("mfa_recovery_codes")
    .update({ used_at: new Date().toISOString() })
    .eq("id", data.id);
  return true;
}
