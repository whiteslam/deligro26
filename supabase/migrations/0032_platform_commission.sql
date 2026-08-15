-- Platform-wide vendor commission — one rate an admin sets once, inherited by
-- every vendor that has no negotiated rate of its own.
--
-- Before this, `restaurants.commission_pct` was `not null default 0`: the only
-- way to charge 21 vendors the same 18% was to type 18 into 21 forms, and a
-- vendor added later silently defaulted to 0% — i.e. free — until someone
-- noticed. The rate now lives on the settings singleton, and the per-vendor
-- column becomes an *override*: NULL means "use the platform rate".
--
-- Precedence, in one line:  effective = coalesce(restaurants.commission_pct,
--                                                platform_settings.vendor_commission_pct)
--
-- Settlements already snapshot `commission` in rupees at creation time
-- (0028), so changing the rate never rewrites a settlement that has been
-- generated. It applies to the next one.

-- ============================================================
-- 1 — the platform rate.
-- ============================================================
alter table public.platform_settings
  add column if not exists vendor_commission_pct numeric(5,2) not null default 0;

do $$
begin
  alter table public.platform_settings
    add constraint platform_settings_vendor_commission_pct_range
    check (vendor_commission_pct >= 0 and vendor_commission_pct <= 100);
exception
  when duplicate_object then null;
end $$;

comment on column public.platform_settings.vendor_commission_pct is
  'Default commission charged to vendors, whole percent. Overridden per vendor by restaurants.commission_pct when that is non-null. Admin-only: deliberately NOT granted to anon/authenticated.';

-- ============================================================
-- 2 — the settings row is world-readable; this column must not be.
-- ------------------------------------------------------------
-- `settings — public read` is `using (true)` because the customer app needs the
-- delivery fee, the support number and the vertical toggles. RLS filters rows,
-- not columns, so without the grants below every anon holder of the publishable
-- key could read what the platform charges its vendors — a commercial term, not
-- storefront config.
--
-- Same shape as the restaurants grant in 0024, and the same direction of
-- failure: this enumerates what is PUBLIC, so a column added later is invisible
-- until someone grants it on purpose.
-- ============================================================
do $$
declare
  public_cols text;
begin
  select string_agg(quote_ident(column_name), ', ' order by ordinal_position)
    into public_cols
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'platform_settings'
    and column_name not in ('vendor_commission_pct');

  execute 'revoke select on public.platform_settings from anon, authenticated';
  execute format(
    'grant select (%s) on public.platform_settings to anon, authenticated',
    public_cols
  );
end $$;

-- Admin reads/writes of the restricted column go through the service role
-- (src/lib/data-access/admin-commission.ts), which the revoke does not touch.
-- Stated explicitly so the intent survives the next audit.
grant select, insert, update on public.platform_settings to service_role;

-- ============================================================
-- 3 — the per-vendor column becomes an override.
-- ------------------------------------------------------------
-- NULL is the new "not set". The existing zeros are migrated to NULL because
-- under the old schema 0 was ALSO what "never configured" looked like — the
-- column default — so the two are genuinely indistinguishable in the data we
-- have. Reading them as "unset" is what makes the platform rate mean anything;
-- reading them as "deliberately free" would leave the new setting inert.
--
-- This is economically a no-op at the moment it runs: vendor_commission_pct
-- defaults to 0 above, so every vendor's effective rate is 0% immediately
-- before and immediately after. It only starts to bite when an admin sets a
-- platform rate, which is the point at which they are choosing to charge
-- everyone. A vendor that genuinely should stay free is set back to an
-- explicit 0 in the vendor form, which now survives as an override.
-- ============================================================
alter table public.restaurants alter column commission_pct drop not null;

-- `lock_restaurant_privileged_fields` (0024) refuses any write to
-- commission_pct unless the caller is_admin() or carries a service_role claim.
-- A migration run from the SQL editor is neither — it is `postgres`, with no
-- JWT at all — so this backfill raises "approval, ownership and commission are
-- admin-only" without the claim below.
--
-- set_config(..., true) is transaction-local and a DO block is one statement,
-- so the claim is gone the moment this finishes. Deliberately NOT
-- `disable trigger`: if the migration failed midway that would leave the lock
-- switched off on a live table, which is a worse failure than an error.
do $$
begin
  perform set_config('request.jwt.claims', '{"role":"service_role"}', true);
  update public.restaurants set commission_pct = null where commission_pct = 0;
end $$;

comment on column public.restaurants.commission_pct is
  'Negotiated commission override, whole percent. NULL = inherit platform_settings.vendor_commission_pct. Admin-only (see lock_restaurant_privileged_fields).';

-- The 0024 lock already covers this column, and `is distinct from` treats
-- NULL correctly in both directions, so clearing an override stays admin-only.
-- No trigger change needed — asserted here so a reader does not go looking.

-- ============================================================
-- 4 — what we charge a vendor is not storefront data either.
-- ------------------------------------------------------------
-- 0024 restricted restaurants to a safe column list but did not exclude
-- commission_pct, so the per-vendor rate has been readable by anon since then.
-- Every read in the app goes through createAdminClient(); nothing user-scoped
-- selects it, so this revoke costs the app nothing.
-- ============================================================
revoke select (commission_pct) on public.restaurants from anon, authenticated;
