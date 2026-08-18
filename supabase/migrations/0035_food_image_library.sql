-- ============================================================
-- 0035 — Central food image library
-- ------------------------------------------------------------
-- One photo of Chicken Biryani, uploaded once by the platform, reused by every
-- vendor who sells it. Before this each shop uploaded its own, so a catalogue
-- of 21 vendors carried 21 photos of the same dish at 21 different qualities.
--
-- The matching problem is the whole point. "Biryani" is not a dish, it is a
-- family: Chicken, Egg, Veg, Mutton and Paneer Biryani are five different
-- photos, and a naive LIKE '%biryani%' hands back whichever one sorted first.
-- So the row stores a normalised keyword array (dish words + qualifier words,
-- synonyms already expanded) which the app filters on with an overlap operator,
-- and ranks with the qualifier rules in src/lib/images/match.ts.
--
-- Why an array and not a tsvector or an embedding:
--   * `keywords && ARRAY[...]` with a GIN index is one index scan and returns
--     the whole biryani family — which is what the "pick the right one" picker
--     needs to show anyway.
--   * The decisive part of the match is a CONFLICT rule (chicken must never
--     match veg), and conflict is not something similarity ranking expresses.
--     A vector search will happily rank Veg Biryani second for "Chicken
--     Biryani"; this refuses it outright. See match.ts.
--
-- Idempotent: safe to re-run.
-- ============================================================

begin;

create table if not exists public.food_images (
  id           uuid primary key default gen_random_uuid(),

  -- What the photo is of, as a person would say it: "Chicken Biryani".
  title        text not null,
  description  text,

  image_url    text not null,
  -- Path inside the `food-library` bucket, so deleting the row can delete the
  -- object. Null for a row pointing at an external URL.
  storage_path text,

  -- Normalised, synonym-expanded match tokens. Written by the app
  -- (src/lib/images/match.ts → keywordsFor), never typed by hand.
  keywords     text[] not null default '{}',

  -- Free-text labels an admin added on top ("festival", "north indian").
  -- Searchable, but they do not participate in dish matching.
  tags         text[] not null default '{}',

  -- null = not stated. Used as a tie-breaker and to keep a veg dish from
  -- picking up a photo with meat in it.
  veg          boolean,

  created_at   timestamptz not null default now(),
  created_by   uuid references public.profiles (id) on delete set null,

  constraint food_images_title_not_blank check (btrim(title) <> '')
);

create index if not exists food_images_keywords_idx
  on public.food_images using gin (keywords);

create index if not exists food_images_tags_idx
  on public.food_images using gin (tags);

create index if not exists food_images_created_idx
  on public.food_images (created_at desc);

-- Same photo, uploaded twice, is a picker showing the operator a duplicate to
-- choose between. Titles are compared case- and space-insensitively.
create unique index if not exists food_images_title_unique
  on public.food_images (lower(btrim(title)));

-- ------------------------------------------------------------
-- Which library photo a menu item is using.
-- ------------------------------------------------------------
-- `menu_items.image_url` stays the single source of truth for what renders —
-- every existing reader keeps working untouched. This column only records
-- WHERE that URL came from, which is what lets the editor say "matched
-- automatically, change it?" instead of silently owning the choice.
--
-- ON DELETE SET NULL, not CASCADE: deleting a library photo must not blank a
-- vendor's menu. The item keeps the URL it had; only the provenance is lost.
alter table public.menu_items
  add column if not exists image_library_id uuid
  references public.food_images (id) on delete set null;

create index if not exists menu_items_image_library_idx
  on public.menu_items (image_library_id);

comment on column public.menu_items.image_library_id is
  'Which food_images row this item''s photo came from, or NULL when a vendor uploaded their own. Provenance only — image_url is what renders.';

-- ============================================================
-- RLS — read is public, write is admin.
-- ------------------------------------------------------------
-- The customer app renders these photos, so anon must be able to read them.
-- There is nothing sensitive on the row: a title, a public URL and some
-- keywords. Writes go through the service role from
-- src/lib/data-access/food-images.ts after requireRole('admin').
-- ============================================================
alter table public.food_images enable row level security;

drop policy if exists "food_images — public read" on public.food_images;
create policy "food_images — public read" on public.food_images
  for select using (true);

revoke insert, update, delete on public.food_images from anon, authenticated;
grant select on public.food_images to anon, authenticated;
grant select, insert, update, delete on public.food_images to service_role;

-- ============================================================
-- Storage — the library bucket.
-- ------------------------------------------------------------
-- Public read (the photos are rendered in the customer app), and NO insert /
-- update / delete policy for anon or authenticated at all: uploads ride the
-- service-role client from an admin-gated route, exactly like `vendor-logos`.
-- A bucket whose write policy is "authenticated" is a free image host.
-- ============================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'food-library',
  'food-library',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "food library — public read" on storage.objects;
create policy "food library — public read"
  on storage.objects for select
  using (bucket_id = 'food-library');

commit;
