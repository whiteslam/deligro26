-- Real "Popular": rank a restaurant's dishes by what customers actually ordered.
--
-- Until now `menu_items.popular` / `.bestseller` were static flags written once
-- at import (any legacy product carrying a badge), so the Popular tab had no
-- relationship to sales and vendors had no way to understand it. This function
-- is the ranking itself: units sold per dish over a rolling window.
--
-- SECURITY DEFINER because a diner can only see their OWN order rows under RLS,
-- so an invoker-rights query would rank the menu by that one person's basket.
-- The function is the narrow exception: it returns nothing but menu_item_id and
-- a unit count — no customer, no order id, no amount — which is exactly the
-- "popular dishes" fact the storefront already means to publish.
--
-- Cancelled orders don't count. A dish that has been de-listed still counts for
-- its window (order_items keeps a name/price snapshot), but it can't surface in
-- the app because the menu drives the join.

create or replace function public.menu_item_popularity(
  p_restaurant_id uuid,
  p_days int default 30
)
returns table (menu_item_id uuid, units bigint)
language sql
stable
security definer
set search_path = public
as $$
  select oi.menu_item_id, sum(oi.qty)::bigint as units
  from public.order_items oi
  join public.orders o on o.id = oi.order_id
  join public.menu_items mi on mi.id = oi.menu_item_id
  where mi.restaurant_id = p_restaurant_id
    and o.status <> 'cancelled'
    and o.created_at >= now() - make_interval(days => greatest(p_days, 1))
  group by oi.menu_item_id
  order by units desc, oi.menu_item_id;
$$;

revoke all on function public.menu_item_popularity(uuid, int) from public;
grant execute on function public.menu_item_popularity(uuid, int) to anon, authenticated;

-- The join above walks order_items by menu_item_id; without this it's a seq scan
-- on every menu render.
create index if not exists order_items_menu_item_idx
  on public.order_items (menu_item_id);
