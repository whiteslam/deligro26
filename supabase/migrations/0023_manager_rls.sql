-- Manager / Sub-Admin RLS.
--
-- These are ADDITIVE, permissive policies: Postgres ORs permissive policies
-- together, so they widen access for managers without touching (or having to
-- reproduce) any existing admin/owner/customer policy. A manager gains a scoped
-- operational slice only.
--
-- Granted to managers:
--   * profiles      — read (show customer names on orders; look a caller up)
--   * orders        — read all + update status (operational)
--   * order_items   — read (audit-sensitive, granted explicitly)
--   * deliveries    — read + assign/manage (dispatch riders)
--
-- Deliberately NOT granted (remain is_admin()-only):
--   * platform_settings write   (fees, radius, commission, feature flags)
--   * refunds decide            (financial)
--   * restaurants / menu_items  (vendor management)
--   * direct order INSERT       (phone orders are placed via a service-role
--                                path, so no manager INSERT policy on orders)

create or replace function public.is_manager()
returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select role = 'manager' from public.profiles where id = auth.uid()),
    false
  );
$$;

-- ---------- profiles ----------
drop policy if exists "profiles — manager read" on public.profiles;
create policy "profiles — manager read" on public.profiles for select
  using (public.is_manager());

-- ---------- orders ----------
drop policy if exists "orders — manager read" on public.orders;
create policy "orders — manager read" on public.orders for select
  using (public.is_manager());

drop policy if exists "orders — manager update" on public.orders;
create policy "orders — manager update" on public.orders for update
  using (public.is_manager()) with check (public.is_manager());

-- ---------- order_items ----------
drop policy if exists "order_items — manager read" on public.order_items;
create policy "order_items — manager read" on public.order_items for select
  using (public.is_manager());

-- ---------- deliveries ----------
drop policy if exists "deliveries — manager read" on public.deliveries;
create policy "deliveries — manager read" on public.deliveries for select
  using (public.is_manager());

drop policy if exists "deliveries — manager manage" on public.deliveries;
create policy "deliveries — manager manage" on public.deliveries for all
  using (public.is_manager()) with check (public.is_manager());
