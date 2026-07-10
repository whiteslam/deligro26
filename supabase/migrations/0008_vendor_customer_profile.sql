-- Allow restaurant owners to read customer name + phone for orders at their shop.
-- Vendors need this on the kitchen board; scoped to customers with an order
-- at a restaurant they own (not blanket profile access).

create policy "profiles — vendor reads order customers" on public.profiles
  for select
  using (
    exists (
      select 1
      from public.orders o
      where o.customer_id = profiles.id
        and public.owns_restaurant(o.restaurant_id)
    )
  );
