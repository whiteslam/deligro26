# Deligro Role Apps (Android APK + iOS PWA) — Client Delivery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver four installable Deligro apps — Customer, Vendor, Rider, Manager — as signed Android APKs plus iOS home-screen web apps, all loading the live site, with the release-blocking security holes closed first.

**Architecture:** Each Android app is a thin Capacitor shell whose WebView loads one role's entry path on `https://deligrodelivery.ractrotech.com`. The four shells are generated and built by one Node script from one `roles.json`, so they cannot drift. A small native `DeligroPush` plugin gives the shells real Android push (the web OneSignal SDK does not work inside a WebView). iOS gets per-role web manifests so "Add to Home Screen" from each portal installs that role's app. Admin stays website-only.

**Tech Stack:** Next.js 16 (existing site), Supabase Postgres (migrations), Capacitor (latest major; Android), OneSignal Android SDK 5, JDK 21, Android SDK (platform + build-tools matching the Capacitor template), Node 22 `node:test` for script tests, existing `scripts/qa/*.ts` (run via `npx tsx`) for web tests.

**Spec:** No separate spec document. The owner's decisions (28 Sept 2026) are recorded verbatim in "Inputs & decisions" below, and the audit findings this plan acts on are in "Why these blockers".

---

## Inputs & decisions (owner, 28 Sept 2026)

| Decision | Value |
|---|---|
| Apps needing an APK | Customer, Vendor, Rider, Manager. **Admin is website only — no app.** |
| Android build | APK (Capacitor shell loading the live site) |
| iOS | PWA / home-screen web app per role (no App Store build) |
| Distribution | **Signed APK files first**; Play Store later, not in this plan |
| Live site | `https://deligrodelivery.ractrotech.com` (verified 28 Sept: Vercel, all portal logins return 200) |
| Scope | **No new features.** Only what's needed to ship the apps + release blockers |

**Owner inputs still needed (Task 0):** the package names and signing keystores of the two existing Android APKs (customer + rider) built outside this repo, if the client's phones must upgrade in place. Without them the new apps get new package names and users uninstall the old ones once.

## Global Constraints

- Production URL: `https://deligrodelivery.ractrotech.com` — the only host the shells load and navigate within.
- Role entry paths: customer `/`, vendor `/vendor`, rider `/driver`, manager `/manager`.
- Default Android application IDs (used only if Task 0 supplies none): customer `com.ractrotech.deligro`, vendor `com.ractrotech.deligro.partner`, rider `com.ractrotech.deligro.rider`, manager `com.ractrotech.deligro.manager`.
- App names: `Deligro`, `Deligro Partner`, `Deligro Rider`, `Deligro Manager`.
- First release: versionCode `1`, versionName `1.0.0` for every app (unless Task 0 says an existing app is already at a higher versionCode — then use that + 1).
- JDK 21. Android `minSdk`/`compileSdk`/`targetSdk`: whatever `npx cap add android` generates for the installed Capacitor major — do not hand-edit.
- `.env.local` points at the **LIVE production database.** No step in this plan may run a write against it from this machine. Migrations are applied by the owner in the Supabase SQL editor (Task 3).
- Signing keystore lives **outside the repo** (`%USERPROFILE%\deligro-keys\deligro-release.jks`) and is never committed. Losing it means no app can ever be updated in place — back it up (Task 7).
- No new product features. No analytics, referral, multi-city or store-listing work.
- Repo rules in `AGENTS.md` apply (role checks on every server action, `createAdminClient` only behind an authorization check, docs must match behaviour).
- `master` is pushed to **both** remotes: `git push origin master && git push ractro master` (AGENTS.md).

## Why these blockers (from the 28 Sept audit)

Only items that would make the delivered apps unsafe or broken are in this plan:

1. `next@16.3.0` has a critical published CVE (image optimiser RCE) → upgrade.
2. A customer can insert `orders`/`order_items` rows directly over the Supabase REST API with invented prices or `status='delivered'` (RLS allows the insert; nothing re-prices items) → DB triggers.
3. Unapplied migration `0051` regresses `guard_order_update` (back to `security definer`, drops the `current_user` exemption and the coupon/discount locks) → applying it as-is would break every checkout with a 500 and let vendors/riders edit discounts → corrected guard in 0053.
4. `profiles.phone` can be changed without OTP over the REST API → account-capture path → DB trigger + server-side phone write.
5. `check_rate_limit()` is callable by anonymous users → anyone could lock admins/vendors out of login → revoke.

Everything else from the audit (performance, SEO, code duplication, Play Store compliance) is **deferred** — see the end of this plan.

## Review Focus

1. **Login survives an app restart.** Kill the app from recents, reopen → still signed in on the same role screen (WebView cookies must persist). Test in Task 9 for every app.
2. **Signing out in an app stops that phone getting the previous person's pushes** (shared phones in kitchens). Native `logout()` must run. Test in Task 6 and Task 9.
3. **No network at launch shows the Deligro offline page with Retry, not a blank or Chrome error screen.** Test in Task 9.
4. **`tel:`, Google Maps and WhatsApp links open outside the app, and Back returns to the app.** Test in Task 9 (rider Call/Navigate, customer Help → WhatsApp).
5. **Permission prompts work inside the WebView:** location (rider reporting, customer "Use my location") and file picker (vendor photo upload). Test in Task 9.

---

## File Structure

| Path | Responsibility |
|---|---|
| `package.json`, `package-lock.json`, `pnpm-lock.yaml` | Next upgrade (Task 1) |
| `supabase/migrations/0053_release_hardening.sql` | All DB-side blockers in one migration (Task 2) |
| `src/lib/data-access/profile.ts` | Phone change written with the service client after OTP (Task 2) |
| `docs/delivery/MIGRATIONS-RUNBOOK.md` | Owner's apply-and-verify steps (Task 3) |
| `src/lib/pwa/role-manifest.ts` | Pure builder: role → web manifest (Task 4) |
| `src/app/manifests/[role]/route.ts` | Serves `/manifests/<role>` (Task 4) |
| `src/app/vendor/layout.tsx`, `src/app/driver/layout.tsx`, `src/app/manager/layout.tsx` | Point each portal at its manifest + iOS title (Task 4) |
| `src/proxy.ts` | Let `/manifests/*` through without a session (Task 4) |
| `scripts/qa/role-manifest.ts` | Tests for Task 4 |
| `src/lib/native/bridge.ts` | Detect the Capacitor shell; reach the `DeligroPush` plugin (Task 5) |
| `src/components/notifications/onesignal-init.tsx` | Use native push inside the shell, web push otherwise (Task 5) |
| `scripts/qa/native-bridge.ts` | Tests for Task 5 |
| `mobile/roles.json` | The four apps' identity (one source of truth) (Task 6) |
| `mobile/scripts/lib.mjs` | Pure helpers: capacitor config, file patches (Task 6) |
| `mobile/scripts/lib.test.mjs` | `node:test` tests for `lib.mjs` (Task 6) |
| `mobile/scripts/build-apk.mjs` | Generate/sync/build/sign one or all apps (Task 7) |
| `mobile/native/DeligroPushPlugin.java` | Native OneSignal login/logout/permission (Task 6) |
| `mobile/native/offline.html` | Shell's no-network page (Task 6) |
| `mobile/apps/<role>/**` | Generated Capacitor projects (committed after first generation) (Task 8) |
| `mobile/README.md` | How to build, sign, version, release (Task 7) |
| `docs/delivery/INSTALL.md` | Client-facing install guide: Android APK + iOS home screen (Task 10) |
| `.gitignore` | Keystores, build outputs, `mobile/dist` (Task 6) |

---

### Task 0: Collect owner inputs (no code)

**Files:** none (answers go into `mobile/roles.json` in Task 6).

- [ ] **Step 1: Ask the owner for the existing APKs' identity**

Ask exactly:
> "Do you have the **package name** (e.g. `com.something.app`) and the **signing keystore + passwords** used for the current customer and rider APKs? If yes, send them; the new apps will then update the old ones in place. If no, the new apps install as new apps and the old ones must be uninstalled once."

- [ ] **Step 2: Record the answer**

If supplied: note the package names and existing versionCodes; the keystore must be copied to `%USERPROFILE%\deligro-keys\` (never into the repo). If not supplied: use the defaults in Global Constraints.

---

### Task 1: Upgrade Next.js past the critical CVE

**Files:**
- Modify: `package.json` (`"next"` → `"16.3.6"`), `package-lock.json`, `pnpm-lock.yaml`

**Interfaces:** none.

- [ ] **Step 1: Confirm the vulnerability is present (failing check)**

Run: `cd F:/deligro26/deligro && npm audit --omit=dev`
Expected: lists `next` (critical, GHSA-2xp9-vwfh-vxw4) and `sharp` (high).

- [ ] **Step 2: Upgrade**

```bash
cd F:/deligro26/deligro
npm install next@16.3.6 --save-exact
npm audit fix --omit=dev
pnpm install --lockfile-only
```

- [ ] **Step 3: Verify audit is clean at high**

Run: `npm audit --omit=dev --audit-level=high`
Expected: exit 0, no high/critical.

- [ ] **Step 4: Verify the app still builds and checks pass**

```bash
NEXT_TELEMETRY_DISABLED=1 npx next build
npx tsc --noEmit
npm run lint
npm run test:role-features && npm run test:service-area && npm run test:driver-app && npm run test:sw && npm run test:obs
```
Expected: build succeeds; tsc clean; lint 0 errors; every suite `0 failed`.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json pnpm-lock.yaml
git commit -m "chore(deps): next 16.3.6 + audit fixes (critical image-optimizer CVE)"
```

---

### Task 2: Migration 0053 — close the release-blocking DB holes

**Files:**
- Create: `supabase/migrations/0053_release_hardening.sql`
- Modify: `src/lib/data-access/profile.ts` (phone write)
- Test: verification SQL (run by owner in Task 3) + `scripts/qa/release-hardening.ts` (static checks)

**Interfaces:**
- Produces: DB functions `public.guard_order_update()` (restored), `public.force_order_total_pending()` (extended), `public.guard_order_item_insert()`, `public.recompute_order_total(uuid)` (ownership-checked), `public.guard_profile_phone()`; triggers `order_items_guard_insert`, `profiles_guard_phone`.

- [ ] **Step 1: Write the static test that fails first**

Create `scripts/qa/release-hardening.ts`:

```ts
/**
 * QA — migration 0053 carries every release-blocking fix, and none of the
 * mistakes 0051 reintroduced. Static: reads the SQL, no database.
 * Usage: npx tsx scripts/qa/release-hardening.ts
 */
import { readFileSync } from "node:fs";

const sql = readFileSync("supabase/migrations/0053_release_hardening.sql", "utf8");
const profileTs = readFileSync("src/lib/data-access/profile.ts", "utf8");

let passed = 0;
let failed = 0;
function check(name: string, ok: boolean) {
  if (ok) { passed++; console.log(`  ok   ${name}`); }
  else { failed++; console.log(`  FAIL ${name}`); }
}

const guard = sql.slice(sql.indexOf("function public.guard_order_update"), sql.indexOf("$$;", sql.indexOf("function public.guard_order_update")));
check("guard_order_update is security invoker", /security invoker/.test(guard));
check("guard_order_update keeps the current_user exemption", /current_user in \('postgres', 'supabase_admin'\)/.test(guard));
for (const col of ["channel", "placed_by", "coupon_code", "discount", "discount_funded_by", "cancelled_by", "total", "payment_status"]) {
  check(`guard_order_update locks '${col}'`, guard.includes(`'${col}'`));
}
check("order insert pins status to placed", /new\.status\s*:=\s*'placed'/.test(sql));
check("order_items insert trigger exists", /create trigger order_items_guard_insert/.test(sql));
check("order_items price is re-derived from menu_items", /new\.price\s*:=/.test(sql) && /from public\.menu_items/.test(sql));
check("order_items guard is security invoker (definer would void the exemption)", /function public\.guard_order_item_insert\(\)[\s\S]*?security invoker/.test(sql));
check("recompute_order_total checks ownership", /function public\.recompute_order_total[\s\S]*?customer_id = auth\.uid\(\)/.test(sql));
check("profiles.phone trigger exists", /create trigger profiles_guard_phone/.test(sql));
check("check_rate_limit revoked from anon + authenticated", /revoke execute on function public\.check_rate_limit\(text, int, bigint\) from public, anon, authenticated/.test(sql));
check("profile.ts writes phone with the service client", /createAdminClient\(\)[\s\S]*?\.update\(\{\s*phone/.test(profileTs));

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
```

- [ ] **Step 2: Run it — must fail**

Run: `npx tsx scripts/qa/release-hardening.ts`
Expected: FAIL (the migration file does not exist → `ENOENT`).

- [ ] **Step 3: Write the migration**

Create `supabase/migrations/0053_release_hardening.sql`:

```sql
-- ============================================================
-- 0053 — Release hardening before the app delivery (28 Sept 2026 audit)
-- ------------------------------------------------------------
-- 1. guard_order_update: restores 0041's version (security INVOKER, the
--    current_user exemption, the full locked list) and adds 'cancelled_by'
--    from 0051. 0051 as written made the guard SECURITY DEFINER and dropped
--    the current_user exemption — the exact 2026-08-13 incident (every
--    checkout 500s because recompute_order_total's own update is refused) —
--    and unlocked channel/placed_by/coupon_code/discount/discount_funded_by,
--    so a vendor or rider could rewrite who funded a discount and be paid
--    more at settlement. Safe to run whether or not 0051 is applied.
-- 2. orders INSERT by a user JWT: status forced to 'placed', provenance and
--    lifecycle stamps cleared (0041 already pins total/discount; 0025 pins
--    payment_status).
-- 3. order_items INSERT by a user JWT: only into your own order while it is
--    'placed', only items from that order's restaurant, and the price is
--    re-derived from menu_items — a client-supplied price is ignored.
-- 4. recompute_order_total: only the order's customer (while 'placed'),
--    an admin, or the service role may run it.
-- 5. profiles.phone: changeable only by the service role / admin (the app
--    writes it with the service client after OTP succeeds).
-- 6. check_rate_limit: service role only (anon could fill any bucket and lock
--    an admin or vendor out of login).
-- Idempotent: safe to re-run.
-- ============================================================

begin;

-- 1 ----------------------------------------------------------
create or replace function public.guard_order_update()
returns trigger
language plpgsql security invoker set search_path = public as $$
declare
  locked constant text[] := array[
    'id', 'customer_id', 'restaurant_id',
    'total', 'delivery_fee', 'tax_amount', 'tip',
    'address', 'created_at',
    'payment_method', 'payment_status',
    'accepted_at', 'ready_at', 'cancelled_at',
    'channel', 'placed_by',
    'coupon_code', 'discount',
    'discount_funded_by',
    'cancelled_by'
  ];
  col     text;
  old_row jsonb := to_jsonb(old);
  new_row jsonb := to_jsonb(new);
begin
  if public.is_admin()
     or coalesce(auth.jwt() ->> 'role', '') in ('service_role', 'supabase_admin')
     or current_user in ('postgres', 'supabase_admin') then
    return new;
  end if;

  foreach col in array locked loop
    -- A column this database doesn't have is absent from both objects and
    -- compares equal, so this works before and after 0051.
    if (old_row -> col) is distinct from (new_row -> col) then
      raise exception
        'only order status may be changed by this role (attempted: %)', col;
    end if;
  end loop;

  return new;
end;
$$;

-- 2 ----------------------------------------------------------
create or replace function public.force_order_total_pending()
returns trigger
language plpgsql security invoker set search_path = public as $$
begin
  if public.is_admin()
     or coalesce(auth.jwt() ->> 'role', '') in ('service_role', 'supabase_admin')
     or current_user in ('postgres', 'supabase_admin') then
    return new;
  end if;

  new.total              := 0;
  new.discount           := 0;
  new.coupon_code        := null;
  new.discount_funded_by := null;
  -- 0053: a customer's own insert is always a fresh order from the app.
  new.status             := 'placed';
  new.channel            := 'app';
  new.placed_by          := null;
  new.accepted_at        := null;
  new.ready_at           := null;
  new.cancelled_at       := null;
  return new;
end;
$$;

-- 3 ----------------------------------------------------------
-- SECURITY INVOKER on purpose: a definer function runs as postgres, which
-- would make the current_user exemption true for everyone.
create or replace function public.guard_order_item_insert()
returns trigger
language plpgsql security invoker set search_path = public as $$
declare
  o record;
  m record;
begin
  if public.is_admin()
     or coalesce(auth.jwt() ->> 'role', '') in ('service_role', 'supabase_admin')
     or current_user in ('postgres', 'supabase_admin') then
    return new;
  end if;

  select customer_id, restaurant_id, status into o
    from public.orders where id = new.order_id;
  if not found or o.customer_id is distinct from auth.uid() or o.status <> 'placed' then
    raise exception 'order_items: you can only add items to your own new order';
  end if;

  select price, discount_price into m
    from public.menu_items
   where id = new.menu_item_id and restaurant_id = o.restaurant_id;
  if not found then
    raise exception 'order_items: item is not on this restaurant''s menu';
  end if;

  if new.qty is null or new.qty < 1 then
    raise exception 'order_items: qty must be at least 1';
  end if;

  -- Same rule as effectivePrice() in src/lib/utils/cart.ts.
  new.price := case
    when m.discount_price is null or m.discount_price < 0 or m.discount_price >= m.price
      then m.price
    else m.discount_price
  end;
  return new;
end;
$$;

drop trigger if exists order_items_guard_insert on public.order_items;
create trigger order_items_guard_insert
  before insert on public.order_items
  for each row execute function public.guard_order_item_insert();

-- 4 ----------------------------------------------------------
create or replace function public.recompute_order_total(oid uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not (
    public.is_admin()
    or coalesce(auth.jwt() ->> 'role', '') in ('service_role', 'supabase_admin')
    or exists (
      select 1 from public.orders
       where id = oid and customer_id = auth.uid() and status = 'placed'
    )
  ) then
    raise exception 'recompute_order_total: not allowed for this order';
  end if;

  update public.orders o
     set total = greatest(0, coalesce((
         select sum(oi.qty * oi.price) from public.order_items oi where oi.order_id = oid
       ), 0) + o.delivery_fee + o.tax_amount + o.tip - o.discount)
   where o.id = oid;
end;
$$;

-- 5 ----------------------------------------------------------
create or replace function public.guard_profile_phone()
returns trigger
language plpgsql security invoker set search_path = public as $$
begin
  if new.phone is distinct from old.phone
     and not (
       public.is_admin()
       or coalesce(auth.jwt() ->> 'role', '') in ('service_role', 'supabase_admin')
       or current_user in ('postgres', 'supabase_admin')
     ) then
    raise exception 'profiles.phone can only be changed through a verified OTP';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_guard_phone on public.profiles;
create trigger profiles_guard_phone
  before update on public.profiles
  for each row execute function public.guard_profile_phone();

-- 6 ----------------------------------------------------------
revoke execute on function public.check_rate_limit(text, int, bigint) from public, anon, authenticated;
grant execute on function public.check_rate_limit(text, int, bigint) to service_role;

commit;
```

- [ ] **Step 4: Make the app write the phone with the service client**

In `src/lib/data-access/profile.ts`, the phone must no longer go through the RLS client (the new trigger refuses it). Change the tail of the update function. Replace:

```ts
    patch.phone = phone;
  }

  if (!Object.keys(patch).length) return true;

  const { error } = await supabase
    .from("profiles")
    .update(patch)
    .eq("id", user.id);
```

with:

```ts
    // Written with the service client, after checkOtp above has proved the
    // caller controls the number: profiles.phone is locked to the service
    // role at the database (migration 0053), so the REST API cannot be used
    // to claim a number without an OTP.
    const admin = createAdminClient();
    const { error: phoneError } = await admin
      .from("profiles")
      .update({ phone })
      .eq("id", user.id);
    if (phoneError) {
      if ((phoneError as { code?: string }).code === "23505") throw new Error("phone_taken");
      throw phoneError;
    }
  }

  if (!Object.keys(patch).length) return true;

  const { error } = await supabase
    .from("profiles")
    .update(patch)
    .eq("id", user.id);
```

Then check how the existing code below handles `23505` and make sure the thrown name matches it: run `grep -n "23505" -A4 src/lib/data-access/profile.ts` and use the **same** error string that block throws (replace `"phone_taken"` above with it if different). Add `import { createAdminClient } from "@/lib/supabase/admin";` at the top if it is not already imported.

- [ ] **Step 5: Run the static test — must pass**

Run: `npx tsx scripts/qa/release-hardening.ts`
Expected: `… passed, 0 failed`.

- [ ] **Step 6: Type-check, lint, register the test**

Add to `package.json` scripts: `"test:release-hardening": "npx tsx scripts/qa/release-hardening.ts",`
Run: `npx tsc --noEmit && npm run lint && npm run test:release-hardening`
Expected: clean, `0 failed`.

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/0053_release_hardening.sql src/lib/data-access/profile.ts scripts/qa/release-hardening.ts package.json
git commit -m "fix(db): 0053 release hardening — order insert/pricing, guard regression, phone lock, rate-limit revoke"
```

---

### Task 3: Owner applies pending migrations and verifies (runbook)

**Files:**
- Create: `docs/delivery/MIGRATIONS-RUNBOOK.md`

**Interfaces:** Consumes: `0039`, `0042`, `0048`, `0051`, `0052`, `0053` migration files.

- [ ] **Step 1: Write the runbook**

Create `docs/delivery/MIGRATIONS-RUNBOOK.md`:

````markdown
# Apply pending migrations to production (owner)

Run in the Supabase dashboard → SQL editor, **in this order**, one file at a
time, pasting the whole file. Take a backup first (Database → Backups).

1. `supabase/migrations/0039_vendor_login_credentials.sql`
2. `supabase/migrations/0042_rider_dispatch.sql`
3. `supabase/migrations/0048_settlement_corrections.sql`
4. `supabase/migrations/0051_cancellation_provenance.sql`
5. `supabase/migrations/0052_role_feature_flags.sql`
6. `supabase/migrations/0053_release_hardening.sql`  ← must come after 0051

## Verify (each query must return the value shown)

```sql
-- guard is the invoker version with cancelled_by locked
select prosecdef, position('cancelled_by' in prosrc) > 0 as locks_cancelled_by
from pg_proc where proname = 'guard_order_update';
-- expect: prosecdef = false, locks_cancelled_by = true

select count(*) from pg_trigger where tgname in ('order_items_guard_insert','profiles_guard_phone');
-- expect: 2

select has_function_privilege('anon', 'public.check_rate_limit(text,int,bigint)', 'execute');
-- expect: false

select to_regclass('public.role_feature_flags') is not null as flags_table,
       exists(select 1 from information_schema.columns
              where table_name='deliveries' and column_name='offered_driver_id') as dispatch_cols;
-- expect: true, true
```

## Smoke test right after

Place one COD test order in the customer app and cancel it from admin.
Checkout must succeed (a 500 means the guard is wrong — re-run 0053).
````

- [ ] **Step 2: Hand it to the owner and wait for "applied + all verify queries match"**

Do not continue to Task 9 (device QA) until the owner confirms; Tasks 4–8 can proceed in parallel.

- [ ] **Step 3: Commit**

```bash
git add docs/delivery/MIGRATIONS-RUNBOOK.md
git commit -m "docs(delivery): migrations runbook for 0039–0053"
```

---

### Task 4: Per-role web manifests (iOS home-screen apps)

**Files:**
- Create: `src/lib/pwa/role-manifest.ts`, `src/app/manifests/[role]/route.ts`, `scripts/qa/role-manifest.ts`
- Modify: `src/app/vendor/layout.tsx`, `src/app/driver/layout.tsx`, `src/app/manager/layout.tsx`, `src/proxy.ts` (matcher), `package.json` (script)

**Interfaces:**
- Produces: `type PortalRole = "vendor" | "rider" | "manager"`; `buildRoleManifest(role: PortalRole): RoleManifest`; `isPortalRole(v: string): v is PortalRole`; `ROLE_APP_TITLE: Record<PortalRole, string>`. URL `/manifests/<role>` returns `application/manifest+json`.

- [ ] **Step 1: Write the failing test**

Create `scripts/qa/role-manifest.ts`:

```ts
/**
 * QA — each portal installs as its own home-screen app.
 * Usage: npx tsx scripts/qa/role-manifest.ts
 */
import { buildRoleManifest, isPortalRole, ROLE_APP_TITLE } from "../../src/lib/pwa/role-manifest";

let passed = 0;
let failed = 0;
function check(name: string, ok: boolean, detail?: string) {
  if (ok) { passed++; console.log(`  ok   ${name}`); }
  else { failed++; console.log(`  FAIL ${name}${detail ? " — " + detail : ""}`); }
}

const v = buildRoleManifest("vendor");
const r = buildRoleManifest("rider");
const m = buildRoleManifest("manager");

check("vendor opens the kitchen board", v.start_url === "/vendor");
check("rider opens the jobs board", r.start_url === "/driver");
check("manager opens the ops board", m.start_url === "/manager");
check("ids are unique and differ from the customer app's '/'", new Set([v.id, r.id, m.id, "/"]).size === 4);
check("scope is '/' so login redirects stay inside the app", [v, r, m].every((x) => x.scope === "/"));
check("names match the Android app names", v.name === ROLE_APP_TITLE.vendor && r.name === ROLE_APP_TITLE.rider && m.name === ROLE_APP_TITLE.manager);
check("standalone display", [v, r, m].every((x) => x.display === "standalone"));
check("has a 512 maskable icon", [v, r, m].every((x) => x.icons.some((i) => i.sizes === "512x512" && i.purpose === "maskable")));
check("isPortalRole accepts rider", isPortalRole("rider"));
check("isPortalRole rejects admin (website only)", !isPortalRole("admin"));
check("isPortalRole rejects customer (root manifest.ts already covers it)", !isPortalRole("customer"));

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
```

- [ ] **Step 2: Run — must fail**

Run: `npx tsx scripts/qa/role-manifest.ts`
Expected: FAIL (`Cannot find module .../role-manifest`).

- [ ] **Step 3: Implement the builder**

Create `src/lib/pwa/role-manifest.ts`:

```ts
import { THEME_BG } from "@/lib/theme-colors";

/**
 * Web manifests for the three portal apps, so "Add to Home Screen" on an
 * iPhone (and Android Chrome) installs the vendor, rider or manager app —
 * not the customer app the root manifest.ts describes. Admin is website-only
 * by decision (28 Sept 2026) and has none.
 *
 * Names match the Android APKs (mobile/roles.json) so a person with both
 * sees one app name.
 */
export type PortalRole = "vendor" | "rider" | "manager";

export const ROLE_APP_TITLE: Record<PortalRole, string> = {
  vendor: "Deligro Partner",
  rider: "Deligro Rider",
  manager: "Deligro Manager",
};

const START: Record<PortalRole, string> = {
  vendor: "/vendor",
  rider: "/driver",
  manager: "/manager",
};

export interface RoleManifest {
  id: string;
  name: string;
  short_name: string;
  start_url: string;
  scope: string;
  display: "standalone";
  orientation: "portrait";
  background_color: string;
  theme_color: string;
  icons: { src: string; sizes: string; type: string; purpose: "any" | "maskable" }[];
}

export function isPortalRole(value: string): value is PortalRole {
  return value === "vendor" || value === "rider" || value === "manager";
}

export function buildRoleManifest(role: PortalRole): RoleManifest {
  return {
    // Distinct id per role: the same device can install all of them.
    id: `/app/${role}`,
    name: ROLE_APP_TITLE[role],
    short_name: ROLE_APP_TITLE[role].replace("Deligro ", ""),
    start_url: START[role],
    // "/" rather than the portal path: sign-in goes through /{role}/login and
    // /switch, which must stay inside the installed app.
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: THEME_BG.light,
    theme_color: THEME_BG.light,
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
```

- [ ] **Step 4: Run the test — must pass**

Run: `npx tsx scripts/qa/role-manifest.ts`
Expected: `11 passed, 0 failed`.

- [ ] **Step 5: Serve it**

Create `src/app/manifests/[role]/route.ts`:

```ts
import { NextResponse } from "next/server";
import { buildRoleManifest, isPortalRole } from "@/lib/pwa/role-manifest";

/** GET /manifests/vendor | rider | manager — public, contains no user data. */
export async function GET(_req: Request, ctx: { params: Promise<{ role: string }> }) {
  const { role } = await ctx.params;
  if (!isPortalRole(role)) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return new NextResponse(JSON.stringify(buildRoleManifest(role)), {
    headers: {
      "Content-Type": "application/manifest+json; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
```

- [ ] **Step 6: Let it through the session gate**

In `src/proxy.ts`, in the `matcher` string, add `manifests/` to the excluded list right after `manifest\\.webmanifest|`:

```ts
    "/((?!_next/static|_next/image|favicon.ico|robots\\.txt|sitemap\\.xml|manifest\\.webmanifest|manifests/|OneSignalSDKWorker\\.js|sw-core\\.js|offline\\.html|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
```

Add one line to the comment above the matcher: `// manifests/ — the portal apps' manifests (role-manifest.ts); public, no user data.`

- [ ] **Step 7: Point each portal at its manifest**

At module level in each layout (below the imports), add:

`src/app/vendor/layout.tsx`:
```ts
import type { Metadata } from "next";
export const metadata: Metadata = {
  manifest: "/manifests/vendor",
  appleWebApp: { capable: true, title: "Deligro Partner", statusBarStyle: "default" },
};
```

`src/app/driver/layout.tsx`:
```ts
import type { Metadata } from "next";
export const metadata: Metadata = {
  manifest: "/manifests/rider",
  appleWebApp: { capable: true, title: "Deligro Rider", statusBarStyle: "default" },
};
```

`src/app/manager/layout.tsx`:
```ts
import type { Metadata } from "next";
export const metadata: Metadata = {
  manifest: "/manifests/manager",
  appleWebApp: { capable: true, title: "Deligro Manager", statusBarStyle: "default" },
};
```

If a layout already exports `metadata`, merge these two keys into it instead of adding a second export (run `grep -n "export const metadata" src/app/{vendor,driver,manager}/layout.tsx` first).

- [ ] **Step 8: Verify the HTML really links the role manifest**

```bash
npm run dev   # in another terminal
curl -s http://localhost:3005/vendor/login | grep -o '<link rel="manifest"[^>]*>'
curl -s http://localhost:3005/manifests/rider | head -c 200
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3005/manifests/admin
```
Expected: `href="/manifests/vendor"`; JSON with `"start_url":"/driver"`; `404`.
If the vendor page still shows `/manifest.webmanifest`, the root file-based manifest is winning — then also add `manifest: "/manifest.webmanifest"` explicitly to the root layout metadata so nested layouts can override it, and re-check.

- [ ] **Step 9: Checks + commit**

Add `"test:role-manifest": "npx tsx scripts/qa/role-manifest.ts",` to `package.json`.
Run: `npx tsc --noEmit && npm run lint && npm run test:role-manifest && npm run test:platform`
Expected: clean; role-manifest `0 failed`; platform `35 passed, 2 failed` (the 2 are pre-existing admin-nav failures — must not increase).

```bash
git add src/lib/pwa/role-manifest.ts src/app/manifests src/app/vendor/layout.tsx src/app/driver/layout.tsx src/app/manager/layout.tsx src/proxy.ts scripts/qa/role-manifest.ts package.json
git commit -m "feat(pwa): per-role manifests so vendor/rider/manager install as their own apps on iOS"
```

---

### Task 5: Web side of native push (inside the Android shell)

**Files:**
- Create: `src/lib/native/bridge.ts`, `scripts/qa/native-bridge.ts`
- Modify: `src/components/notifications/onesignal-init.tsx`, `package.json` (script)

**Interfaces:**
- Consumes: native plugin `DeligroPush` with methods `login({ userId: string })`, `logout()`, `requestPermission()` (Task 6).
- Produces: `isNativeApp(win?): boolean`, `nativePush(win?): NativePush | null` where `interface NativePush { login(o: { userId: string }): Promise<void>; logout(): Promise<void>; requestPermission(): Promise<void> }`.

- [ ] **Step 1: Write the failing test**

Create `scripts/qa/native-bridge.ts`:

```ts
/**
 * QA — the web app detects the Android shell and reaches its push plugin,
 * and behaves exactly as before in a normal browser.
 * Usage: npx tsx scripts/qa/native-bridge.ts
 */
import { isNativeApp, nativePush } from "../../src/lib/native/bridge";

let passed = 0;
let failed = 0;
function check(name: string, ok: boolean) {
  if (ok) { passed++; console.log(`  ok   ${name}`); }
  else { failed++; console.log(`  FAIL ${name}`); }
}

const plugin = { login: async () => {}, logout: async () => {}, requestPermission: async () => {} };
const shell = { Capacitor: { isNativePlatform: () => true, Plugins: { DeligroPush: plugin } } };
const browser = {};
const webCapacitor = { Capacitor: { isNativePlatform: () => false, Plugins: {} } };
const shellWithoutPlugin = { Capacitor: { isNativePlatform: () => true, Plugins: {} } };

check("shell is native", isNativeApp(shell as never));
check("plain browser is not native", !isNativeApp(browser as never));
check("Capacitor web build is not native", !isNativeApp(webCapacitor as never));
check("undefined window (server render) is not native", !isNativeApp(undefined));
check("shell exposes the push plugin", nativePush(shell as never) === plugin);
check("browser has no push plugin", nativePush(browser as never) === null);
check("an old shell without the plugin returns null, not a crash", nativePush(shellWithoutPlugin as never) === null);

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
```

- [ ] **Step 2: Run — must fail**

Run: `npx tsx scripts/qa/native-bridge.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement the bridge**

Create `src/lib/native/bridge.ts`:

```ts
/**
 * The Android apps are Capacitor shells that load this site (mobile/). Inside
 * one, `window.Capacitor` is injected and `isNativePlatform()` is true; in a
 * browser it is absent. Push must go through the native `DeligroPush` plugin
 * there, because the OneSignal web SDK cannot receive push inside a WebView.
 *
 * Every function takes the window explicitly so it can be tested without a
 * DOM (scripts/qa/native-bridge.ts) and is safe during server render.
 */
export interface NativePush {
  login(options: { userId: string }): Promise<void>;
  logout(): Promise<void>;
  requestPermission(): Promise<void>;
}

interface CapacitorGlobal {
  isNativePlatform?: () => boolean;
  Plugins?: Record<string, unknown>;
}

type WindowLike = { Capacitor?: CapacitorGlobal } | undefined;

function defaultWindow(): WindowLike {
  return typeof window === "undefined" ? undefined : (window as unknown as WindowLike);
}

export function isNativeApp(win: WindowLike = defaultWindow()): boolean {
  try {
    return Boolean(win?.Capacitor?.isNativePlatform?.());
  } catch {
    return false;
  }
}

export function nativePush(win: WindowLike = defaultWindow()): NativePush | null {
  if (!isNativeApp(win)) return null;
  const plugin = win?.Capacitor?.Plugins?.DeligroPush as NativePush | undefined;
  return plugin && typeof plugin.login === "function" ? plugin : null;
}
```

- [ ] **Step 4: Run — must pass**

Run: `npx tsx scripts/qa/native-bridge.ts`
Expected: `7 passed, 0 failed`.

- [ ] **Step 5: Use it in `onesignal-init.tsx`**

In `src/components/notifications/onesignal-init.tsx`:

(a) Add the import below the React import:
```ts
import { nativePush } from "@/lib/native/bridge";
```

(b) At the very top of the `useEffect` body in `OneSignalInit` (before `if (!APP_ID || initQueued) return;`), insert:
```ts
    // Inside the Android app: push goes through the native plugin. The web
    // SDK cannot receive push in a WebView, so it is not loaded at all here.
    const native = nativePush();
    if (native) {
      if (userId) void native.login({ userId }).catch(() => {});
      else void native.logout().catch(() => {});
      return;
    }
```

(c) At the top of `requestPushOptIn()` (before `if (!APP_ID || typeof window === "undefined") return;`), insert:
```ts
  const native = nativePush();
  if (native) {
    void native.requestPermission().catch(() => {});
    return;
  }
```

(d) Update the component's doc comment: add one line — `Inside the Android app shells (mobile/) push is native: see src/lib/native/bridge.ts.`

- [ ] **Step 6: Checks + commit**

Add `"test:native-bridge": "npx tsx scripts/qa/native-bridge.ts",` to `package.json`.
Run: `npx tsc --noEmit && npm run lint && npm run test:native-bridge`
Expected: clean, `0 failed`.

```bash
git add src/lib/native/bridge.ts src/components/notifications/onesignal-init.tsx scripts/qa/native-bridge.ts package.json
git commit -m "feat(push): use the native DeligroPush plugin inside the Android app shells"
```

- [ ] **Step 7: Deploy the web changes (Tasks 1, 2, 4, 5) to production**

The shells load the live site, so the APKs only work once this code is live. Push `master` to both remotes (Global Constraints) and confirm the Vercel deployment is green, then:
```bash
curl -s -o /dev/null -w "%{http_code}\n" https://deligrodelivery.ractrotech.com/manifests/vendor
```
Expected: `200`.

---

### Task 6: Mobile project foundation (roles, pure helpers, native files)

**Files:**
- Create: `mobile/package.json`, `mobile/roles.json`, `mobile/scripts/lib.mjs`, `mobile/scripts/lib.test.mjs`, `mobile/native/DeligroPushPlugin.java`, `mobile/native/offline.html`
- Modify: `.gitignore`

**Interfaces:**
- Produces (from `mobile/scripts/lib.mjs`):
  - `loadRoles(json: string): { baseUrl: string, oneSignalAppId: string, roles: Role[] }` where `Role = { role, appId, appName, path, versionCode, versionName }`; throws on missing fields, duplicate appIds, non-https baseUrl.
  - `capacitorConfigFor(role: Role, baseUrl: string, oneSignalAppId: string): object`
  - `patchMainActivity(appId: string): string` — full Java source.
  - `patchAppGradle(src: string, versionCode: number, versionName: string): string` — sets versions and adds the OneSignal dependency once.
  - `patchManifestPermissions(xml: string): string` — adds location permissions once.

- [ ] **Step 1: Create `mobile/roles.json`** (use Task 0 answers for customer/rider appIds if supplied)

```json
{
  "baseUrl": "https://deligrodelivery.ractrotech.com",
  "oneSignalAppId": "SET_FROM_ENV",
  "roles": [
    { "role": "customer", "appId": "com.ractrotech.deligro",         "appName": "Deligro",         "path": "/",        "versionCode": 1, "versionName": "1.0.0" },
    { "role": "vendor",   "appId": "com.ractrotech.deligro.partner", "appName": "Deligro Partner", "path": "/vendor",  "versionCode": 1, "versionName": "1.0.0" },
    { "role": "rider",    "appId": "com.ractrotech.deligro.rider",   "appName": "Deligro Rider",   "path": "/driver",  "versionCode": 1, "versionName": "1.0.0" },
    { "role": "manager",  "appId": "com.ractrotech.deligro.manager", "appName": "Deligro Manager", "path": "/manager", "versionCode": 1, "versionName": "1.0.0" }
  ]
}
```

`oneSignalAppId` stays the literal `SET_FROM_ENV`; the build reads `NEXT_PUBLIC_ONESIGNAL_APP_ID` from the environment (it is a public id — the same value the website ships) and fails if it is unset.

- [ ] **Step 2: Create `mobile/package.json`**

```json
{
  "name": "deligro-mobile",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test scripts/",
    "build:apk": "node scripts/build-apk.mjs"
  }
}
```

- [ ] **Step 3: Write the failing tests**

Create `mobile/scripts/lib.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  loadRoles,
  capacitorConfigFor,
  patchMainActivity,
  patchAppGradle,
  patchManifestPermissions,
} from "./lib.mjs";

const good = JSON.stringify({
  baseUrl: "https://deligrodelivery.ractrotech.com",
  oneSignalAppId: "SET_FROM_ENV",
  roles: [
    { role: "rider", appId: "com.ractrotech.deligro.rider", appName: "Deligro Rider", path: "/driver", versionCode: 3, versionName: "1.0.2" },
  ],
});

test("loadRoles accepts a valid file", () => {
  const cfg = loadRoles(good);
  assert.equal(cfg.roles[0].path, "/driver");
});

test("loadRoles rejects http", () => {
  assert.throws(() => loadRoles(good.replace("https://", "http://")), /https/);
});

test("loadRoles rejects duplicate appIds", () => {
  const dup = JSON.parse(good);
  dup.roles.push({ ...dup.roles[0], role: "vendor" });
  assert.throws(() => loadRoles(JSON.stringify(dup)), /duplicate/i);
});

test("loadRoles rejects a role missing a field", () => {
  const bad = JSON.parse(good);
  delete bad.roles[0].appName;
  assert.throws(() => loadRoles(JSON.stringify(bad)), /appName/);
});

test("capacitor config loads the role path on the live host only", () => {
  const cfg = loadRoles(good);
  const cap = capacitorConfigFor(cfg.roles[0], cfg.baseUrl, "os-app-id");
  assert.equal(cap.appId, "com.ractrotech.deligro.rider");
  assert.equal(cap.appName, "Deligro Rider");
  assert.equal(cap.server.url, "https://deligrodelivery.ractrotech.com/driver");
  assert.deepEqual(cap.server.allowNavigation, ["deligrodelivery.ractrotech.com"]);
  assert.equal(cap.server.cleartext, false);
  assert.equal(cap.server.errorPath, "offline.html");
  assert.equal(cap.plugins.DeligroPush.oneSignalAppId, "os-app-id");
  assert.match(cap.android.appendUserAgent, /DeligroApp\/rider/);
});

test("customer path '/' does not produce a double slash", () => {
  const cfg = loadRoles(good);
  const cap = capacitorConfigFor({ ...cfg.roles[0], role: "customer", path: "/" }, cfg.baseUrl, "x");
  assert.equal(cap.server.url, "https://deligrodelivery.ractrotech.com/");
});

test("MainActivity registers the push plugin before super.onCreate", () => {
  const src = patchMainActivity("com.ractrotech.deligro.rider");
  assert.match(src, /^package com\.ractrotech\.deligro\.rider;/);
  assert.ok(src.indexOf("registerPlugin(DeligroPushPlugin.class)") < src.indexOf("super.onCreate"));
});

test("app gradle gets versions and exactly one OneSignal dependency", () => {
  const gradle = `android {\n    defaultConfig {\n        versionCode 1\n        versionName "1.0"\n    }\n}\ndependencies {\n    implementation project(':capacitor-android')\n}\n`;
  const once = patchAppGradle(gradle, 3, "1.0.2");
  const twice = patchAppGradle(once, 3, "1.0.2");
  assert.match(once, /versionCode 3/);
  assert.match(once, /versionName "1\.0\.2"/);
  assert.equal((twice.match(/com\.onesignal:OneSignal/g) ?? []).length, 1);
});

test("manifest gets location permissions exactly once", () => {
  const xml = `<manifest xmlns:android="http://schemas.android.com/apk/res/android">\n    <uses-permission android:name="android.permission.INTERNET" />\n</manifest>\n`;
  const twice = patchManifestPermissions(patchManifestPermissions(xml));
  assert.equal((twice.match(/ACCESS_FINE_LOCATION/g) ?? []).length, 1);
  assert.equal((twice.match(/ACCESS_COARSE_LOCATION/g) ?? []).length, 1);
});
```

- [ ] **Step 4: Run — must fail**

Run: `cd F:/deligro26/deligro/mobile && node --test scripts/`
Expected: FAIL (`Cannot find module './lib.mjs'`).

- [ ] **Step 5: Implement `mobile/scripts/lib.mjs`**

```js
/**
 * Pure helpers for the Android shell builds. No I/O here — build-apk.mjs
 * does the file system and process work; this is what the tests pin.
 */

const REQUIRED = ["role", "appId", "appName", "path", "versionCode", "versionName"];

export function loadRoles(json) {
  const cfg = JSON.parse(json);
  if (typeof cfg.baseUrl !== "string" || !cfg.baseUrl.startsWith("https://")) {
    throw new Error("roles.json: baseUrl must be an https:// URL");
  }
  if (!Array.isArray(cfg.roles) || cfg.roles.length === 0) {
    throw new Error("roles.json: roles must be a non-empty array");
  }
  const seen = new Set();
  for (const r of cfg.roles) {
    for (const k of REQUIRED) {
      if (r[k] === undefined || r[k] === "") throw new Error(`roles.json: role ${r.role ?? "?"} is missing ${k}`);
    }
    if (!/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/.test(r.appId)) {
      throw new Error(`roles.json: invalid appId ${r.appId}`);
    }
    if (seen.has(r.appId)) throw new Error(`roles.json: duplicate appId ${r.appId}`);
    seen.add(r.appId);
  }
  return cfg;
}

export function capacitorConfigFor(role, baseUrl, oneSignalAppId) {
  const host = new URL(baseUrl).host;
  const url = new URL(role.path, baseUrl).toString();
  return {
    appId: role.appId,
    appName: role.appName,
    webDir: "www",
    server: {
      url,
      // Only the live site loads inside the app; every other link (Maps,
      // WhatsApp, tel:) is handed to Android.
      allowNavigation: [host],
      cleartext: false,
      androidScheme: "https",
      // Shown from www/ when the site can't be reached.
      errorPath: "offline.html",
    },
    android: {
      allowMixedContent: false,
      appendUserAgent: `DeligroApp/${role.role}`,
    },
    plugins: {
      DeligroPush: { oneSignalAppId },
    },
  };
}

export function patchMainActivity(appId) {
  return `package ${appId};

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.ractrotech.deligro.push.DeligroPushPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(DeligroPushPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
`;
}

const ONESIGNAL_DEP = "    implementation 'com.onesignal:OneSignal:[5.1.0, 5.99.99]'";

export function patchAppGradle(src, versionCode, versionName) {
  let out = src
    .replace(/versionCode\s+\d+/, `versionCode ${versionCode}`)
    .replace(/versionName\s+"[^"]*"/, `versionName "${versionName}"`);
  if (!out.includes("com.onesignal:OneSignal")) {
    out = out.replace(/dependencies\s*\{\n/, (m) => `${m}${ONESIGNAL_DEP}\n`);
  }
  return out;
}

const PERMS = [
  "android.permission.ACCESS_FINE_LOCATION",
  "android.permission.ACCESS_COARSE_LOCATION",
];

export function patchManifestPermissions(xml) {
  const missing = PERMS.filter((p) => !xml.includes(p));
  if (missing.length === 0) return xml;
  const lines = missing.map((p) => `    <uses-permission android:name="${p}" />`).join("\n");
  return xml.replace(/<\/manifest>\s*$/, `${lines}\n</manifest>\n`);
}
```

- [ ] **Step 6: Run — must pass**

Run: `cd F:/deligro26/deligro/mobile && node --test scripts/`
Expected: all 9 tests `ok`, `# fail 0`.

- [ ] **Step 7: Native plugin source**

Create `mobile/native/DeligroPushPlugin.java`:

```java
package com.ractrotech.deligro.push;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.onesignal.Continue;
import com.onesignal.OneSignal;

/**
 * Native push for the Deligro shells. The website calls these through
 * window.Capacitor.Plugins.DeligroPush (src/lib/native/bridge.ts):
 *   login  — ties this device to the signed-in profile id (OneSignal external_id),
 *            which is what the server targets (src/lib/notifications/onesignal.ts);
 *   logout — detaches it, so a shared kitchen phone stops getting the last
 *            person's orders;
 *   requestPermission — the Android 13+ notification prompt.
 */
@CapacitorPlugin(name = "DeligroPush")
public class DeligroPushPlugin extends Plugin {

    @Override
    public void load() {
        String appId = getConfig().getString("oneSignalAppId", "");
        if (appId != null && !appId.isEmpty()) {
            OneSignal.initWithContext(getContext(), appId);
        }
    }

    @PluginMethod
    public void login(PluginCall call) {
        String userId = call.getString("userId");
        if (userId == null || userId.isEmpty()) {
            call.reject("userId is required");
            return;
        }
        OneSignal.login(userId);
        call.resolve();
    }

    @PluginMethod
    public void logout(PluginCall call) {
        OneSignal.logout();
        call.resolve();
    }

    @PluginMethod
    public void requestPermission(PluginCall call) {
        OneSignal.getNotifications().requestPermission(true, Continue.none());
        call.resolve();
    }
}
```

- [ ] **Step 8: Offline page for the shell**

Create `mobile/native/offline.html`:

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Deligro — offline</title>
  <style>
    body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #f4f3f0; color: #14181b;
           font: 16px/1.5 system-ui, sans-serif; text-align: center; padding: 24px; }
    button { margin-top: 16px; min-height: 48px; padding: 0 24px; border: 0; border-radius: 999px;
             background: #f2660c; color: #2a1305; font-weight: 700; font-size: 16px; }
  </style>
</head>
<body>
  <main>
    <h1 style="font-size:20px;margin:0 0 8px">No internet connection</h1>
    <p style="margin:0">इंटरनेट कनेक्शन नहीं है। कनेक्ट होने पर फिर से कोशिश करें।</p>
    <button type="button" onclick="location.reload()">Try again · फिर से कोशिश करें</button>
  </main>
</body>
</html>
```

- [ ] **Step 9: Ignore generated and secret files**

Append to `.gitignore`:

```gitignore
# Android shells (mobile/)
mobile/apps/*/node_modules/
mobile/apps/*/android/app/build/
mobile/apps/*/android/build/
mobile/apps/*/android/.gradle/
mobile/apps/*/android/local.properties
mobile/dist/
*.jks
*.keystore
keystore.properties
```

- [ ] **Step 10: Commit**

```bash
git add mobile/package.json mobile/roles.json mobile/scripts/lib.mjs mobile/scripts/lib.test.mjs mobile/native .gitignore
git commit -m "feat(mobile): role config, tested build helpers, native push plugin and offline page"
```

---

### Task 7: Toolchain + keystore + the build script

**Files:**
- Create: `mobile/scripts/build-apk.mjs`, `mobile/README.md`

**Interfaces:**
- Consumes: everything exported by `mobile/scripts/lib.mjs` (Task 6).
- Produces: CLI `node mobile/scripts/build-apk.mjs <role|all>` → `mobile/dist/deligro-<role>-<versionName>.apk` + `.sha256`. Env: `NEXT_PUBLIC_ONESIGNAL_APP_ID`, `DELIGRO_KEYSTORE`, `DELIGRO_KEYSTORE_PASSWORD`, `DELIGRO_KEY_PASSWORD`. Key alias per app = its `role`.

- [ ] **Step 1: Install the toolchain (Windows, once)**

```powershell
winget install --id Microsoft.OpenJDK.21 -e
# Android command-line tools: download "Command line tools only" for Windows from
# https://developer.android.com/studio#command-line-tools-only and unzip to
#   %LOCALAPPDATA%\Android\Sdk\cmdline-tools\latest\
setx ANDROID_HOME "%LOCALAPPDATA%\Android\Sdk"
setx JAVA_HOME "C:\Program Files\Microsoft\jdk-21*"   # use the exact folder winget created
# new terminal, then:
& "$env:LOCALAPPDATA\Android\Sdk\cmdline-tools\latest\bin\sdkmanager.bat" --licenses
& "$env:LOCALAPPDATA\Android\Sdk\cmdline-tools\latest\bin\sdkmanager.bat" "platform-tools" "platforms;android-35" "platforms;android-36" "build-tools;35.0.0" "build-tools;36.0.0"
```

Verify (Git Bash): `java -version` → 21.x; `"$ANDROID_HOME/platform-tools/adb" version` → prints a version.

- [ ] **Step 2: Create the release keystore (once; outside the repo)**

```bash
mkdir -p "$USERPROFILE/deligro-keys"
for alias in customer vendor rider manager; do
  keytool -genkeypair -v -keystore "$USERPROFILE/deligro-keys/deligro-release.jks" \
    -alias "$alias" -keyalg RSA -keysize 2048 -validity 10000 \
    -dname "CN=Deligro $alias, O=Phoxera Solutions Private Limited, C=IN"
done
keytool -list -keystore "$USERPROFILE/deligro-keys/deligro-release.jks"
```
Expected: 4 aliases listed. Use the **same** password for the store and every key (it is what `DELIGRO_KEYSTORE_PASSWORD` and `DELIGRO_KEY_PASSWORD` hold).
If Task 0 supplied the old customer/rider keystore, use that file and its aliases for those two apps instead (set their `role` alias accordingly in the keystore or pass the old alias — see Step 3's `ALIAS_OVERRIDES`).

**Back up** `deligro-release.jks` and the password to two separate places now (e.g. client's password manager + an offline USB). Without it no installed app can ever be updated.

- [ ] **Step 3: Write `mobile/scripts/build-apk.mjs`**

```js
#!/usr/bin/env node
/**
 * Build signed Deligro APKs.
 *   node mobile/scripts/build-apk.mjs rider
 *   node mobile/scripts/build-apk.mjs all
 *
 * Env (required): NEXT_PUBLIC_ONESIGNAL_APP_ID, DELIGRO_KEYSTORE,
 *                 DELIGRO_KEYSTORE_PASSWORD, DELIGRO_KEY_PASSWORD
 * The key alias for each app is its role name (see mobile/README.md).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync, copyFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  loadRoles,
  capacitorConfigFor,
  patchMainActivity,
  patchAppGradle,
  patchManifestPermissions,
} from "./lib.mjs";

const MOBILE = join(dirname(fileURLToPath(import.meta.url)), "..");
const ALIAS_OVERRIDES = {}; // e.g. { customer: "oldCustomerAlias" } from Task 0

function need(name) {
  const v = process.env[name];
  if (!v) {
    console.error(`Missing env ${name}. See mobile/README.md.`);
    process.exit(1);
  }
  return v;
}

function run(cmd, cwd) {
  console.log(`\n$ ${cmd}   (in ${cwd})`);
  execSync(cmd, { cwd, stdio: "inherit", shell: true });
}

function build(role, cfg, env) {
  const appDir = join(MOBILE, "apps", role.role);
  mkdirSync(join(appDir, "www"), { recursive: true });

  // 1. The Capacitor project (package.json + config + web fallback).
  if (!existsSync(join(appDir, "package.json"))) {
    writeFileSync(join(appDir, "package.json"), JSON.stringify({ name: `deligro-${role.role}`, private: true }, null, 2));
    run("npm install @capacitor/core @capacitor/cli @capacitor/android @capacitor/assets --save-exact", appDir);
  }
  writeFileSync(
    join(appDir, "capacitor.config.json"),
    JSON.stringify(capacitorConfigFor(role, cfg.baseUrl, env.oneSignalAppId), null, 2) + "\n"
  );
  copyFileSync(join(MOBILE, "native", "offline.html"), join(appDir, "www", "offline.html"));
  copyFileSync(join(MOBILE, "native", "offline.html"), join(appDir, "www", "index.html"));

  // 2. The Android project, generated once.
  if (!existsSync(join(appDir, "android"))) run("npx cap add android", appDir);

  // 3. Icons from the site's own icon.
  mkdirSync(join(appDir, "assets"), { recursive: true });
  copyFileSync(join(MOBILE, "..", "public", "icons", "icon-512-maskable.png"), join(appDir, "assets", "icon-only.png"));
  run('npx capacitor-assets generate --android --iconBackgroundColor "#f4f3f0" --splashBackgroundColor "#f4f3f0"', appDir);

  // 4. Native patches: push plugin, MainActivity, gradle, permissions.
  const javaRoot = join(appDir, "android", "app", "src", "main", "java");
  const pluginDir = join(javaRoot, "com", "ractrotech", "deligro", "push");
  mkdirSync(pluginDir, { recursive: true });
  copyFileSync(join(MOBILE, "native", "DeligroPushPlugin.java"), join(pluginDir, "DeligroPushPlugin.java"));
  const mainDir = join(javaRoot, ...role.appId.split("."));
  mkdirSync(mainDir, { recursive: true });
  writeFileSync(join(mainDir, "MainActivity.java"), patchMainActivity(role.appId));

  const gradlePath = join(appDir, "android", "app", "build.gradle");
  writeFileSync(gradlePath, patchAppGradle(readFileSync(gradlePath, "utf8"), role.versionCode, role.versionName));

  const manifestPath = join(appDir, "android", "app", "src", "main", "AndroidManifest.xml");
  writeFileSync(manifestPath, patchManifestPermissions(readFileSync(manifestPath, "utf8")));

  // 5. Sync + signed release build.
  run("npx cap sync android", appDir);
  const alias = ALIAS_OVERRIDES[role.role] ?? role.role;
  run(
    [
      "npx cap build android",
      `--keystorepath "${env.keystore}"`,
      `--keystorepass "${env.storePass}"`,
      `--keystorealias "${alias}"`,
      `--keystorealiaspass "${env.keyPass}"`,
      "--androidreleasetype APK",
    ].join(" "),
    appDir
  );

  // 6. Copy out with a checksum.
  const outDir = join(appDir, "android", "app", "build", "outputs", "apk", "release");
  const signed = ["app-release-signed.apk", "app-release.apk"].map((f) => join(outDir, f)).find(existsSync);
  if (!signed) throw new Error(`No signed APK found in ${outDir}`);
  mkdirSync(join(MOBILE, "dist"), { recursive: true });
  const dest = join(MOBILE, "dist", `deligro-${role.role}-${role.versionName}.apk`);
  copyFileSync(signed, dest);
  const sha = createHash("sha256").update(readFileSync(dest)).digest("hex");
  writeFileSync(`${dest}.sha256`, `${sha}  ${dest.split(/[\\/]/).pop()}\n`);
  console.log(`\nBuilt ${dest}\nsha256 ${sha}`);
}

const which = process.argv[2];
if (!which) {
  console.error("Usage: node mobile/scripts/build-apk.mjs <customer|vendor|rider|manager|all>");
  process.exit(1);
}
const cfg = loadRoles(readFileSync(join(MOBILE, "roles.json"), "utf8"));
const env = {
  oneSignalAppId: need("NEXT_PUBLIC_ONESIGNAL_APP_ID"),
  keystore: need("DELIGRO_KEYSTORE"),
  storePass: need("DELIGRO_KEYSTORE_PASSWORD"),
  keyPass: need("DELIGRO_KEY_PASSWORD"),
};
const targets = which === "all" ? cfg.roles : cfg.roles.filter((r) => r.role === which);
if (targets.length === 0) {
  console.error(`Unknown role ${which}`);
  process.exit(1);
}
for (const role of targets) build(role, cfg, env);
```

- [ ] **Step 4: Verify the script refuses to run without env (failing-path test)**

Run: `cd F:/deligro26/deligro && env -u DELIGRO_KEYSTORE node mobile/scripts/build-apk.mjs rider; echo "exit=$?"`
Expected: `Missing env …` and `exit=1`.
Run: `node mobile/scripts/build-apk.mjs nope; echo "exit=$?"` (with env set) → `Unknown role nope`, `exit=1`.

- [ ] **Step 5: Write `mobile/README.md`**

````markdown
# Deligro Android apps

Four Capacitor shells — Customer, Vendor (Deligro Partner), Rider, Manager —
each loading one role's page on https://deligrodelivery.ractrotech.com.
Admin is website-only. Identity lives in `roles.json`; everything else is
generated by `scripts/build-apk.mjs`.

## One-time setup
JDK 21 + Android SDK (see the plan, Task 7 Step 1) and the release keystore at
`%USERPROFILE%\deligro-keys\deligro-release.jks` with one alias per role
(`customer`, `vendor`, `rider`, `manager`). **Back the keystore up** — losing
it means no installed app can be updated again.

## Build
```bash
export NEXT_PUBLIC_ONESIGNAL_APP_ID=...        # same as the website's
export DELIGRO_KEYSTORE="$USERPROFILE/deligro-keys/deligro-release.jks"
export DELIGRO_KEYSTORE_PASSWORD=...
export DELIGRO_KEY_PASSWORD=...
node mobile/scripts/build-apk.mjs all          # or: customer | vendor | rider | manager
```
Output: `mobile/dist/deligro-<role>-<version>.apk` + `.sha256`.

## Release a new version
1. Bump that role's `versionCode` (+1) and `versionName` in `roles.json`.
2. Build it, test it on a phone, send the APK.
3. Customer and rider only: update the APK version/URL in Admin → Settings so
   installed apps are told to update (`/api/app-version`).

## Most changes don't need a new APK
The apps load the live site, so anything deployed to Vercel appears in the
apps immediately. Rebuild only for: app name/icon, version, native push
plugin, permissions, or `roles.json` changes.

## Tests
`cd mobile && node --test scripts/`
````

- [ ] **Step 6: Commit**

```bash
git add mobile/scripts/build-apk.mjs mobile/README.md
git commit -m "feat(mobile): signed APK build script and runbook"
```

---

### Task 8: Generate and build the four APKs

**Files:**
- Create (generated, then committed): `mobile/apps/customer/**`, `mobile/apps/vendor/**`, `mobile/apps/rider/**`, `mobile/apps/manager/**` (excluding the ignored build folders)
- Output (not committed): `mobile/dist/*.apk`, `*.sha256`

**Interfaces:** Consumes: `build-apk.mjs` CLI (Task 7), keystore + env (Task 7 Step 2), live web changes (Task 5 Step 7).

- [ ] **Step 1: Build the rider app first (the most native-dependent)**

```bash
cd F:/deligro26/deligro
export NEXT_PUBLIC_ONESIGNAL_APP_ID="$(grep ^NEXT_PUBLIC_ONESIGNAL_APP_ID= .env.local | cut -d= -f2-)"
export DELIGRO_KEYSTORE="$USERPROFILE/deligro-keys/deligro-release.jks"
export DELIGRO_KEYSTORE_PASSWORD='(from password manager)'
export DELIGRO_KEY_PASSWORD='(from password manager)'
node mobile/scripts/build-apk.mjs rider
```
Expected: ends with `Built …/mobile/dist/deligro-rider-1.0.0.apk` and a sha256.
If `npx cap build` reports a Gradle/SDK version mismatch, install the exact `platforms;android-XX` / `build-tools;XX` it names with `sdkmanager` and re-run.

- [ ] **Step 2: Verify the APK is signed with the release key**

```bash
"$ANDROID_HOME/build-tools/36.0.0/apksigner" verify --print-certs mobile/dist/deligro-rider-1.0.0.apk | head -3
```
Expected: `Signer #1 certificate DN: CN=Deligro rider, …` (or the old key's DN if Task 0 supplied it).

- [ ] **Step 3: Install on a phone and smoke-test the bridge**

```bash
"$ANDROID_HOME/platform-tools/adb" install -r mobile/dist/deligro-rider-1.0.0.apk
```
Open the app → it shows the rider login on the live site. Then from a laptop: `chrome://inspect` → the app's WebView → Console:
```js
window.Capacitor.isNativePlatform()           // expect true
typeof window.Capacitor.Plugins.DeligroPush   // expect "object"
```
If `DeligroPush` is missing, the plugin registration failed — check `MainActivity.java` package and path match `appId` and rebuild.

- [ ] **Step 4: Build the other three**

`node mobile/scripts/build-apk.mjs customer && node mobile/scripts/build-apk.mjs vendor && node mobile/scripts/build-apk.mjs manager`
Expected: three more APKs + sha256 files in `mobile/dist/`; repeat Step 2's `apksigner verify` for each.

- [ ] **Step 5: Commit the generated projects (not builds)**

```bash
git status --short mobile/   # confirm no build/, .gradle/, node_modules/, *.jks
git add mobile/apps
git commit -m "build(mobile): generate customer, vendor, rider and manager Android projects"
```

---

### Task 9: Device QA — every app, every Review Focus item

**Files:** Create: `docs/delivery/QA-CHECKLIST.md` (filled-in results).

**Interfaces:** Consumes: four APKs (Task 8); migrations applied (Task 3 confirmed); live web changes (Task 5 Step 7).

- [ ] **Step 1: Write the checklist file with this exact table, one per app, and fill it on a real Android phone (Android 10+)**

```markdown
# Device QA — <app> <version> — <phone model / Android version> — <date>

| # | Check | How | Pass? |
|---|---|---|---|
| 1 | Opens on the right screen | Launch → customer home / vendor board / rider jobs / manager board (after login) | |
| 2 | Login works | Email+password (vendor/rider/manager) or phone OTP (customer) | |
| 3 | Login survives restart | Swipe the app away from recents, reopen → still signed in | |
| 4 | Push arrives with app closed | Customer: place an order → "Order sent" push. Vendor: new order push. Rider: pickup push. Manager: ops alarm (kitchen not accepting 3 min) | |
| 5 | Sign out stops pushes | Sign out → place/trigger an order for that account → no push on this phone | |
| 6 | Offline launch | Airplane mode → open app → "No internet connection" page → turn network on → Try again → app loads | |
| 7 | External links | Rider: Call customer opens dialer; Navigate opens Google Maps; Back returns to app. Customer: Help → WhatsApp opens WhatsApp | |
| 8 | Location permission | Rider: accept a job → Android asks for location → allow → customer tracking shows live GPS. Customer: "Use my location" works | |
| 9 | File upload | Vendor: Menu → edit item → upload photo from gallery/camera | |
| 10 | Back button | From an inner page Back goes back; on the start page Back exits the app | |
| 11 | Hindi + text size | Hindi labels render (no boxes), nothing cut off at default font size and at Android "Large" font | |
| 12 | Core flow end-to-end | One COD order: customer places → vendor accepts & readies → rider accepts, picks up (pickup code), delivers (delivery code) → customer sees Delivered | |
```

- [ ] **Step 2: Run check 12 once, across all four apps on two phones**

Use the test customer account and Saffron Kitchen (see project memory `deligro-live-e2e-test`); it is a real order on the live database — the owner approved one test order per QA round.

- [ ] **Step 3: Any failure → fix at the source, rebuild only the affected app, re-run its checklist**

(Web bugs: fix, deploy, no rebuild needed. Native bugs: fix in `mobile/`, bump that role's `versionCode`, rebuild.)

- [ ] **Step 4: Commit the filled checklists**

```bash
git add docs/delivery/QA-CHECKLIST.md
git commit -m "docs(delivery): device QA results for the four Android apps"
```

---

### Task 10: Client install guide + handover

**Files:** Create: `docs/delivery/INSTALL.md`

- [ ] **Step 1: Write the guide**

````markdown
# Installing the Deligro apps

Website (admin, and everything else): https://deligrodelivery.ractrotech.com

## Android (APK files)
| App | File | Who |
|---|---|---|
| Deligro | deligro-customer-1.0.0.apk | Customers |
| Deligro Partner | deligro-vendor-1.0.0.apk | Restaurant / shop owners |
| Deligro Rider | deligro-rider-1.0.0.apk | Delivery riders |
| Deligro Manager | deligro-manager-1.0.0.apk | Operations managers |

1. Send the APK on WhatsApp or share a download link.
2. Tap the file → Android asks to **allow installs from this source** → Allow → Install.
3. Open the app and sign in. Allow **notifications** (and **location** in the Rider app).
4. Check the file is genuine: its SHA-256 must match the `.sha256` file shipped with it.

If an older Deligro app is already installed and the new one refuses to
install ("App not installed"), uninstall the old app first (it was signed
with a different key).

## iPhone (home-screen apps)
No App Store download is needed. In **Safari** (not Chrome):
| App | Open this address | Then |
|---|---|---|
| Deligro | https://deligrodelivery.ractrotech.com | Share → **Add to Home Screen** |
| Deligro Partner | https://deligrodelivery.ractrotech.com/vendor | Share → Add to Home Screen |
| Deligro Rider | https://deligrodelivery.ractrotech.com/driver | Share → Add to Home Screen |
| Deligro Manager | https://deligrodelivery.ractrotech.com/manager | Share → Add to Home Screen |

Open it from the home-screen icon (not Safari) and allow notifications when
asked — iPhones only deliver web notifications to home-screen apps (iOS 16.4+).
Rider location on iPhone works only while the app is open on screen.

## Updates
Most updates need nothing from users: the apps show the live website.
When a new APK is needed, customers and riders are prompted inside the app;
vendors and managers get the new APK file the same way as the first one.
````

- [ ] **Step 2: Hand over**

Deliver to the client: the four APKs + `.sha256` files, `INSTALL.md`, and (to the owner only, separately and securely) the keystore backup location. Confirm the owner has completed the **Owner actions** below.

- [ ] **Step 3: Commit**

```bash
git add docs/delivery/INSTALL.md
git commit -m "docs(delivery): client install guide for Android APKs and iPhone home-screen apps"
```

---

## Owner actions (outside the code — must be done for the apps to work fully)

1. **Apply migrations** 0039, 0042, 0048, 0051, 0052, 0053 (Task 3 runbook).
2. **OneSignal → Android:** in the OneSignal dashboard, configure the Android (FCM) platform for the same OneSignal app: create a Firebase project, generate a service-account JSON, upload it in OneSignal (Settings → Push & In-App → Google Android). Without this, native pushes (Task 6) are not delivered.
3. **OneSignal → Web:** set the Web platform's site URL to `https://deligrodelivery.ractrotech.com` (fixes "App not configured for web push") — needed for iPhone home-screen push and desktop browsers.
4. **Vercel env:** confirm `CRON_SECRET` (16+ chars) if a scheduled dispatch sweep is wanted; otherwise the sweep runs off the vendor/rider boards (already built).
5. **Keystore backup** in two places (Task 7 Step 2).

## Deferred until after delivery (from the 28 Sept audit — not in this plan)

- OTP verify race / per-phone verify limit (medium) and DB-level order status transitions + OTP visibility (medium).
- Performance: serial DB calls on place-order, vendor board, tracking; 2 s splash; catalog caching; vendor charts lazy-load.
- SEO: public pages redirect crawlers to /login.
- Play Store / App Store publication (privacy policy, account deletion, Data safety, TWA/iOS native) — plan separately when the client wants store listings.
- Rider background GPS (location while the phone is locked) — needs a native background-location plugin.
- Code quality: CI, test runner, splitting large files, deprecated design-system adapters.

---

## Self-review (done)

- **Coverage:** apps (4, admin excluded) → Tasks 6–8; iOS PWA → Task 4 + Task 10; signed APKs → Tasks 7–8; release blockers (CVE, order insert/pricing, 0051 regression, phone lock, rate-limit revoke) → Tasks 1–3; live URL → Global Constraints + `roles.json`; no new features → Deferred list.
- **Placeholders:** none; `SET_FROM_ENV` is a deliberate literal read and replaced from the environment by the script, which fails when the env var is unset.
- **Type consistency:** `DeligroPush` methods `login({userId})/logout()/requestPermission()` identical in Java (Task 6), bridge (Task 5) and tests; `PortalRole` values `vendor|rider|manager` used identically in builder, route and layouts; role paths `/`, `/vendor`, `/driver`, `/manager` identical in `roles.json`, `role-manifest.ts` and INSTALL.md.
- **Review Focus:** items 1, 3, 4, 5 → Task 9 checks 3, 6, 7, 8–9; item 2 → Task 9 check 5 (+ bridge logout in Task 5).
