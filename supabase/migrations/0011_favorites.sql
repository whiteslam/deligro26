-- Favourite restaurants — the heart on the restaurant hero.
--
-- Per-user and RLS-scoped, like addresses: a row exists only if that user saved
-- that restaurant, so the primary key is the pair. Deleting either side removes
-- the favourite rather than leaving a dangling one.

create table if not exists public.favorites (
  user_id       uuid not null references public.profiles (id) on delete cascade,
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  created_at    timestamptz not null default now(),
  primary key (user_id, restaurant_id)
);
create index if not exists favorites_user_idx on public.favorites (user_id);

alter table public.favorites enable row level security;
drop policy if exists "favorites — owner all" on public.favorites;
create policy "favorites — owner all" on public.favorites for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
