-- ============================================================
-- 0042 — Dispatch: offer a pickup to one rider, and say when we told
--        the customer their rider had arrived
-- ------------------------------------------------------------
-- Until now there was no dispatch at all. `deliveries` rows came into being
-- only when a rider tapped Accept, so the whole model was: every order that
-- reaches `ready` is shouted at every rider at once, and the fastest thumb
-- wins. That has three costs the operators were absorbing by hand —
--
--   1. Nobody is told to start moving until the food is already cold on the
--      pass. The kitchen accepts an order twenty minutes before it is ready
--      and no rider hears about it, so the road leg starts from a standing
--      start every time.
--   2. A rider already carrying someone's dinner sees, and can take, a second
--      job — while a rider sitting idle two streets from the shop sees the
--      same card and may not get to it first.
--   3. There is no record anywhere of who was asked, so an order that nobody
--      picked up looks identical to one nobody was offered.
--
-- `offered_driver_id` / `offered_at` are the offer. The row is created when the
-- VENDOR ACCEPTS (status `kitchen`), not when the food is ready: that is the
-- moment there is something useful to tell a rider, and the prep estimate is
-- the useful part of it. It is re-stamped at `ready`, because the best rider
-- twenty minutes later is often not the best rider now.
--
-- The offer is a first refusal, not an assignment. `driver_id` stays NULL until
-- somebody actually accepts, which matters in two places that already read this
-- table: the customer's tracking screen names a rider off `driver_id` (an offer
-- must not put a name and a phone number in front of a customer before that
-- rider has agreed to come), and the admin live board counts an order as
-- covered the same way. Both keep working untouched.
--
-- `arrival_notified_at` is the once-only latch behind the 500 m arrival push.
-- The rider's device reports a position every ten seconds; without somewhere to
-- record that we have already said it, a customer whose courier is parking
-- outside gets the same notification every ten seconds until they are handed
-- their food.
--
-- ## RLS is deliberately NOT extended to the offered rider
--
-- "deliveries — read" (0001) admits `driver_id = auth.uid()`, the owning
-- vendor, and admins. It is tempting to add `or offered_driver_id = auth.uid()`
-- so a rider can read their own offer directly. Don't: once the exclusivity
-- window lapses and a DIFFERENT rider accepts, the row still carries the first
-- rider's id in `offered_driver_id` while `driver_lat`/`driver_lng` now track
-- the second — so that clause would hand rider A a live feed of rider B's
-- position. The driver board reads this table with the service-role client
-- behind `requireRole("driver")` (AGENTS.md §5), so nothing needs the widened
-- policy, and the narrow one cannot leak.
--
-- Idempotent: safe to re-run.
-- ============================================================

begin;

alter table public.deliveries
  add column if not exists offered_driver_id   uuid references public.profiles (id) on delete set null,
  add column if not exists offered_at          timestamptz,
  add column if not exists arrival_notified_at timestamptz;

comment on column public.deliveries.offered_driver_id is
  'Rider dispatch picked for this pickup. A first refusal, NOT an assignment: driver_id stays null until someone accepts, so the customer is never shown a courier who has not agreed to come.';
comment on column public.deliveries.offered_at is
  'When the offer was last made. The exclusivity window (see EXCLUSIVE_OFFER_MS in src/lib/dispatch/rider-dispatch.ts) is measured from here; after it lapses the order opens to every rider.';
comment on column public.deliveries.arrival_notified_at is
  'Set once, when the rider first came within ARRIVAL_RADIUS_M of the drop and the customer was told. The latch that stops a ten-second location ping becoming a ten-second notification.';

-- Dispatch reads "what is offered to me" on every board load.
create index if not exists deliveries_offered_driver_idx
  on public.deliveries (offered_driver_id)
  where offered_driver_id is not null;

-- The offer row exists before anybody has accepted, so it sits at
-- `unassigned` — the enum value 0001 declared as the default and that nothing
-- had ever written until now.
commit;
