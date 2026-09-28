-- ============================================================
-- 0052 — Role feature switches: what vendors, managers and riders may use
-- ------------------------------------------------------------
-- The admin decides which of the non-core features each role gets — a vendor's
-- promotions, a manager's phone orders, a rider's delivery history — and can
-- override that for one shop or one person. "Off" means hidden in the app AND
-- refused by the server action behind it; see src/lib/features/.
--
-- One row per switch:
--   * role-wide:  subject_kind = 'role', subject_id NULL
--   * one shop:   subject_kind = 'restaurant', subject_id = restaurants.id
--   * one person: subject_kind = 'profile',    subject_id = profiles.id
-- An account override beats the role-wide row, which beats the default (on).
-- No row at all means "on": an empty table changes nothing, which is also how
-- the app behaves before this migration is applied.
--
-- These are product controls, not the security boundary. Roles and RLS remain
-- that (AGENTS.md "Platform is presentation; roles are the security boundary").
-- Still locked down like 0039: RLS on with no policies, every privilege
-- revoked from anon/authenticated, reached only through server-only code
-- behind requireRole — so a vendor cannot read, let alone flip, their own
-- switches.
--
-- `subject_id` is polymorphic (a shop or a profile), so it carries no FK; the
-- cleanup triggers below remove a switch when its shop or person is deleted.
-- Idempotent: safe to re-run.
-- ============================================================

begin;

create table if not exists public.role_feature_flags (
  id            uuid primary key default gen_random_uuid(),
  role          text        not null check (role in ('vendor', 'manager', 'driver')),
  feature       text        not null check (feature ~ '^[a-z_]+\.[a-z_]+$'),
  subject_kind  text        not null default 'role'
                  check (subject_kind in ('role', 'restaurant', 'profile')),
  subject_id    uuid,
  enabled       boolean     not null,
  updated_at    timestamptz not null default now(),
  updated_by    uuid references public.profiles(id) on delete set null,
  constraint role_feature_flags_subject_shape check (
    (subject_kind = 'role' and subject_id is null)
    or (subject_kind <> 'role' and subject_id is not null)
  )
);

comment on table public.role_feature_flags is
  'Admin switches for vendor/manager/driver features, role-wide or per shop/person. service_role only — see migration 0052.';

-- One switch per (feature, subject). NULLs are distinct in a plain unique
-- constraint, so the role-wide row gets its own partial index.
create unique index if not exists role_feature_flags_role_uq
  on public.role_feature_flags (feature)
  where subject_kind = 'role';
create unique index if not exists role_feature_flags_subject_uq
  on public.role_feature_flags (feature, subject_kind, subject_id)
  where subject_kind <> 'role';
create index if not exists role_feature_flags_subject_idx
  on public.role_feature_flags (subject_kind, subject_id);

alter table public.role_feature_flags enable row level security;
revoke all on public.role_feature_flags from anon, authenticated;
grant select, insert, update, delete on public.role_feature_flags to service_role;

-- Remove a shop's or a person's overrides with them.
create or replace function public.role_feature_flags_cleanup()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.role_feature_flags
   where subject_kind = tg_argv[0] and subject_id = old.id;
  return old;
end;
$$;

drop trigger if exists role_feature_flags_cleanup_restaurant on public.restaurants;
create trigger role_feature_flags_cleanup_restaurant
  after delete on public.restaurants
  for each row execute function public.role_feature_flags_cleanup('restaurant');

drop trigger if exists role_feature_flags_cleanup_profile on public.profiles;
create trigger role_feature_flags_cleanup_profile
  after delete on public.profiles
  for each row execute function public.role_feature_flags_cleanup('profile');

revoke all on function public.role_feature_flags_cleanup() from public, anon, authenticated;

commit;
