-- Phone OTP auth support.
--
-- Custom OTP codes are generated + verified server-side (service role), then a
-- real Supabase session is minted via an admin magic-link token, so the rest of
-- the app (RLS on auth.uid()) is unchanged. This table is service-role only:
-- RLS is enabled with NO policies, so anon/auth clients can never read codes.

create table if not exists public.otp_codes (
  id         uuid primary key default gen_random_uuid(),
  phone      text not null,                 -- E.164, e.g. +919876543210
  code_hash  text not null,                 -- sha256(code + phone + pepper)
  attempts   int  not null default 0,       -- wrong tries; locks after N
  consumed   boolean not null default false,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists otp_codes_phone_idx on public.otp_codes (phone, created_at desc);

alter table public.otp_codes enable row level security;
-- No policies on purpose: only the service-role key (server) may touch this.

-- Ensure profiles.phone is unique-ish for lookup (nullable, so use a partial index).
create unique index if not exists profiles_phone_unique
  on public.profiles (phone) where phone is not null;
