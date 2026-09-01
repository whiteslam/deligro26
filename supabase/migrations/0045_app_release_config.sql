-- ============================================================
-- 0045 — App release config: what version the rider and customer
--        Android apps should be on, and where to get it
-- ------------------------------------------------------------
-- The two Android apps are built outside this repo and distributed as a direct
-- `.apk` link, not through Play. Nothing in the backend has ever told them
-- whether they are out of date, so the only way to move a fleet of riders off a
-- broken build has been to phone them one at a time.
--
-- These eight columns are the whole contract. `GET /api/app-version` reads them
-- and answers "update available / must update / here is the file", which is the
-- only consumer.
--
-- Why `platform_settings` and not a `app_releases` table: this is eight flat
-- fields of single-row config that an admin edits on the Settings screen, which
-- is exactly what that table is. A separate table would need its own RLS, its
-- own grants and its own admin page to say the same thing. It is also already
-- `for select using (true)` with no column-level grant list, which is the
-- exposure this data needs anyway — an app has to ask "am I too old to run?"
-- before it has a session to ask with, so the answer must be public. AGENTS.md
-- rule 1 applies in the other direction here: the columns are public-read the
-- moment they exist, so the check is whether anything here is a secret. A
-- version number and a download URL that ships inside every APK are not.
--
-- Defaults are deliberately `1` and `''`, matching DEFAULT_SETTINGS in
-- `src/lib/settings-defaults.ts`. Any real installed build has a versionCode
-- >= 1, so on an un-migrated or unreadable database every app compares itself
-- against 1, finds it is not behind, and is left alone. The route needs no
-- special case for the fallback because of that: the safe direction for a
-- version gate is to NOT gate, and the defaults land there by themselves.
-- (This is availability, not authorization — AGENTS.md rule 2 governs access
-- control, and force-updating an entire fleet off the back of a failed config
-- read is the harm, not the protection.)
-- ============================================================

alter table public.platform_settings
  add column if not exists rider_apk_version_code        integer not null default 1,
  add column if not exists rider_apk_min_version_code    integer not null default 1,
  add column if not exists rider_apk_url                 text    not null default '',
  add column if not exists rider_apk_notes               text    not null default '',

  add column if not exists customer_apk_version_code     integer not null default 1,
  add column if not exists customer_apk_min_version_code integer not null default 1,
  add column if not exists customer_apk_url              text    not null default '',
  add column if not exists customer_apk_notes            text    not null default '';

-- The minimum supported version can never exceed the latest one. Saving that
-- pair would force every installed app to update to a build that does not
-- exist — an unrecoverable state for a fleet with no Play Store to fall back
-- on, since the APK URL would point at the older release they already have.
-- Also floored at 1 so a 0 or negative code cannot be stored: `versionCode` is
-- a positive integer on the Android side, and 0 would make the "am I behind?"
-- comparison meaningless.
--
-- Named and added idempotently, per 0033 section 7 — `add constraint` has no
-- `if not exists`, so re-running the migration would otherwise fail here.
do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conrelid = 'public.platform_settings'::regclass
       and conname  = 'platform_settings_rider_apk_versions'
  ) then
    alter table public.platform_settings
      add constraint platform_settings_rider_apk_versions
      check (
        rider_apk_version_code >= 1
        and rider_apk_min_version_code >= 1
        and rider_apk_min_version_code <= rider_apk_version_code
      );
  end if;

  if not exists (
    select 1 from pg_constraint
     where conrelid = 'public.platform_settings'::regclass
       and conname  = 'platform_settings_customer_apk_versions'
  ) then
    alter table public.platform_settings
      add constraint platform_settings_customer_apk_versions
      check (
        customer_apk_version_code >= 1
        and customer_apk_min_version_code >= 1
        and customer_apk_min_version_code <= customer_apk_version_code
      );
  end if;
end $$;

comment on column public.platform_settings.rider_apk_version_code is
  'Latest rider APK versionCode. An app below this is offered an update.';
comment on column public.platform_settings.rider_apk_min_version_code is
  'Oldest rider APK versionCode still allowed to run. Below this, forceUpdate.';
comment on column public.platform_settings.rider_apk_url is
  'Direct download URL for the latest rider APK. Empty = no link to offer.';
comment on column public.platform_settings.customer_apk_version_code is
  'Latest customer APK versionCode. An app below this is offered an update.';
comment on column public.platform_settings.customer_apk_min_version_code is
  'Oldest customer APK versionCode still allowed to run. Below this, forceUpdate.';
comment on column public.platform_settings.customer_apk_url is
  'Direct download URL for the latest customer APK. Empty = no link to offer.';

-- ============================================================
-- Re-run the public column allowlist (AGENTS.md rule 1)
-- ------------------------------------------------------------
-- `platform_settings` is NOT plain public-read. 0032 revoked SELECT from
-- anon/authenticated and replaced it with an explicit column grant, so that
-- `vendor_commission_pct` — and, from 0034, `commission_gst_pct` — stay admin
-- only. That allowlist is materialised from `information_schema.columns` at the
-- moment the migration runs, which means it is a SNAPSHOT: every column added
-- afterwards is ungranted until a later migration re-runs the block. 0034 did
-- exactly this, for exactly this reason.
--
-- Without this, the eight columns above exist, the admin form writes them, and
-- `GET /api/app-version` reads through the RLS-scoped client as anon — which
-- cannot see them. `availableGroups()` in `src/lib/data-access/settings.ts`
-- treats a non-missing-column error as transient and drops the group without
-- latching, so the route would answer from `DEFAULT_SETTINGS` forever: every
-- app told it is current, no error anywhere, and the operator watching the
-- Settings screen save successfully with no way to tell. "If a field doesn't
-- appear in the app, that is the guard working" — here it is working against a
-- field that is meant to be public, so the grant is the deliberate part.
--
-- Same shape and same direction of failure as 0032/0034: this enumerates what
-- is PUBLIC, so a column added later is excluded by default rather than
-- exposed by default.
-- ============================================================
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

-- No policy change. "settings — public read" (0015) still grants the row to
-- everyone and "settings — admin write" still restricts every write to
-- is_admin(); what changed is only which COLUMNS of that row anon may read.
--
-- Nothing here is a secret worth withholding: a version number and a download
-- URL both ship inside every APK already, and an app must be able to ask "am I
-- too old to run?" before it has a session to ask with.
