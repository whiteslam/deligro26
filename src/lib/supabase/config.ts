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
