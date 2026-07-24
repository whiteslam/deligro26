-- ============================================================
-- Deligro — production vendor menu: sort order + menu images
-- ============================================================

alter table public.menu_items
  add column if not exists sort_order integer not null default 0;

create index if not exists menu_items_restaurant_sort_idx
  on public.menu_items (restaurant_id, sort_order, name);

-- Public bucket for dish photos: path = {restaurant_id}/{filename}
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'menu-images',
  'menu-images',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "menu images — public read" on storage.objects;
create policy "menu images — public read"
  on storage.objects for select
  using (bucket_id = 'menu-images');

drop policy if exists "menu images — owner insert" on storage.objects;
create policy "menu images — owner insert"
  on storage.objects for insert
  with check (
    bucket_id = 'menu-images'
    and auth.role() = 'authenticated'
    and public.owns_restaurant((storage.foldername(name))[1]::uuid)
  );

drop policy if exists "menu images — owner update" on storage.objects;
create policy "menu images — owner update"
  on storage.objects for update
  using (
    bucket_id = 'menu-images'
    and public.owns_restaurant((storage.foldername(name))[1]::uuid)
  )
  with check (
    bucket_id = 'menu-images'
    and public.owns_restaurant((storage.foldername(name))[1]::uuid)
  );

drop policy if exists "menu images — owner delete" on storage.objects;
create policy "menu images — owner delete"
  on storage.objects for delete
  using (
    bucket_id = 'menu-images'
    and public.owns_restaurant((storage.foldername(name))[1]::uuid)
  );
