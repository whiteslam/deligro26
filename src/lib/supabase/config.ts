/**
 * Central Supabase config + a guard so the app still runs as a static demo
 * before any keys are set. Once NEXT_PUBLIC_SUPABASE_URL / _ANON_KEY exist,
 * auth + RLS enforcement switch on automatically.
 */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
/** Supports both legacy anon key and newer publishable key env names. */
export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  "";
export const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.SUPABASE_SECRET_KEY ??
  "";

/** True once real credentials are present. Gates auth/enforcement vs demo mode. */
export const isSupabaseConfigured =
  SUPABASE_URL.startsWith("http") && SUPABASE_ANON_KEY.length > 20;

/**
 * Demo mode is a DEVELOPMENT affordance: it lets the static UI render before any
 * keys are set, and to do that it makes `requireRole()` hand back a synthetic
 * profile with whatever role was asked for.
 *
 * In production that is indistinguishable from "our credentials failed to load"
 * — a typo'd env var name, a Vercel environment that wasn't promoted, a rotated
 * key pasted with a trailing newline — and the consequence is not a broken page
 * but an open `/admin`. A config mistake must fail closed (an outage) and never
 * fail open (a breach), so we refuse to boot instead.
 */
if (!isSupabaseConfigured && process.env.NODE_ENV === "production") {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY are missing or " +
      "malformed in a production build. Refusing to start: demo mode disables " +
      "every authorization check (see src/lib/auth.ts requireRole)."
  );
}
