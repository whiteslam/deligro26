-- ============================================================
-- Deligro — legacy order import key
-- Idempotent imports of the MySQL `orders` table use external_id
-- = 'legacy-<id>' so re-runs update instead of duplicating.
-- ============================================================

alter table public.orders
  add column if not exists external_id text;

create unique index if not exists orders_external_id_idx
  on public.orders (external_id)
  where external_id is not null;

comment on column public.orders.external_id is
  'Stable import key (e.g. legacy-50). Null for orders placed in-app.';
