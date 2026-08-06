-- ============================================================
-- 0024 — Security hardening (audit remediation)
-- ------------------------------------------------------------
-- MUST run after 0023_manager_rls.sql. The column-grant block below snapshots
-- the current shape of `restaurants`, so it has to see the final schema; and the
-- order guard has to coexist with the manager policies added there.
--
-- Closes the findings that live in the database rather than the app:
--
--   C-1  restaurants is publicly readable BY ROW, and 0017/0020 added payout,
--        KYC and plaintext-credential columns to it. RLS cannot filter columns,
--        so column privileges must.
--   C-2  restaurants.temp_password held vendors' live login passwords in clear.
--   C-3  "restaurants — owner manage" was FOR ALL, so any signed-in customer
--        could INSERT a self-approved storefront.
--   H-2  "orders — update" granted vendors/drivers UPDATE on every column,
--        including total, customer_id and address.
--   L-1  order_items visibility relied on implicit nested RLS.
--   L-2  reviews exposed user_id to the world.
--   M-4  bump_banner_stat was executable directly by anon.
--
-- Idempotent: safe to re-run. Apply in the Supabase SQL editor, or with
-- `supabase db push`.
-- ============================================================

begin;

-- ============================================================
-- C-2 — drop the plaintext credential column.
-- ------------------------------------------------------------
-- Supabase Auth already stores a bcrypt hash; this was a second, unhashed copy
-- that nothing ever cleared. It is replaced by a timestamp, so the Edit screen
-- can still say when a password was last issued without holding the secret.
-- ============================================================
alter table public.restaurants
  add column if not exists password_reset_at timestamptz;

-- Backfill: any row that had a password issued has had one issued at some point.
update public.restaurants
   set password_reset_at = coalesce(password_reset_at, created_at)
 where password_reset_at is null
   and exists (
     select 1 from information_schema.columns
     where table_schema = 'public'
       and table_name = 'restaurants'
       and column_name = 'temp_password'
   );

alter table public.restaurants drop column if exists temp_password;

-- ============================================================
-- C-1 — column-level SELECT on restaurants.
-- ------------------------------------------------------------
-- `restaurants — read` allows any row where `approved` is true, because the
-- storefront needs it — including to anon, since guests browse. RLS is row
-- scoped, so every column of an approved shop was readable by anyone holding
-- the publishable key, which ships in the browser bundle. The app's own queries
-- select safe columns; an attacker's PostgREST call does not have to.
--
-- Column GRANTs are the matching tool. Note the direction of failure: a column
-- added later gets NO grant and is therefore invisible until someone grants it
-- deliberately. That is the safe default, and it is what stops this recurring.
-- ============================================================
do $$
declare
  safe_cols text;
begin
  select string_agg(quote_ident(column_name), ', ' order by ordinal_position)
    into safe_cols
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'restaurants'
    and column_name not in (
      -- Owner PII
      'owner_email', 'owner_mobile', 'owner_alt_mobile',
      -- Payout details
      'upi_id', 'bank_account_name', 'bank_account_number',
      'bank_ifsc', 'bank_name',
      -- Statutory / KYC identifiers
      'fssai_number', 'gst_number', 'pan_number',
      -- Credential audit
      'password_reset_at'
    );

  execute 'revoke select on public.restaurants from anon, authenticated';
  execute format(
    'grant select (%s) on public.restaurants to anon, authenticated',
    safe_cols
  );
end $$;

-- Admin reads/writes of the restricted columns now go through the service role
-- (see src/lib/data-access/admin-vendors.ts). service_role is unaffected by the
-- revoke above, but be explicit so the intent survives a future audit.
grant select, insert, update, delete on public.restaurants to service_role;

-- ============================================================
-- C-3 — creation and approval are admin-only.
-- ------------------------------------------------------------
-- The old policy was `for all`, which includes INSERT, and checked only that
-- owner_id equalled the caller. Any customer could therefore post a row with
-- approved = true and appear on the live storefront.
-- ============================================================
drop policy if exists "restaurants — owner manage" on public.restaurants;

drop policy if exists "restaurants — admin insert" on public.restaurants;
create policy "restaurants — admin insert" on public.restaurants for insert
  with check (public.is_admin());

drop policy if exists "restaurants — owner update" on public.restaurants;
create policy "restaurants — owner update" on public.restaurants for update
  using (owner_id = auth.uid() or public.is_admin())
  with check (owner_id = auth.uid() or public.is_admin());

drop policy if exists "restaurants — admin delete" on public.restaurants;
create policy "restaurants — admin delete" on public.restaurants for delete
  using (public.is_admin());

-- WITH CHECK cannot see the old row, so the "don't move your own approval"
-- rule needs a trigger. Mirrors lock_role() for profiles.
create or replace function public.lock_restaurant_privileged_fields()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.is_admin()
     or coalesce(auth.jwt() ->> 'role', '') in ('service_role', 'supabase_admin') then
    return new;
  end if;

  if new.approved       is distinct from old.approved
  or new.status         is distinct from old.status
  or new.owner_id       is distinct from old.owner_id
  or new.commission_pct is distinct from old.commission_pct then
    raise exception 'approval, ownership and commission are admin-only';
  end if;

  return new;
end;
$$;

-- Name it so it sorts AFTER restaurants_sync_status: same-timing triggers fire
-- alphabetically, and this must see the status the sync trigger settled on.
drop trigger if exists zz_restaurants_lock_privileged on public.restaurants;
create trigger zz_restaurants_lock_privileged
  before update on public.restaurants
  for each row execute function public.lock_restaurant_privileged_fields();

-- ============================================================
-- H-2 — an order's money, owner and address are not the vendor's to edit.
-- ------------------------------------------------------------
-- "orders — update" correctly scopes WHICH rows a vendor or driver may touch,
-- but grants every COLUMN on those rows. The app layer only ever sets `status`;
-- a vendor calling PostgREST directly could rewrite `total` (the figure
-- recompute_order_total exists to make authoritative) or reassign customer_id.
--
-- This also completes "orders — manager update" from 0023: that policy grants a
-- manager UPDATE on every order so they can move status, which is the stated
-- intent — but the policy alone would let them edit totals too. A manager is not
-- is_admin(), so the guard below holds them to status, which is exactly what
-- 0023's header describes.
-- ============================================================
create or replace function public.guard_order_update()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  -- Everything a vendor or driver may NOT move. `status` is deliberately absent
  -- — that is the one field the kitchen board and the driver app exist to change.
  locked constant text[] := array[
    'id', 'customer_id', 'restaurant_id',
    'total', 'delivery_fee', 'tax_amount', 'tip',
    'address', 'created_at'
  ];
  col     text;
  old_row jsonb := to_jsonb(old);
  new_row jsonb := to_jsonb(new);
begin
  -- Admin and trusted server code (the cancel route, recompute_order_total) are
  -- unrestricted. recompute_order_total is SECURITY DEFINER owned by postgres,
  -- so it passes regardless of who triggered the recompute.
  if public.is_admin()
     or coalesce(auth.jwt() ->> 'role', '') in ('service_role', 'supabase_admin') then
    return new;
  end if;

  foreach col in array locked loop
    -- A column this database doesn't have (e.g. `tip` before 0013) is absent
    -- from both objects and compares equal, so the guard adapts to the schema
    -- rather than erroring on a partially-migrated database.
    if (old_row -> col) is distinct from (new_row -> col) then
      raise exception
        'only order status may be changed by this role (attempted: %)', col;
    end if;
  end loop;

  return new;
end;
$$;

drop trigger if exists orders_guard_update on public.orders;
create trigger orders_guard_update
  before update on public.orders
  for each row execute function public.guard_order_update();

-- ============================================================
-- L-1 — make order_items visibility explicit.
-- ------------------------------------------------------------
-- The old policy read `exists (select 1 from orders o where o.id = order_id)`.
-- That is currently correct only because Postgres applies `orders`' own RLS
-- inside the subquery — an implicit dependency that turns into a full leak the
-- day someone marks a helper SECURITY DEFINER or grants BYPASSRLS. State the
-- intended rule directly instead of inheriting it by accident.
-- ============================================================
drop policy if exists "order_items — read" on public.order_items;
create policy "order_items — read" on public.order_items for select
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_id
        and (
          o.customer_id = auth.uid()
          or public.owns_restaurant(o.restaurant_id)
          or public.is_active_driver_for(o.id)
          or public.is_admin()
        )
    )
  );

-- ============================================================
-- L-2 — reviews are public ratings, not a public identity map.
-- ------------------------------------------------------------
-- `for select using (true)` exposed user_id, letting anyone correlate a person
-- with the restaurants they order from and when. Ratings stay public; the
-- reviewer's id does not.
-- ============================================================
revoke select on public.reviews from anon, authenticated;
grant select (id, order_id, restaurant_id, rating, comment, created_at)
  on public.reviews to anon, authenticated;
grant select on public.reviews to service_role;

-- ============================================================
-- M-4 — banner counters are not an anonymous write API.
-- ------------------------------------------------------------
-- bump_banner_stat is SECURITY DEFINER and was executable by anon, so anyone
-- could inflate impressions/clicks in a loop, straight past /api/banners/track
-- and its new rate limit. Route it through our own server instead.
-- ============================================================
revoke execute on function public.bump_banner_stat(uuid, text) from anon, authenticated;
grant execute on function public.bump_banner_stat(uuid, text) to service_role;

commit;

-- ============================================================
-- POST-MIGRATION — run separately, and read the note first.
-- ------------------------------------------------------------
-- Every vendor password issued before this migration was stored in clear text
-- in a world-readable column. Treat them all as disclosed. Rotate each one from
-- Admin → Vendors → Edit → "Generate new password", or in bulk via the Auth
-- admin API. This query lists who needs it:
--
--   select r.id, r.name, r.owner_email, r.password_reset_at
--     from public.restaurants r
--    where r.password_reset_at < now()
--    order by r.name;
--
-- Verify the column lockdown took effect (should return 0 rows):
--
--   select grantee, privilege_type, column_name
--     from information_schema.column_privileges
--    where table_name = 'restaurants'
--      and grantee in ('anon', 'authenticated')
--      and column_name in ('bank_account_number', 'pan_number', 'owner_email');
-- ============================================================
