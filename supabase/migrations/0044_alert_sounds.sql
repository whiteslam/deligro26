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

-- ---------- re-run the public column allowlist ----------
-- `platform_settings` is NOT plain public-read, despite the `using (true)`
-- policy in 0015. Migration 0032 revoked SELECT from anon/authenticated and
-- replaced it with an explicit COLUMN grant so `vendor_commission_pct` stays
-- admin-only; 0034 re-ran the same block to also exclude `commission_gst_pct`.
--
-- That allowlist is materialised from `information_schema.columns` at the
-- moment it runs, so it is a SNAPSHOT: the six columns added above are
-- ungranted until something re-runs it. Without this block the vendor kitchen
-- board and the rider board — which read these through `getSettings()` on the
-- RLS-scoped client, as `authenticated` — cannot see them.
--
-- The failure is silent, not loud. An ungranted column denies with SQLSTATE
-- 42501, and `isMissingColumn()` (src/lib/data-access/schema-probe.ts) matches
-- 42703 only, so `availableGroups()` treats it as transient, drops the group
-- without latching, and `getSettings()` serves DEFAULT_SETTINGS for these
-- fields forever. An admin would upload a custom sound, hear it play from the
-- Test button (which plays the form's own URL client-side), save successfully
-- — and no vendor or rider would ever hear anything but the default chime.
--
-- Verified by replaying 0015 -> 0032 -> 0034 -> 0044 on a throwaway Postgres:
-- before this block the grant count stays at 20 and `authenticated` is denied
-- 42501 on `vendor_alert_sound_preset` while `business_name` still reads.
--
-- Same shape as 0032/0034: this enumerates what is PUBLIC, so a column added
-- later is excluded by default rather than exposed by default. Nothing added
-- here is sensitive — a preset name, a public bucket URL, and the original
-- filename of the upload.
do $$
declare
  public_cols text;
begin
  select string_agg(quote_ident(column_name), ', ' order by ordinal_position)
    into public_cols
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'platform_settings'
    and column_name not in ('vendor_commission_pct', 'commission_gst_pct');

  execute 'revoke select on public.platform_settings from anon, authenticated';
  execute format(
    'grant select (%s) on public.platform_settings to anon, authenticated',
    public_cols
  );
end $$;

grant select, insert, update on public.platform_settings to service_role;

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
