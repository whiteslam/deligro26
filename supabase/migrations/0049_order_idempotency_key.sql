-- ============================================================
-- 0049 — Idempotency key on orders
-- ------------------------------------------------------------
-- Duplicate-order protection on POST /api/orders used to be entirely
-- client-side: the checkout button disables itself while a request is in
-- flight, and nothing server-side stopped a second POST for the same
-- checkout attempt (a slow/timed-out request the client retries, or a direct
-- repeat call) from creating two real orders. `payments` already dedupes a
-- second "Pay" tap for the same order/amount (findReusablePayment); orders
-- themselves had no equivalent.
--
-- The client now mints one key per checkout attempt (see checkout-view.tsx)
-- and sends it on every attempt of that same submit, including retries.
-- `createOrder` checks for an existing order under (customer, key) before
-- inserting, and the unique index below is the actual guarantee under a race
-- between two concurrent requests carrying the same key — the check is a
-- fast path, the constraint is what makes it correct.
--
-- Nullable and not required: order-creation paths that don't send a key
-- (there are none client-side today, but this must not force one on a future
-- caller) simply get no dedup, same as before this migration. The partial
-- unique index only constrains rows that actually have a key.
--
-- Idempotent: safe to re-run.
-- ============================================================

begin;

alter table public.orders
  add column if not exists idempotency_key text;

comment on column public.orders.idempotency_key is
  'A UUID the client mints once per checkout attempt and resends on every retry of that same attempt. Lets createOrder() recognize "this is the same submit again" instead of placing a second order. Null for any order created without one.';

do $$
begin
  create unique index orders_customer_idempotency_key_idx
    on public.orders (customer_id, idempotency_key)
    where idempotency_key is not null;
exception
  when duplicate_table then null;
end $$;

commit;
