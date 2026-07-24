-- Multi-factor auth: per-user state + recovery codes.
--
-- IMPORTANT: the TOTP secret itself is NOT stored here. Supabase Auth owns it
-- (auth.mfa_factors), along with the challenge/verify lifecycle and the session
-- assurance level (aal1 → aal2). Duplicating the secret in our schema would
-- weaken it, so we only persist what Supabase does not: an auditable record of
-- when MFA was toggled, and hashed fallback recovery codes.
--
-- Role policy (who is FORCED to use MFA) lives in code — `MFA_REQUIRED_ROLES` in
-- src/lib/auth/mfa.ts — so the proxy and every portal layout can enforce it
-- without a database round trip. Admin = mandatory; restaurant/driver = optional.

-- ---------- user_mfa: per-user enrollment state (audit + display mirror) ----------
-- `enabled` mirrors "has a verified Supabase factor". It is NOT the enforcement
-- source of truth (Supabase's assurance level is) — a client that flipped it
-- could not thereby pass a challenge. It drives the settings toggle's label and
-- records when the user opted in/out.
create table if not exists public.user_mfa (
  user_id     uuid primary key references public.profiles (id) on delete cascade,
  enabled     boolean not null default false,
  enrolled_at timestamptz,
  disabled_at timestamptz,
  updated_at  timestamptz not null default now()
);

alter table public.user_mfa enable row level security;
-- Owner (and admin) may read; all writes go through the service role in server
-- actions, so there is deliberately no client insert/update policy.
drop policy if exists "user_mfa — owner read" on public.user_mfa;
create policy "user_mfa — owner read" on public.user_mfa for select
  using (user_id = auth.uid() or public.is_admin());

-- ---------- mfa_recovery_codes: single-use fallbacks, stored HASHED ----------
-- Never plaintext. Each code is SHA-256'd before insert; verification hashes the
-- input and compares. `used_at` set once = burned.
create table if not exists public.mfa_recovery_codes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  code_hash  text not null,
  used_at    timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists mfa_recovery_codes_user_idx
  on public.mfa_recovery_codes (user_id) where used_at is null;

alter table public.mfa_recovery_codes enable row level security;
-- Owner may see their remaining count; the codes themselves are only ever
-- returned in plaintext once, at generation time. Writes are service-role only.
drop policy if exists "recovery — owner read" on public.mfa_recovery_codes;
create policy "recovery — owner read" on public.mfa_recovery_codes for select
  using (user_id = auth.uid());
