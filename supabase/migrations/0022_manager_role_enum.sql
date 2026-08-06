-- Manager / Sub-Admin role — a scoped operator for on-the-ground operations
-- (place phone-in orders, dispatch riders, move order status) with NO access to
-- finance, system configuration, or vendor management. Those stay admin-only.
--
-- The enum value is added in its OWN migration/transaction on purpose: Postgres
-- forbids USING a new enum label in the same transaction that adds it. Every
-- policy and helper that references 'manager' lives in 0023_manager_rls.sql,
-- which runs only after this migration has committed.
alter type public.user_role add value if not exists 'manager';
