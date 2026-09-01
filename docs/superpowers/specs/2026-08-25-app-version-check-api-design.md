# App version check API — design

Status: **implemented** 2026-08-26 — migration `0045_app_release_config.sql`,
`src/lib/releases/app-version.ts`, `src/app/api/app-version/route.ts`, the
"App releases" card on `/admin/settings/platform`, and
`scripts/qa/app-version.ts` (+ six route cases in `scripts/qa/e2e-smoke.ts`).
Built as designed, with one addition the design did not call for: the APK URL is
**https-only**, enforced both when saved and when served — see "Deviations" at
the foot of this document.

(Approach + contract confirmed in chat 2026-08-25.)

## Goal

The rider and customer Android apps (built separately, outside this repo) need
a way to ask the backend "am I out of date?" and get back whether an update
exists, whether it's mandatory, and where to download it. Today there is no
such endpoint anywhere in this codebase — this adds the backend half of that
contract. The Android client side is out of scope; whoever builds/maintains
those apps implements against the contract below.

## Non-goals

- No Play Store integration. Distribution is a direct `.apk` link.
- No staged rollout percentages, no per-device targeting, no changelog
  history beyond the current release's notes. If that's ever needed it's a
  new spec — YAGNI for now.
- No changes to the native app repos themselves.

## Approach

Extend `platform_settings` (the existing single-row, admin-editable,
publicly-readable config table — see `src/lib/data-access/settings.ts`)
rather than introduce a new table. The settings module already has an
"optional group" pattern (`OPTIONAL_GROUPS` in `settings.ts`) built exactly
for "a later migration adds a few more columns, and older databases that
haven't run it yet should degrade gracefully." Release metadata for two apps
is 8 flat fields — reusing this pattern is less new surface area than a
parallel table + RLS policies + admin page, and this table is already fully
public-read (`for select using (true)`, no column-level grant list), which is
the exposure this data needs anyway since an unauthenticated app has to read
it before any login.

## Data model

Migration `0045_app_release_config.sql` (renumbered from 0043 on merge — the
office branch had already published a 0043 and a 0044), following the style of `0033`
section 7 (adding columns to `platform_settings` behind `if not exists`, with
named check constraints added idempotently):

```sql
alter table public.platform_settings
  add column if not exists rider_apk_version_code    integer not null default 1,
  add column if not exists rider_apk_min_version_code integer not null default 1,
  add column if not exists rider_apk_url              text    not null default '',
  add column if not exists rider_apk_notes            text    not null default '',

  add column if not exists customer_apk_version_code    integer not null default 1,
  add column if not exists customer_apk_min_version_code integer not null default 1,
  add column if not exists customer_apk_url              text    not null default '',
  add column if not exists customer_apk_notes            text    not null default '';
```

Plus check constraints (named, added idempotently in a `do $$ ... $$` block
per the 0033 pattern) enforcing `*_min_version_code <= *_version_code` for
each app — the admin form should not be able to save a minimum-supported
version higher than the latest version, since that would force-update
everyone off a version that doesn't exist yet.

No RLS/grant changes needed: `platform_settings` already has
`for select using (true)` with no column-level grant list, so the new columns
are public-read the same way `business_name` and `support_phone` already are.
Only `is_admin()` may write, unchanged.

## Types & data access

- `PlatformSettings` (`src/types/index.ts`) gains 8 fields:
  `riderApkVersionCode`, `riderApkMinVersionCode`, `riderApkUrl`,
  `riderApkNotes`, and the `customerApk*` equivalents.
- `DEFAULT_SETTINGS` (`settings-defaults.ts`) defaults all four version codes
  to `1` and the URL/notes fields to `""` — matching the DB column defaults,
  so an un-migrated database and the in-code fallback agree exactly (the same
  invariant every other field in this file already holds).
- `settings.ts` gets one new entry in `OPTIONAL_GROUPS` (key
  `platform_settings.rider_apk_version_code`, since all 8 columns arrive in
  the same migration and one probe covers the set), with matching `select`
  and `write` following the existing entries' shape.

## Admin UI

One new `Card` in `src/app/admin/settings/settings-form.tsx`, "App releases,"
with two sub-groups (Rider app / Customer app), each exposing: latest version
code (number input), minimum supported version code (number input), APK URL
(text input), release notes (textarea). Same form, same single submit, same
`saveSettingsAction` — no new server action needed. This is the only place an
operator sets these values; there's no separate "release" workflow, just
editing four fields per app and saving, same as every other setting on this
page.

## Public API

`GET /api/app-version?app=rider|customer&versionCode=<int>`

- Reads through the existing `getSettings()` (which already has the
  fail-fast/fallback semantics `settings.ts` and `SettingsUnavailableError`
  establish).
- Validates `app` is exactly `"rider"` or `"customer"`, and `versionCode` is a
  positive integer. Either failing → `400` with `{ error: "bad_request" }`.
- Response `200`:
  ```json
  {
    "latestVersionCode": 45,
    "minSupportedVersionCode": 40,
    "updateAvailable": true,
    "forceUpdate": false,
    "apkUrl": "https://.../rider-v45.apk",
    "releaseNotes": "Fixes the cash-collection screen crash."
  }
  ```
  `forceUpdate = versionCode < minSupportedVersionCode`.
  `updateAvailable = versionCode < latestVersionCode` (true whenever
  `forceUpdate` is, plus the softer case).
- **Fail-open on settings-read failure, for free.** `getSettings()`
  (`src/lib/settings.ts`) never throws — on an unreadable or unmigrated
  backend it already returns `DEFAULT_SETTINGS`-shaped values (see
  `outageSettings()`). That's why the DB column defaults and
  `DEFAULT_SETTINGS` both pin every `*_version_code` to `1`: any real
  installed app has a `versionCode >= 1`, so in the fallback case
  `versionCode >= latestVersionCode` and `versionCode >= minSupportedVersionCode`
  always hold, and the route naturally computes `updateAvailable: false,
  forceUpdate: false` without any special-case code. The route just calls
  `getSettings()` and computes — no try/catch needed. This is an
  availability decision, not an authorization one; AGENTS.md rule 2 ("never
  fail open") governs access control, and does not apply here — the safe
  direction for a version gate is to not gate. (Contrast with
  `outageSettings()` itself, which deliberately fails *closed* on
  `acceptingOrders` — that's a different field with the opposite safe
  direction, not a precedent to follow here.)
- No rate limiting: this is a read-only, side-effect-free GET with no write
  path behind it, consistent with the platform's other public read routes
  (AGENTS.md rule 6 is scoped to write endpoints).
- No auth required — the app calls this before login exists.

## Error handling summary

| Condition | Response |
|---|---|
| Missing/invalid `app` or `versionCode` | `400 { error: "bad_request" }` |
| Settings unreadable (DB/migration issue) | `200`, all-clear payload (falls back to `DEFAULT_SETTINGS`, version codes default to `1`) |
| Normal read | `200`, computed payload |

## Testing plan

- Unit test for the version-comparison logic (`forceUpdate`/`updateAvailable`
  derivation) — pure function, easy table-driven cases: below min, between
  min and latest, at latest, above latest (shouldn't happen but must not
  crash).
- Route test: valid rider/customer requests, invalid `app` value, non-numeric
  `versionCode`, and a case where `getSettings()` returns the
  `outageSettings()`/`DEFAULT_SETTINGS` fallback (unmigrated or unreadable
  backend) — confirms the route still returns `200` with the all-clear
  payload rather than erroring.
- Manual check: save values in the new admin Settings card, confirm the
  route reflects them immediately (no caching to invalidate — same as every
  other setting).

---

## Deviations from this design, as built

**The APK URL is https-only** (`safeApkUrl` in `src/lib/releases/app-version.ts`).
The design treated the URL as an opaque string. It is not: whatever is at the
end of it gets *installed*, by a phone already configured to accept sideloaded
builds. Over plain http, any network between the rider and the file can return a
different APK and the app has no signal that it did — which makes the update
channel a better attack than the thing it is updating. An http, `javascript:`,
`data:` or relative value is dropped to `""` rather than rejected, so a paste
mistake costs the link and not the rest of the settings form; `updateAvailable`
still travels, so the app can say "an update exists, ask the office" instead of
going silent. Enforced on the way out as well as on the way in, because the
write-side check only covers rows saved after this shipped.

**`min` is clamped to `latest` in three places**, not just the CHECK constraint
the design specified: the constraint, the admin action, and `appVersionAnswer`
itself. A floor above the latest build is the only setting on that page with no
way back — it force-updates every installed app to a release that does not
exist, and hands them the APK they already have. The constraint does not exist
on a pre-0045 database, and the answer is what actually reaches the fleet.

**No unit-test framework was added.** The design's "unit test" is
`scripts/qa/app-version.ts`, table-driven in the style of
`scripts/qa/payments-signature.ts`, and wired into `npm run test:qa`. The route
cases live in `scripts/qa/e2e-smoke.ts`, which already drives a running app.
