-- ============================================================
-- 0039 — Vendor login credentials, held on purpose.
-- ------------------------------------------------------------
-- This deliberately re-opens something 0024 closed (finding C-2), so the
-- reasoning has to be written down rather than inferred from the diff.
--
-- 0020 kept the hand-off password in `restaurants.temp_password`. 0024 dropped
-- it, correctly: `restaurants` is publicly readable BY ROW (the storefront needs
-- it), RLS cannot filter columns, and nothing ever cleared the value — so every
-- vendor's live credential sat in a widely-read table in clear.
--
-- The operator requirement did not go away: Deligro onboards shop owners by
-- phone and in person, hands them a number-and-password login, and the admin is
-- the support desk that has to read it back when they lose it. "Rotate it
-- again" is not free when the vendor is standing in their kitchen mid-service.
--
-- So the credential comes back, but not to `restaurants`:
--
--   * its own table, so no `select *` on a shop can ever return it;
--   * RLS enabled with ZERO policies — anon and authenticated are denied every
--     row even before the grants, which is the fail-closed direction;
--   * every privilege revoked from anon/authenticated, granted only to
--     service_role. Reads therefore only happen through
--     `src/lib/data-access/vendor-credentials.ts`, which is `server-only` and
--     called from paths already gated by `requireRole("admin")`;
--   * `updated_by` records which admin last set it, so the plaintext has an
--     audit trail the old column never had.
--
-- Supabase Auth remains the authority — this row is a copy for hand-off, not
-- the thing that authenticates. Rotating a password writes both.
--
-- Idempotent: safe to re-run.
-- ============================================================

begin;

create table if not exists public.vendor_login_credentials (
  restaurant_id uuid primary key
    references public.restaurants(id) on delete cascade,
  -- The auth user the password actually belongs to. Kept so a re-homed shop
  -- (owner_id changed) does not keep showing the previous owner's credential.
  owner_id      uuid,
  password      text        not null,
  updated_at    timestamptz not null default now(),
  updated_by    uuid references public.profiles(id) on delete set null
);

comment on table public.vendor_login_credentials is
  'Admin-visible copy of a vendor''s hand-off login password. service_role only — see migration 0039 for why this exists at all.';
comment on column public.vendor_login_credentials.password is
  'Plaintext, by design: the admin desk reads it back to the owner over the phone. Never exposed to anon/authenticated.';

create index if not exists vendor_login_credentials_owner_idx
  on public.vendor_login_credentials (owner_id);

-- Deny-all: RLS on, no policies. service_role bypasses RLS entirely; every
-- other role gets zero rows even if a grant were ever added by accident.
alter table public.vendor_login_credentials enable row level security;

revoke all on public.vendor_login_credentials from anon, authenticated;
grant select, insert, update, delete
  on public.vendor_login_credentials to service_role;

-- ------------------------------------------------------------
-- Vendors sign in with mobile + password, so a shop with no email address is a
-- shop whose owner cannot be issued one (Supabase Auth needs an identifier to
-- hang the password on). The app now refuses to save a vendor without an email;
-- this index makes the "is this address already taken" check cheap and flags
-- any duplicate that predates the rule.
-- ------------------------------------------------------------
create index if not exists restaurants_owner_email_idx
  on public.restaurants (lower(owner_email))
  where owner_email is not null;

commit;
