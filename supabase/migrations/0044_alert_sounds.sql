-- Admin-configurable "new order" alert sound, one setting per role (vendor
-- kitchen board, rider board), platform-wide — not per-shop or per-rider.
--
-- A role's sound is either one of four built-in presets (synthesized in the
-- browser, nothing stored here to represent them beyond their name) or an
-- uploaded file; `*_url` set is what means "custom", not a separate flag —
-- see src/lib/alerts/tones.ts, which is the other half of this contract.

alter table public.platform_settings
  add column if not exists vendor_alert_sound_preset text not null default 'chime',
  add column if not exists vendor_alert_sound_url     text,
  add column if not exists vendor_alert_sound_name    text,

  add column if not exists rider_alert_sound_preset text not null default 'chime',
  add column if not exists rider_alert_sound_url     text,
  add column if not exists rider_alert_sound_name    text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conrelid = 'public.platform_settings'::regclass
       and conname  = 'platform_settings_vendor_alert_preset_check'
  ) then
    alter table public.platform_settings
      add constraint platform_settings_vendor_alert_preset_check
      check (vendor_alert_sound_preset in ('chime', 'beep', 'alarm', 'bell'));
  end if;

  if not exists (
    select 1 from pg_constraint
     where conrelid = 'public.platform_settings'::regclass
       and conname  = 'platform_settings_rider_alert_preset_check'
  ) then
    alter table public.platform_settings
      add constraint platform_settings_rider_alert_preset_check
      check (rider_alert_sound_preset in ('chime', 'beep', 'alarm', 'bell'));
  end if;
end $$;

-- ---------- alert-sounds storage bucket (public read) ----------
-- Public so the kitchen/rider boards can play the file directly from its
-- stored URL. Writes are admin-only; the upload route runs on the
-- service-role client, which bypasses these — they exist to keep any
-- non-service client honest, same reasoning as vendor-logos (0020).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'alert-sounds',
  'alert-sounds',
  true,
  3145728, -- 3 MB — an alert tone, not a soundtrack
  array['audio/mpeg', 'audio/wav', 'audio/ogg']
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "alert_sounds_public_read"  on storage.objects;
drop policy if exists "alert_sounds_admin_insert" on storage.objects;
drop policy if exists "alert_sounds_admin_update" on storage.objects;
drop policy if exists "alert_sounds_admin_delete" on storage.objects;

create policy "alert_sounds_public_read"
  on storage.objects for select
  using (bucket_id = 'alert-sounds');

create policy "alert_sounds_admin_insert"
  on storage.objects for insert
  with check (bucket_id = 'alert-sounds' and public.is_admin());

create policy "alert_sounds_admin_update"
  on storage.objects for update
  using (bucket_id = 'alert-sounds' and public.is_admin());

create policy "alert_sounds_admin_delete"
  on storage.objects for delete
  using (bucket_id = 'alert-sounds' and public.is_admin());
