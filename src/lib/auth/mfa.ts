import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { Role } from "@/lib/auth";

/**
 * Roles for which MFA is MANDATORY — enforced on every portal entry, cannot be
 * disabled or opted out of. Admin only.
 */
export const MFA_REQUIRED_ROLES: readonly Role[] = ["admin"];

/**
 * Roles for which MFA is OPTIONAL — the operator opts in from their settings.
 * Once enrolled they are challenged on entry like a required role; if they
 * never enroll (or later disable it) they are let in at aal1.
 */
export const MFA_OPTIONAL_ROLES: readonly Role[] = ["restaurant", "driver"];

export function roleNeedsMfa(role: Role): boolean {
  return (MFA_REQUIRED_ROLES as readonly string[]).includes(role);
}

export function roleAllowsMfa(role: Role): boolean {
  return (
    roleNeedsMfa(role) ||
    (MFA_OPTIONAL_ROLES as readonly string[]).includes(role)
  );
}

/** Only allow relative in-app paths as post-MFA redirects. */
export function safeNextPath(next: string | null | undefined, fallback = "/"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return fallback;
  return next;
}

export type MfaGate =
  | { ok: true; currentLevel: "aal1" | "aal2" | null }
  | { ok: false; reason: "challenge" | "setup" };

/**
 * Whether the current session is allowed into an MFA-gated portal.
 * - No verified factors → must enroll (`setup`)
 * - Factors enrolled but session still aal1 → must verify (`challenge`)
 * - aal2 → ok
 */
export async function getOperatorMfaGate(): Promise<MfaGate> {
  if (!isSupabaseConfigured) return { ok: true, currentLevel: null };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (error || !data) return { ok: false, reason: "setup" };

  const { currentLevel, nextLevel } = data;
  if (currentLevel === "aal2") {
    return { ok: true, currentLevel: "aal2" };
  }
  if (nextLevel === "aal2") return { ok: false, reason: "challenge" };
  return { ok: false, reason: "setup" };
}

/**
 * Call from a portal layout after `requireRole`. Behaviour depends on the role:
 *
 * - MANDATORY role (admin): not-enrolled → forced to `/mfa/setup`; enrolled but
 *   aal1 → forced to `/mfa` challenge; aal2 → allowed.
 * - OPTIONAL role (restaurant/driver): not-enrolled → allowed straight in (MFA
 *   is opt-in); enrolled but aal1 → challenged; aal2 → allowed. We never force
 *   an optional operator to set MFA up.
 */
export async function requireOperatorMfa(
  nextPath: string,
  role: Role
): Promise<void> {
  if (!isSupabaseConfigured) return;
  if (!roleAllowsMfa(role)) return; // e.g. customer — MFA doesn't apply

  const gate = await getOperatorMfaGate();
  if (gate.ok) return;

  const next = encodeURIComponent(safeNextPath(nextPath));

  // Enrolled but not yet verified this session → challenge, for every role.
  if (gate.reason === "challenge") {
    redirect(`/mfa?next=${next}`);
  }

  // reason === "setup" (no verified factor). Mandatory roles must enroll now;
  // optional roles are simply let through — they haven't opted in.
  if (roleNeedsMfa(role)) {
    redirect(`/mfa/setup?next=${next}`);
  }
}
