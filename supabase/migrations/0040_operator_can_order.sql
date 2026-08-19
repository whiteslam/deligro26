-- ============================================================
-- 0040 — An operator account may place its own orders
-- ------------------------------------------------------------
-- ## The bug
--
-- "orders — customer insert" (0001) reads:
--
--     with check (customer_id = auth.uid() and current_role() = 'customer')
--
-- The owner/developer account (+91 7987265706) is seeded with role = 'admin'
-- by scripts/seed-developer.ts, so every checkout from it was refused by RLS
-- with 42501 and surfaced as
--
--     "This account can't place orders. Sign in with your customer account
--      and try again."
--
-- — advice that account can never act on, because it has no second identity to
-- sign in with. The customer shell was already fixed for this case (see the
-- comment in src/app/(customer)/layout.tsx: the app is for everyone, the
-- portals are what is gated); the database was the last door still shut.
--
-- ## The fix
--
-- Admit 'admin' to the same policy — and only to the same policy. The
-- `customer_id = auth.uid()` half is unchanged and is what keeps this narrow:
-- an admin may place an order *as themselves*, exactly like a customer. They
-- still cannot insert a row attributed to somebody else; the phone-order desk
-- remains the one path that writes an order on another person's behalf, on the
-- service role, stamping `placed_by` (0029 — and its "no manager INSERT
-- policy" reasoning still holds, unchanged, for every role below admin).
--
-- Nothing else about an admin's order is special: `force_order_total_pending`
-- and `guard_order_update` (0030) already exempt admin, and `createOrder()`
-- sends total = 0 and recomputes, so the money is derived the same way it is
-- for a customer.
--
-- Deliberately NOT widened to 'restaurant', 'driver' or 'manager'. A vendor or
-- courier placing an order through the customer app has real consequences for
-- settlement and dispatch attribution, and nobody has asked for it. Those roles
-- keep getting the refusal message above, which for them is true and
-- actionable.
--
-- The read side of this — an admin's /orders screen showing every order on the
-- platform, because "orders — read" grants admin all of them — is fixed in the
-- app rather than here, by asking for `customer_id = me` on the customer
-- surfaces (listMyOrders in src/lib/data-access/orders.ts). RLS is the
-- ceiling; that query is the customer app choosing to stay under it.
-- ============================================================

begin;

drop policy if exists "orders — customer insert" on public.orders;
-- Name kept from 0001 on purpose: 0025 and 0030 both refer to
-- "orders — customer insert" by name in their reasoning.
create policy "orders — customer insert" on public.orders for insert
  with check (
    customer_id = auth.uid()
    and public.current_role() in ('customer', 'admin')
  );

commit;

-- ============================================================
-- POST-MIGRATION — verify.
-- ------------------------------------------------------------
-- 1. The real check is a checkout through the app signed in as the owner's
--    phone. It should reach the order-tracking screen, not the "can't place
--    orders" message.
--
-- 2. An admin still cannot insert an order for someone else (should raise
--    42501 — new row violates row-level security policy):
--
--      insert into public.orders (customer_id, restaurant_id, status, address)
--      values ('<some other customer id>', '<a restaurant>', 'placed', '{}');
--
-- 3. A vendor or driver account still cannot place an order at all (42501):
--
--      insert into public.orders (customer_id, restaurant_id, status, address)
--      values (auth.uid(), '<a restaurant>', 'placed', '{}');
-- ============================================================
