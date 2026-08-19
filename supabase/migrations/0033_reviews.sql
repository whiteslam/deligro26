-- ============================================================
-- Deligro — reviews, properly.
--
-- Migration 0006 created `reviews` with the hard part already right: one row per
-- order (unique order_id), insert gated by RLS to the customer's own *delivered*
-- order. That is the anti-fake-review guarantee, and it is untouched here.
--
-- What 0006 left out, and this adds:
--
--   * a moderation status, so a review can be hidden without being destroyed
--   * sub-ratings, text length limits, and photo attachments
--   * vendor replies (one per review, editable, removable by admin alone)
--   * abuse flags, so a vendor can report a review without being able to erase it
--   * an audit log, so no moderation action is ever applied silently
--   * an aggregate rating that is actually maintained
--
-- ------------------------------------------------------------
-- The aggregate bug this fixes
-- ------------------------------------------------------------
-- `restaurants.rating` / `rating_count` have existed since 0002 with a default of
-- 4.5 / 0 and *nothing has ever written to them*. The customer feed reads those
-- columns; the vendor profile instead called getRestaurantRating(), which averaged
-- every review row in JS. So the feed showed a seeded 4.5 while the vendor's own
-- screen showed their real average, and neither agreed with the other.
--
-- After this migration `restaurants.rating` is the single source of truth,
-- maintained transactionally by a trigger on `reviews`, and the JS averager is
-- deleted. The backfill at the bottom resets the seeded 4.5s: a shop with no
-- reviews reads 0.0 / 0 and the UI must render that as "unrated", never as a
-- score. `rating_count = 0` is the flag for that — it always was.
--
-- ------------------------------------------------------------
-- Statuses deliberately NOT created
-- ------------------------------------------------------------
-- Moderation on this platform is reactive: reviews publish immediately and the
-- queue is fed by flags, not by a submission filter. There is therefore nothing
-- that could ever produce a `pending_moderation` or `hidden_by_system` row, and
-- an enum value no code path can reach is a lie about how the system works. Both
-- are one `alter type ... add value` away if a pre-publish filter ever lands.
-- ============================================================

begin;

-- ============================================================
-- 1 — Review status
-- ============================================================
do $$
begin
  if not exists (select 1 from pg_type where typname = 'review_status') then
    create type public.review_status as enum (
      'published',        -- visible to everyone
      'hidden_by_admin',  -- withheld from the public, still there for disputes
      'removed'           -- soft-deleted; retained for the audit trail only
    );
  end if;
end $$;

-- ============================================================
-- 2 — Extend `reviews`
-- ============================================================
alter table public.reviews
  add column if not exists status public.review_status not null default 'published',

  -- Sub-ratings. All optional: the delivered-order screen asks for one tap, and
  -- demanding four would cost more reviews than the extra detail is worth.
  add column if not exists food_quality        int,
  add column if not exists packaging           int,
  add column if not exists delivery_experience int,
  add column if not exists value_for_money     int,

  -- Storage object paths, not URLs — the bucket may be private and signed later.
  add column if not exists photos text[] not null default '{}',

  add column if not exists updated_at timestamptz not null default now(),
  -- Set only when the customer changes their own words, which is what a reader
  -- needs to know. `updated_at` moves for any change, a hidden flag included.
  add column if not exists edited_at timestamptz;

-- Sub-ratings share the 1–5 domain of the overall rating.
do $$
declare col text;
begin
  foreach col in array array['food_quality','packaging','delivery_experience','value_for_money']
  loop
    if not exists (
      select 1 from pg_constraint
       where conrelid = 'public.reviews'::regclass
         and conname  = 'reviews_' || col || '_range'
    ) then
      execute format(
        'alter table public.reviews add constraint reviews_%s_range
           check (%I is null or %I between 1 and 5)', col, col, col);
    end if;
  end loop;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conrelid = 'public.reviews'::regclass and conname = 'reviews_comment_len'
  ) then
    alter table public.reviews add constraint reviews_comment_len
      check (comment is null or char_length(comment) <= 1000);
  end if;

  if not exists (
    select 1 from pg_constraint
     where conrelid = 'public.reviews'::regclass and conname = 'reviews_photos_max'
  ) then
    alter table public.reviews add constraint reviews_photos_max
      check (coalesce(array_length(photos, 1), 0) <= 5);
  end if;
end $$;

-- The vendor dashboard's list, and the admin queue's sort.
create index if not exists reviews_restaurant_status_idx
  on public.reviews (restaurant_id, status, created_at desc);
create index if not exists reviews_status_created_idx
  on public.reviews (status, created_at desc);
create index if not exists reviews_user_idx
  on public.reviews (user_id, created_at desc);

-- `updated_at` is a fact about the row, so the row maintains it. An app that
-- forgets to set it cannot produce a stale value.
create or replace function public.reviews_touch()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists reviews_touch_trg on public.reviews;
create trigger reviews_touch_trg
  before update on public.reviews
  for each row execute function public.reviews_touch();

-- ============================================================
-- 3 — The maintained aggregate
-- ------------------------------------------------------------
-- `rating_sum` is what makes this incremental. Storing the running total beside
-- the count means a new review is one O(1) UPDATE, not an AVG() over every review
-- the shop ever received — and because the delta is applied by SQL arithmetic on
-- the row (`rating_sum = rating_sum + n`) rather than read-modify-write in app
-- code, two concurrent inserts serialise on the row lock instead of losing one
-- of the two.
-- ============================================================
alter table public.restaurants
  add column if not exists rating_sum integer not null default 0;

create or replace function public.reviews_apply_rating()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  touched uuid[] := '{}';
begin
  -- Withdraw the old contribution, if the old row counted.
  if tg_op in ('UPDATE', 'DELETE') then
    touched := array_append(touched, old.restaurant_id);
    if old.status = 'published' then
      update public.restaurants
         set rating_sum   = greatest(0, rating_sum - old.rating),
             rating_count = greatest(0, rating_count - 1)
       where id = old.restaurant_id;
    end if;
  end if;

  -- Apply the new one, if the new row counts.
  if tg_op in ('INSERT', 'UPDATE') then
    touched := array_append(touched, new.restaurant_id);
    if new.status = 'published' then
      update public.restaurants
         set rating_sum   = rating_sum + new.rating,
             rating_count = rating_count + 1
       where id = new.restaurant_id;
    end if;
  end if;

  -- Re-derive the displayed average for every shop this row touched. Zero when
  -- there are no published reviews: `rating_count = 0` is the "unrated" signal
  -- the UI reads, and inventing a number there is how 0002's 4.5 happened.
  update public.restaurants
     set rating = case
                    when rating_count > 0
                      then round(rating_sum::numeric / rating_count, 1)
                    else 0
                  end
   where id = any(touched);

  return null;
end $$;

drop trigger if exists reviews_rating_trg on public.reviews;
create trigger reviews_rating_trg
  after insert or update or delete on public.reviews
  for each row execute function public.reviews_apply_rating();

-- ============================================================
-- 4 — Vendor replies
-- ------------------------------------------------------------
-- A separate table rather than columns on `reviews`, because a reply has its own
-- author, its own edit history and its own removal — and because the customer's
-- review row must not be writable by the vendor for any reason. Keeping them in
-- one row would have meant granting the vendor UPDATE on `reviews`.
-- ============================================================
create table if not exists public.review_replies (
  id           uuid primary key default gen_random_uuid(),
  review_id    uuid not null unique references public.reviews (id) on delete cascade,
  -- The vendor user who wrote it, for the audit trail. Never shown publicly.
  author_id    uuid not null references public.profiles (id) on delete restrict,
  reply_text   text not null check (char_length(reply_text) between 1 and 1000),
  created_at   timestamptz not null default now(),
  edited_at    timestamptz,
  -- Admin can take down an abusive reply without touching the review it answers.
  removed_at   timestamptz,
  removed_by   uuid references public.profiles (id)
);

create index if not exists review_replies_review_idx
  on public.review_replies (review_id);

alter table public.review_replies enable row level security;

-- Public sees live replies on published reviews, and nothing else.
drop policy if exists "review replies — public read" on public.review_replies;
create policy "review replies — public read" on public.review_replies for select
  using (
    removed_at is null
    and exists (
      select 1 from public.reviews r
       where r.id = review_replies.review_id
         and r.status = 'published'
    )
  );

-- The vendor who owns the restaurant may read and write its replies — insert and
-- update only. No delete: a reply, once public, is taken down by an admin with a
-- reason, not quietly by its author.
drop policy if exists "review replies — vendor read" on public.review_replies;
create policy "review replies — vendor read" on public.review_replies for select
  using (
    exists (
      select 1 from public.reviews r
        join public.restaurants s on s.id = r.restaurant_id
       where r.id = review_replies.review_id
         and s.owner_id = auth.uid()
    )
  );

drop policy if exists "review replies — vendor insert" on public.review_replies;
create policy "review replies — vendor insert" on public.review_replies for insert
  with check (
    author_id = auth.uid()
    and removed_at is null
    and exists (
      select 1 from public.reviews r
        join public.restaurants s on s.id = r.restaurant_id
       where r.id = review_replies.review_id
         and s.owner_id = auth.uid()
         and r.status = 'published'
    )
  );

drop policy if exists "review replies — vendor edit" on public.review_replies;
create policy "review replies — vendor edit" on public.review_replies for update
  using (
    removed_at is null
    and exists (
      select 1 from public.reviews r
        join public.restaurants s on s.id = r.restaurant_id
       where r.id = review_replies.review_id
         and s.owner_id = auth.uid()
    )
  )
  with check (author_id = auth.uid() and removed_at is null);

drop policy if exists "review replies — admin all" on public.review_replies;
create policy "review replies — admin all" on public.review_replies for all
  using (public.is_admin())
  with check (public.is_admin());

-- Same reasoning as L-2 in 0024: the reply text is public, its author's id is
-- not. A vendor account maps to a person, and correlating that person with the
-- shop and the timestamp is exactly what 0024 stopped for reviewers.
revoke select on public.review_replies from anon, authenticated;
grant select (id, review_id, reply_text, created_at, edited_at)
  on public.review_replies to anon, authenticated;
grant insert, update on public.review_replies to authenticated;
grant select, insert, update, delete on public.review_replies to service_role;

-- ============================================================
-- 5 — Abuse flags
-- ------------------------------------------------------------
-- The vendor's only lever over a review they dislike. It reports; it does not
-- remove. One flag per reporter per review, so a vendor cannot manufacture a
-- backlog to pressure the queue.
-- ============================================================
do $$
begin
  if not exists (select 1 from pg_type where typname = 'review_flag_reason') then
    create type public.review_flag_reason as enum (
      'offensive',
      'fake_or_spam',
      'unrelated',
      'personal_info',
      'other'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'review_flag_status') then
    create type public.review_flag_status as enum ('open', 'upheld', 'rejected');
  end if;
end $$;

create table if not exists public.review_flags (
  id           uuid primary key default gen_random_uuid(),
  review_id    uuid not null references public.reviews (id) on delete cascade,
  reported_by  uuid not null references public.profiles (id) on delete restrict,
  reason       public.review_flag_reason not null,
  notes        text check (notes is null or char_length(notes) <= 500),
  status       public.review_flag_status not null default 'open',
  resolved_by  uuid references public.profiles (id),
  resolved_at  timestamptz,
  created_at   timestamptz not null default now(),
  unique (review_id, reported_by)
);

create index if not exists review_flags_status_idx
  on public.review_flags (status, created_at);
create index if not exists review_flags_review_idx
  on public.review_flags (review_id);

alter table public.review_flags enable row level security;

-- A vendor may raise a flag on a review of their own restaurant, and read the
-- flags they raised (so they can see the outcome). Nobody else's.
drop policy if exists "review flags — reporter read" on public.review_flags;
create policy "review flags — reporter read" on public.review_flags for select
  using (reported_by = auth.uid() or public.is_admin());

drop policy if exists "review flags — vendor insert" on public.review_flags;
create policy "review flags — vendor insert" on public.review_flags for insert
  with check (
    reported_by = auth.uid()
    and status = 'open'
    and resolved_by is null
    and resolved_at is null
    and exists (
      select 1 from public.reviews r
        join public.restaurants s on s.id = r.restaurant_id
       where r.id = review_flags.review_id
         and s.owner_id = auth.uid()
    )
  );

-- Resolution is an admin act. A reporter cannot mark their own flag upheld.
drop policy if exists "review flags — admin resolve" on public.review_flags;
create policy "review flags — admin resolve" on public.review_flags for all
  using (public.is_admin())
  with check (public.is_admin());

revoke select on public.review_flags from anon, authenticated;
grant select (id, review_id, reported_by, reason, notes, status, resolved_at, created_at)
  on public.review_flags to authenticated;
grant insert on public.review_flags to authenticated;
grant select, insert, update, delete on public.review_flags to service_role;

-- ============================================================
-- 6 — Moderation audit log
-- ------------------------------------------------------------
-- Append-only by policy: there is no UPDATE or DELETE policy for anyone, admins
-- included, so the log cannot be edited through the API by any role that goes
-- through RLS. A record of who hid what and why is worthless if the person who
-- hid it can rewrite it.
-- ============================================================
do $$
begin
  if not exists (select 1 from pg_type where typname = 'review_moderation_action') then
    create type public.review_moderation_action as enum (
      'hidden',
      'restored',
      'removed',
      'reply_removed',
      'flag_upheld',
      'flag_rejected'
    );
  end if;
end $$;

create table if not exists public.review_moderation_log (
  id         uuid primary key default gen_random_uuid(),
  review_id  uuid not null references public.reviews (id) on delete cascade,
  action     public.review_moderation_action not null,
  actor_id   uuid not null references public.profiles (id) on delete restrict,
  -- Not nullable on purpose: "why" is the entire value of this table.
  reason     text not null check (char_length(reason) between 1 and 500),
  created_at timestamptz not null default now()
);

create index if not exists review_moderation_log_review_idx
  on public.review_moderation_log (review_id, created_at desc);
create index if not exists review_moderation_log_created_idx
  on public.review_moderation_log (created_at desc);

alter table public.review_moderation_log enable row level security;

drop policy if exists "moderation log — admin read" on public.review_moderation_log;
create policy "moderation log — admin read" on public.review_moderation_log for select
  using (public.is_admin());

drop policy if exists "moderation log — admin append" on public.review_moderation_log;
create policy "moderation log — admin append" on public.review_moderation_log for insert
  with check (public.is_admin() and actor_id = auth.uid());

revoke all on public.review_moderation_log from anon, authenticated;
grant select, insert on public.review_moderation_log to authenticated;
grant select, insert on public.review_moderation_log to service_role;

-- ============================================================
-- 7 — Operator-tunable review policy
-- ------------------------------------------------------------
-- These two columns come BEFORE the window functions in section 8, not after.
-- `review_window_open` / `review_edit_open` are `language sql`, and Postgres
-- validates a SQL function's body at CREATE time (check_function_bodies is on
-- by default), unlike plpgsql. Defining them first fails with
-- `42703: column "review_window_days" does not exist`.
-- ============================================================
alter table public.platform_settings
  add column if not exists review_window_days integer not null default 14,
  add column if not exists review_edit_window_hours integer not null default 48;

do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conrelid = 'public.platform_settings'::regclass
       and conname  = 'platform_settings_review_window_days_range'
  ) then
    alter table public.platform_settings
      add constraint platform_settings_review_window_days_range
      check (review_window_days between 1 and 365);
  end if;

  if not exists (
    select 1 from pg_constraint
     where conrelid = 'public.platform_settings'::regclass
       and conname  = 'platform_settings_review_edit_window_range'
  ) then
    alter table public.platform_settings
      add constraint platform_settings_review_edit_window_range
      check (review_edit_window_hours between 0 and 720);
  end if;
end $$;

-- ============================================================
-- 8 — Reviews: read policies now respect moderation
-- ------------------------------------------------------------
-- 0006's `for select using (true)` predates there being anything to hide. With a
-- status column it would publish hidden reviews, so it is replaced by four
-- policies that OR together to the same thing for the public case.
--
-- The INSERT policy from 0006 — own, delivered order only — is deliberately left
-- exactly as it is. It is the guarantee that a review is tied to a real order.
-- ============================================================
drop policy if exists "reviews — read" on public.reviews;

drop policy if exists "reviews — public read published" on public.reviews;
create policy "reviews — public read published" on public.reviews for select
  using (status = 'published');

-- The author sees their own review whatever its status, so a hidden one shows up
-- in "My reviews" wearing its status instead of silently disappearing.
drop policy if exists "reviews — author read own" on public.reviews;
create policy "reviews — author read own" on public.reviews for select
  using (user_id = auth.uid());

-- Defence in depth. The vendor dashboard reads through a role-gated service-role
-- path (it needs the reviewer's name, which authenticated is not granted), so
-- this policy is a backstop rather than the route — but it fails closed.
drop policy if exists "reviews — vendor read own restaurant" on public.reviews;
create policy "reviews — vendor read own restaurant" on public.reviews for select
  using (
    exists (
      select 1 from public.restaurants s
       where s.id = reviews.restaurant_id
         and s.owner_id = auth.uid()
    )
  );

drop policy if exists "reviews — admin read" on public.reviews;
create policy "reviews — admin read" on public.reviews for select
  using (public.is_admin());

-- ------------------------------------------------------------
-- Both windows are enforced HERE, not in the app.
-- ------------------------------------------------------------
-- The obvious implementation is an app-layer check in the data-access module,
-- and it would be wrong: `anon`/`authenticated` hold the publishable key, so any
-- customer can talk to PostgREST directly and never execute our TypeScript. An
-- app-only window is a suggestion. AGENTS.md rule 1 — RLS is the real boundary.
--
-- Reading the durations out of platform_settings keeps them operator-tunable
-- without a migration, and `coalesce` pins the documented default if the
-- singleton row is ever missing.
--
-- `review_started_at` is the delivery moment. There is no `orders.delivered_at`
-- (0026 added accepted_at / ready_at only), so it comes from the delivery row,
-- degrading to ready_at then created_at. Every fallback is EARLIER than the real
-- delivery, so a missing timestamp closes the window sooner rather than leaving
-- it open — failing closed, per AGENTS.md rule 2.
-- ------------------------------------------------------------
create or replace function public.review_window_open(p_order_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select now() < coalesce(d.delivered_at, o.ready_at, o.created_at)
                 + make_interval(days =>
                     coalesce((select review_window_days
                                 from public.platform_settings where id = true), 14))
    from public.orders o
    left join public.deliveries d on d.order_id = o.id
   where o.id = p_order_id;
$$;

comment on function public.review_window_open(uuid) is
  'True while an order is still inside the review submission window (platform_settings.review_window_days).';

create or replace function public.review_edit_open(p_created_at timestamptz)
returns boolean language sql stable security definer set search_path = public as $$
  select now() < p_created_at
                 + make_interval(hours =>
                     coalesce((select review_edit_window_hours
                                 from public.platform_settings where id = true), 48));
$$;

comment on function public.review_edit_open(timestamptz) is
  'True while a review is still editable by its author (platform_settings.review_edit_window_hours).';

revoke execute on function public.review_window_open(uuid) from anon;
revoke execute on function public.review_edit_open(timestamptz) from anon;
grant execute on function public.review_window_open(uuid) to authenticated, service_role;
grant execute on function public.review_edit_open(timestamptz) to authenticated, service_role;

-- Replaces 0006's insert policy, preserving its delivered-order check verbatim
-- and adding the submission window plus an explicit refusal on cancelled orders.
drop policy if exists "reviews — owner insert" on public.reviews;
create policy "reviews — owner insert" on public.reviews for insert
  with check (
    user_id = auth.uid()
    and status = 'published'
    and exists (
      select 1 from public.orders o
       where o.id = order_id
         and o.customer_id = auth.uid()
         and o.status = 'delivered'
    )
    and public.review_window_open(order_id)
  );

-- The author may edit or withdraw their own words inside the edit window. They
-- may never touch somebody else's review, and never edit their way out of a
-- moderation decision — hence `status = 'published'` on both sides.
drop policy if exists "reviews — author edit own" on public.reviews;
create policy "reviews — author edit own" on public.reviews for update
  using (
    user_id = auth.uid()
    and status = 'published'
    and public.review_edit_open(created_at)
  )
  with check (
    user_id = auth.uid()
    and status = 'published'
    and public.review_edit_open(created_at)
  );

drop policy if exists "reviews — author delete own" on public.reviews;
create policy "reviews — author delete own" on public.reviews for delete
  using (
    user_id = auth.uid()
    and status = 'published'
    and public.review_edit_open(created_at)
  );

drop policy if exists "reviews — admin write" on public.reviews;
create policy "reviews — admin write" on public.reviews for update
  using (public.is_admin())
  with check (public.is_admin());

-- Re-grant the readable column list, extended with everything added above.
-- `user_id` stays absent: L-2 in 0024 removed it so nobody could correlate a
-- person with the shops they order from, and that reasoning has not changed.
-- The vendor and admin surfaces read the name over service_role instead.
revoke select on public.reviews from anon, authenticated;
grant select (
  id, order_id, restaurant_id, rating, comment, created_at,
  status, food_quality, packaging, delivery_experience, value_for_money,
  photos, updated_at, edited_at
) on public.reviews to anon, authenticated;
grant update (
  rating, comment, food_quality, packaging, delivery_experience,
  value_for_money, photos, edited_at
) on public.reviews to authenticated;
grant delete on public.reviews to authenticated;
grant select, insert, update, delete on public.reviews to service_role;

-- ============================================================
-- 9 — Backfill the aggregate
-- ------------------------------------------------------------
-- Two statements rather than one UPDATE…FROM, because a join only touches
-- matching rows and the whole point is to zero the shops that have *no* reviews.
-- This is what resets 0002's seeded 4.5s.
--
-- Visible consequence, intended: every shop without a real review now reads
-- 0.0 / 0 instead of 4.5. Any UI that renders `rating` without first checking
-- `rating_count > 0` will show "0.0" where it used to show a fabricated score —
-- the search screen's "Rating 4.5+" filter and "Top rated" sort are the two
-- places that need to treat count = 0 as unranked rather than as zero.
-- ============================================================
update public.restaurants
   set rating_sum = 0, rating_count = 0, rating = 0;

update public.restaurants r
   set rating_sum   = agg.total,
       rating_count = agg.n,
       rating       = round(agg.total::numeric / agg.n, 1)
  from (
    select restaurant_id, sum(rating)::int as total, count(*)::int as n
      from public.reviews
     where status = 'published'
     group by restaurant_id
  ) agg
 where r.id = agg.restaurant_id;

commit;
