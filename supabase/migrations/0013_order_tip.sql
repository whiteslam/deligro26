-- ============================================================
-- Deligro — the tip is money, so the database has to know about it
--
-- Checkout showed a tip, added it to the amount on the Place-order button, and
-- promised "the courier will get 100% of your tip" — then sent a request body
-- with no tip in it. There was no column to put it in. The customer agreed to
-- one number and the order stored another, and the courier got nothing.
--
-- The tip now lives on the order and is part of the authoritative total, which
-- is recomputed server-side (never trusted from the client) exactly like the
-- item prices and the fees are.
-- ============================================================

alter table public.orders
  add column if not exists tip integer not null default 0 check (tip >= 0);

comment on column public.orders.tip is
  'Courier tip in whole rupees. Included in total by recompute_order_total(); paid out in full to the rider.';

-- Same function as 0002, now with the tip in the sum. Items are still re-read
-- from order_items, so a client still cannot dictate what it pays.
create or replace function public.recompute_order_total(oid uuid)
returns void
language sql security definer set search_path = public as $$
  update public.orders o
  set total = coalesce((
      select sum(oi.qty * oi.price) from public.order_items oi where oi.order_id = oid
    ), 0) + o.delivery_fee + o.tax_amount + o.tip
  where o.id = oid;
$$;
