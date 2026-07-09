-- ============================================================
-- Deligro — push notifications (OneSignal, same provider as the legacy site)
--   • profiles.onesignal_id — the browser/device "player id" OneSignal issues
--     per subscriber. We send a push by POSTing these ids to OneSignal's REST
--     API from the server. One id per profile is enough for the web app; the
--     register route overwrites it on each subscribe.
-- The existing "own profile — update" policy (0001) already lets a signed-in
-- user write their own row, and the role-lock trigger still guards role — so no
-- new policy is needed; a customer can save only their own player id.
-- ============================================================

alter table public.profiles
  add column if not exists onesignal_id text;

comment on column public.profiles.onesignal_id is
  'OneSignal player/subscription id for web push. Set by /api/notifications/register.';
