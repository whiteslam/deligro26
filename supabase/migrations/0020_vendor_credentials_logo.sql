-- Vendor Management (Admin Panel) — phase 4: onboarding polish.
--
-- Three additive things the registration/edit flow now needs:
--   1. `restaurants.temp_password` — the last one-time login password an admin
--      issued for this vendor, kept so it can be re-shown in the Edit screen
--      (admins hand it off manually). It is deliberately admin-visible plaintext:
--      a convenience credential for a not-yet-onboarded vendor, rotated by the
--      "Generate new password" button and meant to be cleared once the vendor
--      signs in and sets their own. Only admins (and the owner) can read the row.
--   2. `restaurants.owner_phone_verified` — whether the owner's mobile has been
--      confirmed via OTP (during registration or later from Edit). Non-blocking.
--   3. A public `vendor-logos` bucket for the shop logo uploaded in the wizard.

-- ---------- restaurants: credential + verification columns ----------
alter table public.restaurants
  add column if not exists temp_password        text,
  add column if not exists owner_phone_verified boolean not null default false;

-- ---------- vendor-logos storage bucket (public read) ----------
-- Public so the stored URL renders directly on the storefront (like avatars and
-- menu-images). Writes are admin-only; the wizard uploads through admin-gated
-- server code on the service-role client, which bypasses these policies — they
-- exist to keep any non-service client honest.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'vendor-logos',
  'vendor-logos',
  true,
  5242880, -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- `create policy` has no IF NOT EXISTS — drop first to stay re-runnable.
drop policy if exists "vendor_logos_public_read"  on storage.objects;
drop policy if exists "vendor_logos_admin_insert" on storage.objects;
drop policy if exists "vendor_logos_admin_update" on storage.objects;
drop policy if exists "vendor_logos_admin_delete" on storage.objects;

create policy "vendor_logos_public_read"
  on storage.objects for select
  using (bucket_id = 'vendor-logos');

create policy "vendor_logos_admin_insert"
  on storage.objects for insert
  with check (bucket_id = 'vendor-logos' and public.is_admin());

create policy "vendor_logos_admin_update"
  on storage.objects for update
  using (bucket_id = 'vendor-logos' and public.is_admin());

create policy "vendor_logos_admin_delete"
  on storage.objects for delete
  using (bucket_id = 'vendor-logos' and public.is_admin());
