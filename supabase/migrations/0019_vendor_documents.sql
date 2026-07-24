-- Vendor Management (Admin Panel) — phase 3: menu extras + legal documents.
--
-- Two things:
--   1. A `discount_price` on menu_items so the menu editor can carry a strike-
--      through price (additive; the customer catalog ignores it until wired).
--   2. A private `vendor-docs` bucket + `vendor_documents` registry for the
--      legal certificates (FSSAI/GST/PAN/shop licence/bank proof). These are
--      sensitive, so the bucket is private and files are served via short-lived
--      signed URLs generated in admin-gated server code.

-- ---------- menu_items.discount_price ----------
alter table public.menu_items
  add column if not exists discount_price integer check (discount_price >= 0);

-- ---------- vendor_documents ----------
create table if not exists public.vendor_documents (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  doc_type      text not null
                  check (doc_type in ('fssai','gst','pan','bank_proof','shop_license','other')),
  storage_path  text not null,   -- object path inside the vendor-docs bucket
  file_name     text not null,   -- original filename, for display/download
  uploaded_by   uuid references public.profiles (id),
  created_at    timestamptz not null default now()
);
create index if not exists vendor_documents_restaurant_idx
  on public.vendor_documents (restaurant_id, created_at desc);

alter table public.vendor_documents enable row level security;

-- A vendor may see its own documents; admins see and manage all. Writes here go
-- through the service-role in admin server code, but the policy keeps a future
-- vendor self-serve upload honest.
drop policy if exists "vendor_documents — read" on public.vendor_documents;
create policy "vendor_documents — read" on public.vendor_documents for select
  using (public.owns_restaurant(restaurant_id) or public.is_admin());

drop policy if exists "vendor_documents — admin manage" on public.vendor_documents;
create policy "vendor_documents — admin manage" on public.vendor_documents for all
  using (public.is_admin())
  with check (public.is_admin());

-- ---------- vendor-docs storage bucket (private) ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'vendor-docs',
  'vendor-docs',
  false, -- private: certificates are read through signed URLs only
  10485760, -- 10 MB
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Admin-only storage access (service-role bypasses these; they gate any
-- non-service client). `create policy` has no IF NOT EXISTS — drop first.
drop policy if exists "vendor_docs_admin_read"   on storage.objects;
drop policy if exists "vendor_docs_admin_insert" on storage.objects;
drop policy if exists "vendor_docs_admin_update" on storage.objects;
drop policy if exists "vendor_docs_admin_delete" on storage.objects;

create policy "vendor_docs_admin_read"
  on storage.objects for select
  using (bucket_id = 'vendor-docs' and public.is_admin());

create policy "vendor_docs_admin_insert"
  on storage.objects for insert
  with check (bucket_id = 'vendor-docs' and public.is_admin());

create policy "vendor_docs_admin_update"
  on storage.objects for update
  using (bucket_id = 'vendor-docs' and public.is_admin());

create policy "vendor_docs_admin_delete"
  on storage.objects for delete
  using (bucket_id = 'vendor-docs' and public.is_admin());
