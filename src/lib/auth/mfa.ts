import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { Role } from "@/lib/auth";

/**
 * Roles for which MFA is MANDATORY — enforced on every portal entry, cannot be
 * disabled or opted out of.
 *
 * Admin is here because the admin panel is the one place from which every
 * vendor's payout details and every customer record are reachable; a password
 * alone is not an acceptable guard on that. This list was previously empty,
 * which silently contradicted SECURITY.md, 0016_mfa.sql and the doc comment on
 * requireOperatorMfa below — all three already claimed admin MFA was enforced.
 */
export const MFA_REQUIRED_ROLES: readonly Role[] = ["admin"];

/**
 * Roles for which MFA is OPTIONAL — the operator opts in from their settings.
 * Once enrolled they are challenged on entry like a required role; if they
 * never enroll (or later disable it) they are let in at aal1.
 */
export const MFA_OPTIONAL_ROLES: readonly Role[] = [
  "restaurant",
  "driver",
  "manager",
];

/**
 * The seeded QA logins (scripts/seed-users.ts, scripts/qa/idor-suite.ts). They
 * must stay reachable with a password alone or the automated suites can't run.
 */
const DEMO_ACCOUNTS = [
  "admin@deligro.demo",
  "vendor@deligro.demo",
  "driver@deligro.demo",
];

/**
 * Accounts allowed past a MANDATORY MFA gate at aal1.
 *
 * Outside production the demo trio is exempt automatically, so `npm run test:*`
 * and local admin work need no setup. In production nothing is exempt unless
 * named explicitly in MFA_EXEMPT_EMAILS — an exemption there is then a
 * deliberate, reviewable act rather than an accident of NODE_ENV. Leave that
 * variable unset on the live environment.
 */
function mfaExemptEmails(): Set<string> {
  const fromEnv = (process.env.MFA_EXEMPT_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  const builtIn = process.env.NODE_ENV === "production" ? [] : DEMO_ACCOUNTS;

  return new Set([...builtIn, ...fromEnv]);
}

/** True when this address may enter an MFA-gated portal without a factor. */
export function isMfaExempt(email: string | null | undefined): boolean {
  if (!email) return false;
  return mfaExemptEmails().has(email.toLowerCase());
}

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
  // An exempt account that chose to enroll is still challenged: the exemption
  // excuses you from *having* a factor, not from using one you set up.
  if (gate.reason === "challenge") {
    redirect(`/mfa?next=${next}`);
  }

  // reason === "setup" (no verified factor). Mandatory roles must enroll now;
  // optional roles are simply let through — they haven't opted in.
  if (roleNeedsMfa(role)) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    // The seeded QA logins sign in with a password only; forcing enrollment
    // would lock the automated suites out of the admin portal. See isMfaExempt.
    if (isMfaExempt(user?.email)) return;

    redirect(`/mfa/setup?next=${next}`);
  }
}
