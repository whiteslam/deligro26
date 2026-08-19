-- ============================================================
-- 0037 — Category pictures an admin can replace
-- ------------------------------------------------------------
-- The Home cuisine strip used emoji, plus four "3D icons" that were 1.3–1.9 MB
-- SVGs each — 6.5 MB of tracing to draw four 60px tiles. It now shows a photo
-- per category.
--
-- The photos ship as curated defaults in `src/lib/taxonomy.ts`, so the strip
-- looks right on a fresh install with nothing configured. This table is the
-- override: one row per category id, holding the picture an operator has chosen
-- instead. Empty table = every category on its default, which is the state the
-- feature ships in.
--
-- Why a table rather than a column on platform_settings: categories are a list,
-- and a list belongs in rows. It also means an override is a single upsert and a
-- reset is a single delete, rather than read-modify-write against a JSON blob
-- that two admins could clobber.
--
-- `id` is the category id from FOOD_CATEGORIES ('thali', 'biryani', …), not a
-- uuid, so the join is by meaning and an override for a category that no longer
-- exists is visibly orphaned rather than silently applied to the wrong tile.
--
-- Idempotent: safe to re-run.
-- ============================================================

begin;

create table if not exists public.category_images (
  -- FOOD_CATEGORIES id. Bounded and lowercase by convention; the check keeps a
  -- stray path or URL out of what is meant to be a slug.
  id          text primary key
                check (id ~ '^[a-z0-9-]{2,32}$'),
  image_url   text not null
                check (image_url ~ '^https://'),
  updated_at  timestamptz not null default now(),
  updated_by  uuid references auth.users(id) on delete set null
);

comment on table public.category_images is
  'Per-category picture overrides for the Home cuisine strip. Absent row = the curated default in src/lib/taxonomy.ts.';
comment on column public.category_images.id is
  'Category id from FOOD_CATEGORIES in src/lib/search/dishes.ts.';
comment on column public.category_images.image_url is
  'https only. The CSP img-src allows images.unsplash.com and *.supabase.co — a URL on any other host will be blocked by the browser, not by this constraint.';

alter table public.category_images enable row level security;

-- ============================================================
-- Policies.
-- ------------------------------------------------------------
-- Read: public. These are pictures on the storefront's front page; there is
-- nothing here that is not already visible to anyone who opens the app.
--
-- Write: admin only, and stated as a policy rather than left to the app —
-- AGENTS.md §3/§5. `is_admin()` is the same helper the rest of the schema uses.
-- ============================================================
drop policy if exists "category_images — read" on public.category_images;
create policy "category_images — read" on public.category_images
  for select using (true);

drop policy if exists "category_images — admin write" on public.category_images;
create policy "category_images — admin write" on public.category_images
  for all using (public.is_admin()) with check (public.is_admin());

-- Column-level grants, matching the pattern 0024 established for `restaurants`:
-- name what anon/authenticated may read rather than granting the table and
-- relying on RLS to hide columns it cannot hide. `updated_by` is an operator's
-- user id and is nobody's business on the storefront.
grant select (id, image_url, updated_at) on public.category_images
  to anon, authenticated;
grant insert, update, delete on public.category_images to authenticated;
grant select, insert, update, delete on public.category_images to service_role;

commit;
