-- ============================================================
-- 0053 — Release hardening before the app delivery (28 Sept 2026 audit)
-- ------------------------------------------------------------
-- 1. guard_order_update: restores 0041's version (security INVOKER, the
--    current_user exemption, the full locked list) and adds 'cancelled_by'
--    from 0051. 0051 as written made the guard SECURITY DEFINER and dropped
--    the current_user exemption — the exact 2026-08-13 incident (every
--    checkout 500s because recompute_order_total's own update is refused) —
--    and unlocked channel/placed_by/coupon_code/discount/discount_funded_by,
--    so a vendor or rider could rewrite who funded a discount and be paid
--    more at settlement. Safe to run whether or not 0051 is applied.
-- 2. orders INSERT by a user JWT: status forced to 'placed', provenance and
--    lifecycle stamps cleared (0041 already pins total/discount; 0025 pins
--    payment_status).
-- 3. order_items INSERT by a user JWT: only into your own order while it is
--    'placed', only available items from that order's restaurant, and the
--    price AND name are re-derived from menu_items — client values ignored.
--    After any insert the order total is recomputed (3b).
-- 4. recompute_order_total: only the order's customer (while 'placed'),
--    an admin, or the service role may run it.
-- 5. profiles.phone: changeable only by the service role / admin (the app
--    writes it with the service client after OTP succeeds).
-- 6. check_rate_limit: service role only (anon could fill any bucket and lock
--    an admin or vendor out of login).
-- Idempotent: safe to re-run.
-- ============================================================

begin;

-- 1 ----------------------------------------------------------
create or replace function public.guard_order_update()
returns trigger
language plpgsql security invoker set search_path = public as $$
declare
  locked constant text[] := array[
    'id', 'customer_id', 'restaurant_id',
    'total', 'delivery_fee', 'tax_amount', 'tip',
    'address', 'created_at',
    'payment_method', 'payment_status',
    'accepted_at', 'ready_at', 'cancelled_at',
    'channel', 'placed_by',
    'coupon_code', 'discount',
    'discount_funded_by',
    'cancelled_by'
  ];
  col     text;
  old_row jsonb := to_jsonb(old);
  new_row jsonb := to_jsonb(new);
begin
  if public.is_admin()
     or coalesce(auth.jwt() ->> 'role', '') in ('service_role', 'supabase_admin')
     or current_user in ('postgres', 'supabase_admin') then
    return new;
  end if;

  foreach col in array locked loop
    -- A column this database doesn't have is absent from both objects and
    -- compares equal, so this works before and after 0051.
    if (old_row -> col) is distinct from (new_row -> col) then
      raise exception
        'only order status may be changed by this role (attempted: %)', col;
    end if;
  end loop;

  return new;
end;
$$;

-- 2 ----------------------------------------------------------
create or replace function public.force_order_total_pending()
returns trigger
language plpgsql security invoker set search_path = public as $$
begin
  if public.is_admin()
     or coalesce(auth.jwt() ->> 'role', '') in ('service_role', 'supabase_admin')
     or current_user in ('postgres', 'supabase_admin') then
    return new;
  end if;

  new.total              := 0;
  new.discount           := 0;
  new.coupon_code        := null;
  new.discount_funded_by := null;
  -- 0053: a customer's own insert is always a fresh order from the app.
  new.status             := 'placed';
  new.channel            := 'app';
  new.placed_by          := null;
  new.accepted_at        := null;
  new.ready_at           := null;
  new.cancelled_at       := null;
  return new;
end;
$$;

-- 3 ----------------------------------------------------------
-- SECURITY INVOKER on purpose: a definer function runs as postgres, which
-- would make the current_user exemption true for everyone.
create or replace function public.guard_order_item_insert()
returns trigger
language plpgsql security invoker set search_path = public as $$
declare
  o record;
  m record;
begin
  if public.is_admin()
     or coalesce(auth.jwt() ->> 'role', '') in ('service_role', 'supabase_admin')
     or current_user in ('postgres', 'supabase_admin') then
    return new;
  end if;

  select customer_id, restaurant_id, status into o
    from public.orders where id = new.order_id;
  if not found or o.customer_id is distinct from auth.uid() or o.status <> 'placed' then
    raise exception 'order_items: you can only add items to your own new order';
  end if;

  select name, price, discount_price, available into m
    from public.menu_items
   where id = new.menu_item_id and restaurant_id = o.restaurant_id;
  if not found then
    raise exception 'order_items: item is not on this restaurant''s menu';
  end if;
  if m.available is not true then
    raise exception 'order_items: item is sold out';
  end if;

  if new.qty is null or new.qty < 1 then
    raise exception 'order_items: qty must be at least 1';
  end if;

  -- Same rule as effectivePrice() in src/lib/utils/cart.ts.
  new.price := case
    when m.discount_price is null or m.discount_price < 0 or m.discount_price >= m.price
      then m.price
    else m.discount_price
  end;
  -- The kitchen reads order_items.name: it must be the dish actually priced.
  new.name := m.name;
  return new;
end;
$$;

drop trigger if exists order_items_guard_insert on public.order_items;
create trigger order_items_guard_insert
  before insert on public.order_items
  for each row execute function public.guard_order_item_insert();

-- 3b. Keep the total true to the items. Without this a customer could add
-- correctly-priced items to their own 'placed' order after checkout, and the
-- rider would still collect (and settlement bill) the old total.
create or replace function public.order_items_recompute_total()
returns trigger
language plpgsql security invoker set search_path = public as $$
declare
  oid uuid;
begin
  for oid in select distinct order_id from inserted loop
    perform public.recompute_order_total(oid);
  end loop;
  return null;
end;
$$;

drop trigger if exists order_items_recompute_total on public.order_items;
create trigger order_items_recompute_total
  after insert on public.order_items
  referencing new table as inserted
  for each statement execute function public.order_items_recompute_total();

-- 4 ----------------------------------------------------------
create or replace function public.recompute_order_total(oid uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not (
    public.is_admin()
    or coalesce(auth.jwt() ->> 'role', '') in ('service_role', 'supabase_admin')
    or exists (
      select 1 from public.orders
       where id = oid and customer_id = auth.uid() and status = 'placed'
    )
  ) then
    raise exception 'recompute_order_total: not allowed for this order';
  end if;

  update public.orders o
     set total = greatest(0, coalesce((
         select sum(oi.qty * oi.price) from public.order_items oi where oi.order_id = oid
       ), 0) + o.delivery_fee + o.tax_amount + o.tip - o.discount)
   where o.id = oid;
end;
$$;

-- 5 ----------------------------------------------------------
create or replace function public.guard_profile_phone()
returns trigger
language plpgsql security invoker set search_path = public as $$
begin
  if new.phone is distinct from old.phone
     and not (
       public.is_admin()
       or coalesce(auth.jwt() ->> 'role', '') in ('service_role', 'supabase_admin')
       or current_user in ('postgres', 'supabase_admin')
     ) then
    raise exception 'profiles.phone can only be changed through a verified OTP';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_guard_phone on public.profiles;
create trigger profiles_guard_phone
  before update on public.profiles
  for each row execute function public.guard_profile_phone();

-- 6 ----------------------------------------------------------
revoke execute on function public.check_rate_limit(text, int, bigint) from public, anon, authenticated;
grant execute on function public.check_rate_limit(text, int, bigint) to service_role;

commit;
