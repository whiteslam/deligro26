-- ============================================================
-- Deligro — manual "featured" ordering for vendors
-- An operator can pin up to ten shops to the top of the customer
-- catalog in a chosen order (1 = first). NULL = unranked, which
-- sorts after every pinned shop, keeping the default feed order.
-- Admin writes go through the existing is_admin() RLS on
-- restaurants; anon reads already see restaurant rows.
-- ============================================================

alter table public.restaurants
  add column if not exists sort_position smallint
    check (sort_position is null or (sort_position between 1 and 10));

-- Small partial index: only the handful of pinned shops are indexed, and the
-- customer feed's "positioned first" read hits it.
create index if not exists restaurants_sort_position_idx
  on public.restaurants (sort_position)
  where sort_position is not null;
