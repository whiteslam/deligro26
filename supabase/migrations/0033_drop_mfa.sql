-- Remove multi-factor auth.
--
-- 0016_mfa.sql added the app-side half of TOTP: an audit mirror of when a user
-- turned MFA on/off (`user_mfa`) and hashed single-use recovery codes
-- (`mfa_recovery_codes`). The enforcement half — `requireOperatorMfa()` in every
-- portal layout, the /mfa challenge and /mfa/setup screens, MFA_REQUIRED_ROLES,
-- MFA_EXEMPT_EMAILS — has been deleted from the app. Nothing reads these two
-- tables any more, so they go too rather than sitting here as state no code
-- maintains.
--
-- What this migration does NOT touch: `auth.mfa_factors`, which Supabase Auth
-- owns. Factors already enrolled stay enrolled and harmless — no layout asks for
-- aal2 now, so a session at aal1 is admitted everywhere. To clear them out, use
-- the Supabase dashboard (Authentication → Users → the user → factors) or the
-- admin API; do not delete from `auth.*` here.
--
-- Access control that remains: role checks in every portal layout
-- (`requireRole` / `requireVendorAccess`), per-portal sign-in pages, and RLS on
-- every table. See SECURITY.md.

drop table if exists public.mfa_recovery_codes;
drop table if exists public.user_mfa;
