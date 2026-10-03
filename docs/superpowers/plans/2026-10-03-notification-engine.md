# Deligro Notification Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the per-transition push functions with one notification engine (event → rule → recipient → channel → template) that always writes an in-app notification, pushes as today, optionally sends SMS, and drives a live 🔔 bell in all four portals through Supabase Realtime.

**Architecture:** Callers keep calling the same `notifyX()` functions in `src/lib/notifications/order-events.ts`. Each one now builds a typed `NotifyEvent` and hands it to `notify()`. A pure core (`catalog.ts` for templates and rules, `engine-core.ts` for the fan-out) decides who gets what on which channel. A thin server-only wiring layer (`engine.ts`, `recipients.ts`, `channels/*`) talks to Supabase, OneSignal and the SMS provider. In-app rows go into a new `notifications` table. RLS limits each user to their own rows, and the table is added to the `supabase_realtime` publication so the bell can update the moment a row is inserted.

**Tech Stack:** Next.js 16 (existing app), Supabase Postgres + Realtime (`@supabase/ssr` browser client), OneSignal (existing `sendPush`), SMS provider adapter (MSG91 Flow API by default; see Task 0), QA scripts in `scripts/qa/*.ts` run with `npx tsx`.

**Spec:** The owner's architecture diagram (pasted 2026-10-03), reproduced here:

```
Customer │ Vendor │ Rider │ Admin
        → Business Events
        → Notification Engine: 1. Event 2. Rule 3. Recipient 4. Channel 5. Template
        → In-App Channel (ALWAYS) → notifications DB → Supabase Realtime → 🔔 Notification UI
        → SMS Channel (OPTIONAL)  → SMS Provider
```

Plus the gap analysis of the current code from the same conversation. Today there is push only: no table, no realtime, a customer feed derived from order timestamps, no bell for operators and no SMS.

**Ringing (vendor + rider):** continuous ringing until Accept/Reject is a separate plan, `2026-10-03-order-ringing.md`, approved by the owner on 2026-10-03 to build **now**, before this one. When this engine lands, move its ring start/stop into `RULES` as an optional `ring?: "vendor" | "rider"` field, and keep the ring protocol in `src/lib/alerts/ring.ts` unchanged. The engine must never let an admin switch off the ring for `vendor.new_order` or the rider offer events.

**Timing:** This plan is for **after client handover**. The project is in its delivery phase with no new features (decision of 2026-09-28). Do not start this plan until the owner says handover is done.

---

## Task 0 — Owner decisions (before any code)

| Decision | Default if owner has no preference |
|---|---|
| Start date | After APK handover is accepted |
| Who may apply migration `0054` to the **live** Supabase | Owner applies it through the Supabase SQL editor after reading it. `.env.local` points at production, so nobody runs it from a laptop on their own. |
| Ship SMS at all? | **Yes, for three events only:** vendor new order, rider assigned, customer order declined by restaurant. Push on cheap Android phones in Bemetara is often killed by battery savers, and these three moments cost real money when missed. |
| SMS provider | **MSG91** (DLT-registered transactional). The existing Renflair key cannot be reused: `src/lib/sms/renflair.ts` calls an OTP-only endpoint (`PHONE` + `OTP` parameters) that does not accept free text. If the owner prefers Renflair, ask Renflair for their transactional/DLT API and swap the adapter in Task 7. |
| DLT templates | Owner registers the three SMS texts in Task 7 Step 1 with their DLT operator and the provider, and gives back one template ID per text. **Task 7 is blocked until those IDs exist.** Tasks 1–6 do not depend on SMS. |
| Admin management scope | Sent log, SMS switches, Broadcast (owner, 2026-10-03). Template editing deliberately left out. Tasks 9–11. |
| Who may apply migration `0055` to the **live** Supabase | Same as `0054`: the owner applies it through the Supabase SQL editor after `0054`, never from this machine. |

## Global Constraints

- **No caller changes.** Every exported `notifyX(...)` function in `order-events.ts` keeps its exact name and signature. The 12 calling files (`src/app/**/actions.ts`, `src/lib/data-access/*.ts`, `src/lib/dispatch/*.ts`, `api/orders/[id]/cancel/route.ts`) are not edited.
- **Never throws into the caller.** A failed notification must never roll back the order change that triggered it (the existing rule in `order-events.ts`). Callers keep using `deferNotify()`.
- **In-app is always on.** The engine writes the in-app row whether or not push or SMS are configured or succeed. In-app does not depend on push.
- **Works before the migration.** If `public.notifications` does not exist (`isMissingTable` → codes `PGRST205` / `42P01`), the in-app channel reports `skipped`, push still sends, bells show zero, and the customer page falls back to the derived `listActivity()` feed.
- **Bilingual copy is stored, not translated at read time.** Every row stores `title_en`, `title_hi`, `body_en`, `body_hi`. The viewer's language (`getLang()`, cookie `deligro-lang`) picks one with `pick(lang, bi)`. Copy is moved **verbatim** from today's `order-events.ts`; do not reword it.
- **Inserts are service-role only.** `anon` and `authenticated` get `SELECT` on own rows and `UPDATE (read_at)` on own rows, nothing else.
- **Migration is idempotent** (`if not exists`, `drop policy if exists`) and numbered `0054`.
- **Hindi-first, simple UI:** bell tap target ≥ 44px (`size-11`, as in `home-header.tsx`), unread badge caps at `9+`, empty state in the viewer's language.
- **Tests are `scripts/qa/*.ts`** using the `check(name, ok, detail?)` pattern from `scripts/qa/customer-language.ts`. Pure modules under test must not import `server-only`, `next/*` or Supabase.

## Review Focus

1. **OneSignal keys missing or OneSignal down.** The user expects the bell to still show the notification. Pinned in Task 2: `in-app row written when push throws` and `in-app row written when push not configured`.
2. **Migration not yet applied to live.** The user expects the app to work exactly as today with no errors. Pinned in Task 2 (`in-app skipped does not stop push`) and Task 5 (customer page falls back when table missing).
3. **Recipient has no phone or no OneSignal id** (old accounts, vendors added by admin). The user expects in-app to still arrive and SMS to be skipped for just that person. Pinned in Task 2: `recipient without phone gets in-app, no sms`.
4. **One user seeing another user's notifications** through Realtime or the list. The user expects strict isolation. Pinned in Task 1, Step 4: a manual two-account RLS check on live, run with the owner after the migration.
5. **Ops event when there are zero admins/managers, or rider event for a deleted rider.** The user expects nothing to break. Pinned in Task 2: `empty recipient list sends nothing and does not throw`.
6. **A broadcast reaching the wrong people, or going out twice.** The owner expects "सभी राइडर" to reach riders only, and one tap to send exactly once. Pinned in Task 11: `vendor broadcast targets the restaurant role`, `unknown target refused`, `broadcast: in-app yes, sms never, logged with sender`. The confirm step shows the count for each group before anything is sent. The server validates the input again on send (it does not trust the preview) and allows one broadcast per minute across all admins (`rateLimit("admin-broadcast", 1, 60_000)`).
7. **A non-admin reaching the notification pages or actions** (a manager or vendor guessing `/admin/notifications`). They expect to be refused. Every new page and every new server action calls `requireRole("admin")` itself, not only through `admin/layout.tsx`, because a server action is a public endpoint whatever page it sits on. Pinned by the manual non-admin checks in Task 9 Step 15 (item 4) and Task 11 Step 11 (item 6).
8. **An admin switching SMS on for an event that has no DLT template.** That SMS would be blocked by the operator and may count against the DLT sender. Pinned in Task 10: `no template, cannot switch on` and `isSmsSwitchable refuses others`. `setSmsSwitchAction` refuses any kind outside `SMS_SWITCHABLE`.
9. **Sent log missing or broken.** The user expects notifications to keep going out. Pinned in Task 9: `log failure does not throw`, and in-app falls back to writing without `send_id` when `0054` is applied but `0055` is not.

---

## File Structure

| File | Responsibility |
|---|---|
| `supabase/migrations/0054_notifications.sql` (create) | Table, indexes, RLS, grants, Realtime publication |
| `src/lib/notifications/catalog.ts` (create) | Pure: `NotifyEvent` union, `RULES` (audience + SMS flag), `render()` templates, `orderIdOf()` |
| `src/lib/notifications/engine-core.ts` (create) | Pure: `runNotify(event, deps)`. Fans out to channels with `Promise.allSettled` and returns a report. `toInAppRows()`, `pickRow()`, `badgeLabel()` |
| `src/lib/notifications/recipients.ts` (create) | Server: audience → `Recipient[]` (profile id, OneSignal id, phone) |
| `src/lib/notifications/channels/in-app.ts` (create) | Server: insert rows, `skipped` when table missing |
| `src/lib/notifications/channels/push.ts` (create) | Server: wraps existing `sendPush` |
| `src/lib/notifications/channels/sms.ts` (create, Task 7) | Server: MSG91 Flow adapter, env-gated |
| `src/lib/notifications/engine.ts` (create) | Server: `notify(event)` = `runNotify` + real deps |
| `src/lib/notifications/order-events.ts` (modify) | Same exports, bodies become `notify({...})`. Delete the four private push helpers |
| `src/lib/data-access/my-notifications.ts` (create) | Server: `listMyNotifications()`, `countMyUnread()` under RLS |
| `src/lib/notifications/actions.ts` (create) | `"use server"`: `fetchMyNotifications()`, `markMyNotificationsRead()` |
| `src/components/notifications/notification-bell.tsx` (create) | Client: badge + Realtime subscription, link mode (customer) or panel mode (operators) |
| `src/components/home/home-header.tsx` (modify) | Swap static bell link for `<NotificationBell href=...>` |
| `src/app/(customer)/profile/notifications/page.tsx` (modify) | Read stored notifications, fall back to `listActivity()` |
| `src/app/vendor/layout.tsx`, `src/components/driver/driver-header.tsx`, `src/app/manager/layout.tsx`, `src/app/admin/layout.tsx` (modify) | Mount the bell |
| `scripts/qa/notification-engine.ts` (create) | Tests for catalog + engine core |
| `package.json`, `scripts/qa/run-all.sh` (modify) | Wire `test:notifications` |
| `supabase/migrations/0055_notification_log.sql` (create, Task 9) | `notification_sends` (sent log), `notification_settings` (SMS switches), `notifications.send_id`. Service-role only |
| `src/lib/notifications/send-log.ts` (create, Task 9) | Server: `writeSendLog()`, `skipped` when table missing |
| `src/lib/notifications/log-filters.ts` (create, Task 9) | Pure: parse sent-log filters (order id short or full, phone/name, kind, IST date) |
| `src/lib/data-access/admin-notification-log.ts` (create, Task 9) | Server: `listSends()`, `getSend()` for the admin pages |
| `src/components/admin/notification-ui.tsx` (create, Task 9) | Tabs for the three notification pages, outcome badge, audience text |
| `src/app/admin/notifications/page.tsx`, `src/app/admin/notifications/[id]/page.tsx` (create, Task 9) | Admin: sent log with filters, and one send with its recipients and read state |
| `src/components/admin/admin-nav.ts` (modify, Task 9) | "Notifications" rail entry |
| `src/lib/notifications/settings.server.ts` (create, Task 10) | Server: per-event SMS switches, cached 30 s |
| `src/app/admin/notifications/actions.ts` (create, Task 10; extended Task 11) | `"use server"`: `setSmsSwitchAction`, `previewBroadcastAction`, `sendBroadcastAction` |
| `src/app/admin/notifications/sms/page.tsx`, `sms/sms-switches.tsx` (create, Task 10) | Admin: SMS on/off per event |
| `src/lib/notifications/broadcast.ts` (create, Task 11) | Pure: broadcast targets and `checkBroadcast()` validation |
| `src/app/admin/notifications/broadcast/page.tsx`, `broadcast/broadcast-form.tsx` (create, Task 11) | Admin: write → preview with count → confirm → result |

---

### Task 1: `notifications` table, RLS and Realtime

**Files:**
- Create: `supabase/migrations/0054_notifications.sql`

**Interfaces:**
- Produces: table `public.notifications(id uuid, profile_id uuid, kind text, order_id uuid null, title_en, title_hi, body_en, body_hi, url text, created_at timestamptz, read_at timestamptz null)`. The table is in publication `supabase_realtime`.

- [ ] **Step 1: Write the migration**

```sql
-- ============================================================
-- 0054 — Notifications: the in-app channel of the notification engine
-- ------------------------------------------------------------
-- Until now a notification existed only as a OneSignal push: nothing was
-- stored, so nobody could see one again, and a phone whose battery saver
-- killed the push never heard about the order at all. Every notification the
-- engine sends now also lands here, one row per recipient, whether or not
-- push or SMS worked (src/lib/notifications/engine-core.ts).
--
-- Copy is stored in both languages so a viewer who switches language reads
-- the same notification in the other one; it is never translated on read.
--
-- Writes: service_role only (the engine runs server-side). A signed-in user
-- may read their own rows and set read_at on them — nothing else, enforced by
-- column-level grant plus RLS.
--
-- Realtime: added to supabase_realtime so the bell updates on insert. Realtime
-- applies the SELECT policy per subscriber, so nobody receives another
-- user's rows.
-- Idempotent: safe to re-run.
-- ============================================================

begin;

create table if not exists public.notifications (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid        not null references public.profiles(id) on delete cascade,
  kind        text        not null check (kind ~ '^[a-z]+\.[a-z_]+$'),
  order_id    uuid        references public.orders(id) on delete set null,
  title_en    text        not null,
  title_hi    text        not null,
  body_en     text        not null,
  body_hi     text        not null,
  url         text        not null,
  created_at  timestamptz not null default now(),
  read_at     timestamptz
);

comment on table public.notifications is
  'In-app notifications, one row per recipient. Written by the notification engine (service_role); users read and mark their own. See migration 0054.';

create index if not exists notifications_inbox_idx
  on public.notifications (profile_id, created_at desc);
create index if not exists notifications_unread_idx
  on public.notifications (profile_id)
  where read_at is null;

alter table public.notifications enable row level security;

revoke all on public.notifications from anon, authenticated;
grant select on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;

drop policy if exists "notifications: read own" on public.notifications;
create policy "notifications: read own"
  on public.notifications for select to authenticated
  using (profile_id = auth.uid());

drop policy if exists "notifications: mark own read" on public.notifications;
create policy "notifications: mark own read"
  on public.notifications for update to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;

commit;
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/0054_notifications.sql
git commit -m "feat(db): 0054 notifications table with RLS and realtime"
```

- [ ] **Step 3: Owner applies it to live**

Hand the file to the owner. They paste it into the Supabase SQL editor for the production project and run it twice. The second run must also succeed, which proves it is idempotent. **Do not run it from this machine.**

- [ ] **Step 4: Two-account isolation check (with owner, on live)**

In the SQL editor (service role), insert one test row for each of two demo accounts:

```sql
insert into public.notifications (profile_id, kind, title_en, title_hi, body_en, body_hi, url)
select id, 'test.isolation', 'Test', 'टेस्ट', 'Isolation check', 'जाँच', '/'
from public.profiles where id in ('<demo-customer-id>', '<demo-vendor-id>');
```

Then check that the new policies exist:

```sql
select policyname, cmd from pg_policies where tablename = 'notifications';
```

Expected: the two policies (`read own`, `mark own read`). After Task 5, sign in as the demo customer and confirm the bell shows exactly **one** test row, not two. Then delete the rows: `delete from public.notifications where kind = 'test.isolation';`

---

### Task 2: Catalog and engine core (pure, tested)

**Files:**
- Create: `src/lib/notifications/catalog.ts`
- Create: `src/lib/notifications/engine-core.ts`
- Test: `scripts/qa/notification-engine.ts`
- Modify: `package.json` (add `"test:notifications": "npx tsx scripts/qa/notification-engine.ts"`)

**Interfaces:**
- Produces (catalog): `type NotifyEvent`, `type NotifyKind = NotifyEvent["kind"]`, `type Audience = "customer" | "vendor" | "driver" | "ops"`, `RULES: Record<NotifyKind, { audience: Audience; sms: boolean }>`, `interface Rendered { title: Bi; body: Bi; url: string }`, `render(e: NotifyEvent): Rendered`, `orderIdOf(e: NotifyEvent): string`.
- Produces (core): `interface Recipient { profileId: string; onesignalId: string | null; phone: string | null }`, `type ChannelOutcome = "sent" | "skipped" | "failed"`, `interface InAppRow`, `interface EngineDeps`, `interface NotifyReport`, `runNotify(e, deps): Promise<NotifyReport>`, `toInAppRows(rs, e, r): InAppRow[]`, `pickRow(row, lang): { title: string; body: string }`, `badgeLabel(n: number): string`.

- [ ] **Step 1: Write the failing test**

`scripts/qa/notification-engine.ts`:

```ts
/**
 * QA — notification engine: every event renders in both languages, rules
 * route to the right audience, and the in-app channel is written no matter
 * what push or SMS do.
 * Usage: npx tsx scripts/qa/notification-engine.ts
 */
import { render, RULES, orderIdOf, type NotifyEvent } from "../../src/lib/notifications/catalog";
import {
  runNotify, toInAppRows, pickRow, badgeLabel,
  type EngineDeps, type Recipient, type InAppRow,
} from "../../src/lib/notifications/engine-core";

let passed = 0;
let failed = 0;
function check(name: string, ok: boolean, detail?: string) {
  if (ok) { passed++; console.log(`  ok   ${name}`); }
  else { failed++; console.log(`  FAIL ${name}${detail ? " — " + detail : ""}`); }
}
const DEV = /[ऀ-ॿ]/;
const OID = "3f2a9c1e-0000-4000-8000-000000000001";
const DRV = "3f2a9c1e-0000-4000-8000-0000000000d1";

// One sample of every kind — if a kind is added to the union and not here,
// the `satisfies` below fails to compile.
const SAMPLES = {
  "order.placed": { kind: "order.placed", orderId: OID },
  "order.accepted": { kind: "order.accepted", orderId: OID, restaurantName: "Saffron Kitchen" },
  "order.ready": { kind: "order.ready", orderId: OID },
  "order.on_the_way": { kind: "order.on_the_way", orderId: OID },
  "order.delivered": { kind: "order.delivered", orderId: OID },
  "order.cancelled": { kind: "order.cancelled", orderId: OID, byVendor: true, refundQueued: true },
  "payment.failed": { kind: "payment.failed", orderId: OID },
  "refund.decided": { kind: "refund.decided", orderId: OID, approved: true },
  "rider.arriving": { kind: "rider.arriving", orderId: OID, riderName: "Ravi" },
  "driver.pickup_offered": { kind: "driver.pickup_offered", orderId: OID, driverId: DRV, restaurantName: "Saffron Kitchen", readyInMinutes: 12, pickupArea: "Berla Road" },
  "driver.pickup_ready": { kind: "driver.pickup_ready", orderId: OID, driverId: DRV, restaurantName: "Saffron Kitchen" },
  "driver.assigned": { kind: "driver.assigned", orderId: OID, driverId: DRV, restaurantName: "Saffron Kitchen" },
  "driver.order_cancelled": { kind: "driver.order_cancelled", orderId: OID, driverId: DRV, pickedUp: false },
  "vendor.new_order": { kind: "vendor.new_order", orderId: OID, itemCount: 3 },
  "vendor.order_cancelled": { kind: "vendor.order_cancelled", orderId: OID, byAdmin: false },
  "vendor.rider_assigned": { kind: "vendor.rider_assigned", orderId: OID, riderName: "Ravi" },
  "ops.kitchen_slow": { kind: "ops.kitchen_slow", orderId: OID, restaurantName: "Saffron Kitchen", minutes: 9 },
  "ops.stuck": { kind: "ops.stuck", orderId: OID, restaurantName: "Saffron Kitchen", hours: 3, status: "on_the_way" },
  "ops.no_rider": { kind: "ops.no_rider", orderId: OID, restaurantName: "Saffron Kitchen", minutes: 7 },
} satisfies { [K in NotifyEvent["kind"]]: Extract<NotifyEvent, { kind: K }> };

// --- catalog ---
for (const e of Object.values(SAMPLES) as NotifyEvent[]) {
  const r = render(e);
  check(`${e.kind}: English has no Hindi`, !DEV.test(r.title.en) && !DEV.test(r.body.en));
  check(`${e.kind}: Hindi is Hindi`, DEV.test(r.title.hi) && DEV.test(r.body.hi));
  check(`${e.kind}: has a rule`, Boolean(RULES[e.kind]));
  check(`${e.kind}: url is app-relative`, r.url.startsWith("/"));
  check(`${e.kind}: carries its order id`, orderIdOf(e) === OID);
}
check("customer events go to the customer", RULES["order.delivered"].audience === "customer");
check("vendor events go to the vendor", RULES["vendor.new_order"].audience === "vendor");
check("driver events go to the driver", RULES["driver.assigned"].audience === "driver");
check("ops events go to ops", RULES["ops.no_rider"].audience === "ops");
check("customer order url", render(SAMPLES["order.ready"]).url === `/orders/${OID}`);
check("ops url keeps the admin order page", render(SAMPLES["ops.stuck"]).url === `/admin/orders/${OID}`);
check("no-rider goes to the manager board", render(SAMPLES["ops.no_rider"]).url === "/manager");
check("copy moved verbatim (delivered)", render(SAMPLES["order.delivered"]).body.en === `Order #3F2A9C1E was delivered. Enjoy your meal!`);
check("declined copy mentions refund", render(SAMPLES["order.cancelled"]).body.en.includes("refund has been requested"));
check("only the three agreed events send SMS",
  (Object.keys(RULES) as (keyof typeof RULES)[]).filter((k) => RULES[k].sms).sort().join(",") ===
  ["driver.assigned", "order.cancelled", "vendor.new_order"].join(","));

// --- core helpers ---
check("badge 0 is empty", badgeLabel(0) === "");
check("badge 4 is 4", badgeLabel(4) === "4");
check("badge 12 is 9+", badgeLabel(12) === "9+");
const one: Recipient = { profileId: "p1", onesignalId: null, phone: null };
const rows = toInAppRows([one], SAMPLES["order.ready"], render(SAMPLES["order.ready"]));
check("one row per recipient", rows.length === 1 && rows[0].profile_id === "p1" && rows[0].kind === "order.ready" && rows[0].order_id === OID);
check("pickRow(hi) is Hindi", DEV.test(pickRow(rows[0], "hi").title));
check("pickRow(en) is English", !DEV.test(pickRow(rows[0], "en").title));

// --- engine fan-out ---
function fakeDeps(over: Partial<EngineDeps> & { recipients?: Recipient[] } = {}) {
  const log = { inApp: [] as InAppRow[], push: 0, sms: [] as string[] };
  const deps: EngineDeps = {
    resolve: async () => over.recipients ?? [one],
    inApp: async (r) => { log.inApp.push(...r); return "sent"; },
    push: async () => { log.push++; return "sent"; },
    sms: async (rs) => { log.sms.push(...rs.map((x) => x.phone ?? "")); return "sent"; },
    smsEnabled: false,
    ...over,
  };
  return { deps, log };
}

async function main() {
  {
    const { deps, log } = fakeDeps({ push: async () => { throw new Error("onesignal down"); } });
    const rep = await runNotify(SAMPLES["order.ready"], deps);
    check("in-app row written when push throws", log.inApp.length === 1 && rep.push === "failed" && rep.inApp === "sent");
  }
  {
    const { deps, log } = fakeDeps({ push: async () => "skipped" });
    await runNotify(SAMPLES["order.ready"], deps);
    check("in-app row written when push not configured", log.inApp.length === 1);
  }
  {
    const { deps, log } = fakeDeps({ inApp: async () => "skipped" });
    const rep = await runNotify(SAMPLES["order.ready"], deps);
    check("in-app skipped does not stop push", rep.inApp === "skipped" && log.push === 1);
  }
  {
    const { deps, log } = fakeDeps({ recipients: [] });
    let threw = false;
    try { await runNotify(SAMPLES["ops.no_rider"], deps); } catch { threw = true; }
    check("empty recipient list sends nothing and does not throw", !threw && log.inApp.length === 0 && log.push === 0);
  }
  {
    const { deps } = fakeDeps({ resolve: async () => { throw new Error("db down"); } });
    let threw = false;
    try { await runNotify(SAMPLES["order.ready"], deps); } catch { threw = true; }
    check("resolver failure does not throw", !threw);
  }
  {
    const withPhone: Recipient = { profileId: "p2", onesignalId: "os2", phone: "+919876543210" };
    const { deps, log } = fakeDeps({ smsEnabled: true, recipients: [one, withPhone] });
    const rep = await runNotify(SAMPLES["vendor.new_order"], deps);
    check("recipient without phone gets in-app, no sms", log.inApp.length === 2 && log.sms.length === 1 && log.sms[0] === "+919876543210" && rep.sms === "sent");
  }
  {
    const { deps, log } = fakeDeps({ smsEnabled: true, recipients: [{ profileId: "p3", onesignalId: null, phone: "+919000000000" }] });
    const rep = await runNotify(SAMPLES["order.ready"], deps);
    check("sms only for events whose rule says so", log.sms.length === 0 && rep.sms === "skipped");
  }
  {
    const { deps, log } = fakeDeps({ smsEnabled: false, recipients: [{ profileId: "p4", onesignalId: null, phone: "+919000000000" }] });
    await runNotify(SAMPLES["vendor.new_order"], deps);
    check("sms off by flag sends no sms", log.sms.length === 0);
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}
void main();
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx scripts/qa/notification-engine.ts`
Expected: FAIL with `Cannot find module '../../src/lib/notifications/catalog'`.

- [ ] **Step 3: Write `catalog.ts`**

Copy is moved verbatim from `order-events.ts`.

```ts
import type { Bi } from "@/lib/i18n/lang";
import { shortOrderId } from "@/lib/utils/order-map";

/**
 * Steps 1, 2 and 5 of the notification engine: what can happen (Event), who
 * hears about it and on which optional channel (Rule), and what it says
 * (Template). Pure — no database, no network — so all of it is testable and
 * the copy lives in one place.
 *
 * The copy was moved verbatim from the old per-transition functions in
 * order-events.ts; the reasons behind each wording are kept there.
 */

export type NotifyEvent =
  | { kind: "order.placed"; orderId: string }
  | { kind: "order.accepted"; orderId: string; restaurantName?: string }
  | { kind: "order.ready"; orderId: string }
  | { kind: "order.on_the_way"; orderId: string }
  | { kind: "order.delivered"; orderId: string }
  | { kind: "order.cancelled"; orderId: string; byVendor?: boolean; refundQueued?: boolean }
  | { kind: "payment.failed"; orderId: string }
  | { kind: "refund.decided"; orderId: string; approved: boolean }
  | { kind: "rider.arriving"; orderId: string; riderName?: string | null }
  | { kind: "driver.pickup_offered"; orderId: string; driverId: string; restaurantName: string; readyInMinutes: number; pickupArea?: string | null }
  | { kind: "driver.pickup_ready"; orderId: string; driverId: string; restaurantName: string }
  | { kind: "driver.assigned"; orderId: string; driverId: string; restaurantName: string }
  | { kind: "driver.order_cancelled"; orderId: string; driverId: string; pickedUp: boolean }
  | { kind: "vendor.new_order"; orderId: string; itemCount?: number }
  | { kind: "vendor.order_cancelled"; orderId: string; byAdmin?: boolean }
  | { kind: "vendor.rider_assigned"; orderId: string; riderName?: string | null }
  | { kind: "ops.kitchen_slow"; orderId: string; restaurantName: string; minutes: number }
  | { kind: "ops.stuck"; orderId: string; restaurantName: string; hours: number; status: string }
  | { kind: "ops.no_rider"; orderId: string; restaurantName: string; minutes: number };

export type NotifyKind = NotifyEvent["kind"];
export type Audience = "customer" | "vendor" | "driver" | "ops";

/**
 * Who hears about each event, and whether it also goes by SMS. In-app and
 * push are not listed: in-app is always on, and push is always attempted.
 * SMS is limited to the three moments that cost real money when a push
 * is lost (owner decision, plan Task 0) and every one needs a DLT template.
 */
export const RULES: Record<NotifyKind, { audience: Audience; sms: boolean }> = {
  "order.placed": { audience: "customer", sms: false },
  "order.accepted": { audience: "customer", sms: false },
  "order.ready": { audience: "customer", sms: false },
  "order.on_the_way": { audience: "customer", sms: false },
  "order.delivered": { audience: "customer", sms: false },
  "order.cancelled": { audience: "customer", sms: true },
  "payment.failed": { audience: "customer", sms: false },
  "refund.decided": { audience: "customer", sms: false },
  "rider.arriving": { audience: "customer", sms: false },
  "driver.pickup_offered": { audience: "driver", sms: false },
  "driver.pickup_ready": { audience: "driver", sms: false },
  "driver.assigned": { audience: "driver", sms: true },
  "driver.order_cancelled": { audience: "driver", sms: false },
  "vendor.new_order": { audience: "vendor", sms: true },
  "vendor.order_cancelled": { audience: "vendor", sms: false },
  "vendor.rider_assigned": { audience: "vendor", sms: false },
  "ops.kitchen_slow": { audience: "ops", sms: false },
  "ops.stuck": { audience: "ops", sms: false },
  "ops.no_rider": { audience: "ops", sms: false },
};

export interface Rendered {
  title: Bi;
  body: Bi;
  url: string;
}

export function orderIdOf(e: NotifyEvent): string {
  return e.orderId;
}

export function render(e: NotifyEvent): Rendered {
  const id = shortOrderId(e.orderId);
  const customerUrl = `/orders/${e.orderId}`;
  switch (e.kind) {
    case "order.placed":
      return {
        title: { en: "Order sent 🧾", hi: "ऑर्डर भेजा गया 🧾" },
        body: {
          en: `Order #${id} is with the restaurant. We'll tell you the moment they accept.`,
          hi: `ऑर्डर #${id} रेस्टोरेंट को भेज दिया गया है। जैसे ही वे स्वीकार करेंगे, हम आपको बताएंगे।`,
        },
        url: customerUrl,
      };
    case "order.accepted":
      return {
        title: { en: "Order accepted 👨‍🍳", hi: "ऑर्डर स्वीकार हुआ 👨‍🍳" },
        body: e.restaurantName
          ? {
              en: `${e.restaurantName} accepted order #${id} and started cooking.`,
              hi: `${e.restaurantName} ने ऑर्डर #${id} स्वीकार कर लिया है और खाना बनना शुरू हो गया है।`,
            }
          : {
              en: `Order #${id} was accepted and is being cooked.`,
              hi: `ऑर्डर #${id} स्वीकार हो गया है और खाना बन रहा है।`,
            },
        url: customerUrl,
      };
    case "order.ready":
      return {
        title: { en: "Food is ready 🍽️", hi: "खाना तैयार है 🍽️" },
        body: {
          en: `Order #${id} is packed and waiting for a rider.`,
          hi: `ऑर्डर #${id} पैक हो गया है और राइडर का इंतज़ार कर रहा है।`,
        },
        url: customerUrl,
      };
    case "order.on_the_way":
      return {
        title: { en: "Your order is on the way 🛵", hi: "आपका ऑर्डर रास्ते में है 🛵" },
        body: {
          en: `Order #${id} has left the kitchen and is heading to you.`,
          hi: `ऑर्डर #${id} किचन से निकल चुका है और आपकी ओर आ रहा है।`,
        },
        url: customerUrl,
      };
    case "order.delivered":
      return {
        title: { en: "Delivered ✅", hi: "डिलीवर हो गया ✅" },
        body: {
          en: `Order #${id} was delivered. Enjoy your meal!`,
          hi: `ऑर्डर #${id} डिलीवर हो गया। खाने का आनंद लें!`,
        },
        url: customerUrl,
      };
    case "order.cancelled": {
      const moneyEn = e.refundQueued ? " Your refund has been requested and is being processed." : "";
      const moneyHi = e.refundQueued ? " आपका रिफ़ंड अनुरोध दर्ज हो गया है और प्रोसेस हो रहा है।" : "";
      return {
        title: e.byVendor
          ? { en: "Order declined", hi: "ऑर्डर अस्वीकार हुआ" }
          : { en: "Order cancelled", hi: "ऑर्डर रद्द हुआ" },
        body: e.byVendor
          ? {
              en: `The restaurant couldn't take order #${id}.${moneyEn}`,
              hi: `रेस्टोरेंट ऑर्डर #${id} नहीं ले सका।${moneyHi}`,
            }
          : {
              en: `Order #${id} was cancelled.${moneyEn}`,
              hi: `ऑर्डर #${id} रद्द कर दिया गया।${moneyHi}`,
            },
        url: customerUrl,
      };
    }
    case "payment.failed":
      return {
        title: { en: "Payment didn't go through", hi: "भुगतान नहीं हो पाया" },
        body: {
          en: `Order #${id} is saved but unpaid. Open it to try again.`,
          hi: `ऑर्डर #${id} सेव है लेकिन भुगतान बाकी है। दोबारा कोशिश करने के लिए इसे खोलें।`,
        },
        url: customerUrl,
      };
    case "refund.decided":
      return {
        title: e.approved
          ? { en: "Refund approved 💸", hi: "रिफ़ंड मंज़ूर 💸" }
          : { en: "Refund declined", hi: "रिफ़ंड अस्वीकार" },
        body: e.approved
          ? {
              en: `Your refund for order #${id} was approved.`,
              hi: `ऑर्डर #${id} का आपका रिफ़ंड मंज़ूर हो गया है।`,
            }
          : {
              en: `We couldn't approve the refund for order #${id}. Contact support if this looks wrong.`,
              hi: `हम ऑर्डर #${id} का रिफ़ंड मंज़ूर नहीं कर सके। अगर यह गलत लगे तो सपोर्ट से संपर्क करें।`,
            },
        url: customerUrl,
      };
    case "rider.arriving": {
      const name = e.riderName?.trim();
      return {
        title: { en: "Your rider is here 🛵", hi: "आपका राइडर पहुँच गया 🛵" },
        body: {
          en: `${name || "Your rider"} has reached your place with order #${id}. Have your delivery code ready.`,
          hi: `${name || "आपके राइडर"} ऑर्डर #${id} लेकर आपके पते पर पहुँच गए हैं। अपना डिलीवरी कोड तैयार रखें।`,
        },
        url: customerUrl,
      };
    }
    case "driver.pickup_offered": {
      const where = e.pickupArea?.trim() ? ` (${e.pickupArea.trim()})` : "";
      return {
        title: { en: "Pickup coming your way 🛵", hi: "पिकअप आ रहा है 🛵" },
        body: {
          en: `${e.restaurantName}${where} is cooking order #${id} — ready in about ${e.readyInMinutes} min. Head over.`,
          hi: `${e.restaurantName}${where} ऑर्डर #${id} बना रहा है — लगभग ${e.readyInMinutes} मिनट में तैयार। निकल पड़िए।`,
        },
        url: "/driver",
      };
    }
    case "driver.pickup_ready":
      return {
        title: { en: "Order ready to collect 📦", hi: "ऑर्डर लेने के लिए तैयार 📦" },
        body: {
          en: `${e.restaurantName} has packed order #${id}. It's held for you — accept it in the app.`,
          hi: `${e.restaurantName} ने ऑर्डर #${id} पैक कर दिया है। यह आपके लिए रखा है — ऐप में स्वीकार करें।`,
        },
        url: "/driver",
      };
    case "driver.assigned":
      return {
        title: { en: "New delivery assigned 🛵", hi: "नई डिलीवरी मिली 🛵" },
        body: {
          en: `You've been assigned order #${id} from ${e.restaurantName}. Open the app for pickup details.`,
          hi: `आपको ${e.restaurantName} का ऑर्डर #${id} दिया गया है। पिकअप की जानकारी के लिए ऐप खोलें।`,
        },
        url: "/driver",
      };
    case "driver.order_cancelled":
      return {
        title: { en: "Order cancelled ✋", hi: "ऑर्डर रद्द ✋" },
        body: e.pickedUp
          ? {
              en: `Order #${id} was cancelled. If you already have the food, contact support.`,
              hi: `ऑर्डर #${id} रद्द हो गया है। अगर खाना आपके पास है तो सपोर्ट से संपर्क करें।`,
            }
          : {
              en: `Order #${id} was cancelled. Don't pick it up.`,
              hi: `ऑर्डर #${id} रद्द हो गया है। इसे पिकअप न करें।`,
            },
        url: "/driver",
      };
    case "vendor.new_order": {
      const n = e.itemCount;
      const hasCount = typeof n === "number" && n > 0;
      const itemsEn = hasCount ? ` · ${n} item${n > 1 ? "s" : ""}` : "";
      const itemsHi = hasCount ? ` · ${n} आइटम` : "";
      return {
        title: { en: "New order 🔔", hi: "नया ऑर्डर 🔔" },
        body: {
          en: `Order #${id}${itemsEn} is waiting for you to accept.`,
          hi: `ऑर्डर #${id}${itemsHi} आपके स्वीकार करने का इंतज़ार कर रहा है।`,
        },
        url: "/vendor",
      };
    }
    case "vendor.order_cancelled":
      return {
        title: e.byAdmin
          ? { en: "Order cancelled by support", hi: "सपोर्ट ने ऑर्डर रद्द किया" }
          : { en: "Order cancelled by customer", hi: "ग्राहक ने ऑर्डर रद्द किया" },
        body: {
          en: `Order #${id} was cancelled. Stop preparing it.`,
          hi: `ऑर्डर #${id} रद्द हो गया है। इसे बनाना बंद करें।`,
        },
        url: "/vendor",
      };
    case "vendor.rider_assigned": {
      const name = e.riderName?.trim();
      return {
        title: { en: "Rider on the way to you 🛵", hi: "राइडर आ रहा है 🛵" },
        body: {
          en: `${name || "A rider"} is picking up order #${id}.`,
          hi: `${name || "एक राइडर"} ऑर्डर #${id} लेने आ रहे हैं।`,
        },
        url: "/vendor",
      };
    }
    case "ops.kitchen_slow":
      return {
        title: { en: "Kitchen hasn't accepted ⏱️", hi: "किचन ने स्वीकार नहीं किया ⏱️" },
        body: {
          en: `Order #${id} at ${e.restaurantName} has waited ${e.minutes} min without being accepted. Call the shop.`,
          hi: `${e.restaurantName} पर ऑर्डर #${id} ${e.minutes} मिनट से स्वीकार नहीं हुआ। दुकान को कॉल करें।`,
        },
        url: `/admin/orders/${e.orderId}`,
      };
    case "ops.stuck": {
      const stage = e.status.replace(/_/g, " ");
      return {
        title: { en: "Order stuck — close it out 🧹", hi: "ऑर्डर अटका है — बंद करें 🧹" },
        body: {
          en: `Order #${id} at ${e.restaurantName} has been "${stage}" for ${e.hours} h. Deliver or cancel it so the customer isn't left waiting.`,
          hi: `${e.restaurantName} पर ऑर्डर #${id} ${e.hours} घंटे से "${stage}" है। डिलीवर या रद्द करें।`,
        },
        url: `/admin/orders/${e.orderId}`,
      };
    }
    case "ops.no_rider":
      return {
        title: { en: "No rider yet 🚨", hi: "अभी तक कोई राइडर नहीं 🚨" },
        body: {
          en: `Order #${id} at ${e.restaurantName} has been ready ${e.minutes} min with no rider. Assign one.`,
          hi: `${e.restaurantName} पर ऑर्डर #${id} ${e.minutes} मिनट से तैयार है, कोई राइडर नहीं। किसी को असाइन करें।`,
        },
        url: "/manager",
      };
  }
}
```

- [ ] **Step 4: Write `engine-core.ts`**

```ts
import { pick, type Lang } from "@/lib/i18n/lang";
import { render, RULES, orderIdOf, type Audience, type NotifyEvent, type Rendered } from "./catalog";

/**
 * Steps 3 and 4 of the notification engine: resolve recipients, then fan out
 * to every channel. Pure apart from the injected `deps`, so the guarantees
 * below are tested without a database (scripts/qa/notification-engine.ts):
 *
 *   - in-app is always attempted, and never waits on push or SMS;
 *   - one channel failing never stops another;
 *   - nothing here throws: a notification must never undo the order
 *     transition that triggered it.
 */

export interface Recipient {
  profileId: string;
  onesignalId: string | null;
  /** E.164, e.g. +919876543210. Null for accounts without a phone. */
  phone: string | null;
}

export type ChannelOutcome = "sent" | "skipped" | "failed";

export interface InAppRow {
  profile_id: string;
  kind: string;
  order_id: string | null;
  title_en: string;
  title_hi: string;
  body_en: string;
  body_hi: string;
  url: string;
}

export interface EngineDeps {
  resolve(audience: Audience, e: NotifyEvent): Promise<Recipient[]>;
  inApp(rows: InAppRow[]): Promise<ChannelOutcome>;
  push(recipients: Recipient[], r: Rendered): Promise<ChannelOutcome>;
  sms(recipients: Recipient[], e: NotifyEvent, r: Rendered): Promise<ChannelOutcome>;
  smsEnabled: boolean;
}

export interface NotifyReport {
  kind: NotifyEvent["kind"];
  recipients: number;
  inApp: ChannelOutcome;
  push: ChannelOutcome;
  sms: ChannelOutcome;
}

export function toInAppRows(rs: Recipient[], e: NotifyEvent, r: Rendered): InAppRow[] {
  return rs.map((x) => ({
    profile_id: x.profileId,
    kind: e.kind,
    order_id: orderIdOf(e),
    title_en: r.title.en,
    title_hi: r.title.hi,
    body_en: r.body.en,
    body_hi: r.body.hi,
    url: r.url,
  }));
}

export function pickRow(
  row: Pick<InAppRow, "title_en" | "title_hi" | "body_en" | "body_hi">,
  lang: Lang
): { title: string; body: string } {
  return {
    title: pick(lang, { en: row.title_en, hi: row.title_hi }),
    body: pick(lang, { en: row.body_en, hi: row.body_hi }),
  };
}

/** Unread badge text: nothing at zero, "9+" past nine. */
export function badgeLabel(n: number): string {
  if (n <= 0) return "";
  return n > 9 ? "9+" : String(n);
}

async function settle(task: () => Promise<ChannelOutcome>): Promise<ChannelOutcome> {
  try {
    return await task();
  } catch {
    return "failed";
  }
}

export async function runNotify(e: NotifyEvent, deps: EngineDeps): Promise<NotifyReport> {
  const rule = RULES[e.kind];
  const report: NotifyReport = { kind: e.kind, recipients: 0, inApp: "skipped", push: "skipped", sms: "skipped" };

  let recipients: Recipient[] = [];
  try {
    recipients = await deps.resolve(rule.audience, e);
  } catch {
    return report;
  }
  report.recipients = recipients.length;
  if (recipients.length === 0) return report;

  const rendered = render(e);
  const smsTo = deps.smsEnabled && rule.sms ? recipients.filter((x) => x.phone) : [];

  const [inApp, push, sms] = await Promise.all([
    settle(() => deps.inApp(toInAppRows(recipients, e, rendered))),
    settle(() => deps.push(recipients, rendered)),
    smsTo.length > 0 ? settle(() => deps.sms(smsTo, e, rendered)) : Promise.resolve<ChannelOutcome>("skipped"),
  ]);
  report.inApp = inApp;
  report.push = push;
  report.sms = sms;
  return report;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx tsx scripts/qa/notification-engine.ts`
Expected: all lines `ok`, ends `N passed, 0 failed`.

- [ ] **Step 6: Add the npm script and commit**

Add `"test:notifications": "npx tsx scripts/qa/notification-engine.ts",` to `package.json` scripts after `test:customer-language`.

```bash
git add src/lib/notifications/catalog.ts src/lib/notifications/engine-core.ts scripts/qa/notification-engine.ts package.json
git commit -m "feat(notifications): event catalog, rules and engine core with tests"
```

---

### Task 3: Server wiring — recipients, in-app and push channels, `notify()`

**Files:**
- Create: `src/lib/notifications/recipients.ts`
- Create: `src/lib/notifications/channels/in-app.ts`
- Create: `src/lib/notifications/channels/push.ts`
- Create: `src/lib/notifications/engine.ts`

**Interfaces:**
- Consumes: `EngineDeps`, `Recipient`, `InAppRow`, `ChannelOutcome`, `runNotify` (Task 2); `sendPush`, `isPushConfigured` from `./onesignal`; `createAdminClient` from `@/lib/supabase/admin`; `isMissingTable` from `@/lib/data-access/schema-probe`.
- Produces: `notify(e: NotifyEvent): Promise<void>` (never throws). Task 7 adds `sendSms`.

- [ ] **Step 1: `recipients.ts`**

```ts
import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Audience, NotifyEvent } from "./catalog";
import type { Recipient } from "./engine-core";

/**
 * Step 3: an audience → the people in it. Service-role reads, because the
 * contexts that trigger a notification (a rider advancing a delivery, a
 * webhook, a vendor accepting) cannot see the counterparty under RLS.
 * Same lookups the old notifyCustomer/notifyVendor/notifyDriver/notifyOps did.
 */

type Row = { id: string; onesignal_id: string | null; phone: string | null };

function one<T>(v: T | T[] | null | undefined): T | null {
  return Array.isArray(v) ? (v[0] ?? null) : (v ?? null);
}

const toRecipient = (p: Row): Recipient => ({
  profileId: p.id,
  onesignalId: p.onesignal_id,
  phone: p.phone,
});

export async function resolveRecipients(audience: Audience, e: NotifyEvent): Promise<Recipient[]> {
  const db = createAdminClient();
  switch (audience) {
    case "customer": {
      const { data } = await db
        .from("orders")
        .select("customer:profiles!orders_customer_id_fkey(id, onesignal_id, phone)")
        .eq("id", e.orderId)
        .maybeSingle();
      const c = one(data?.customer as Row | Row[] | null);
      return c ? [toRecipient(c)] : [];
    }
    case "vendor": {
      const { data } = await db
        .from("orders")
        .select("restaurants(owner_id)")
        .eq("id", e.orderId)
        .maybeSingle();
      const ownerId = one(data?.restaurants as { owner_id: string | null } | { owner_id: string | null }[] | null)?.owner_id;
      if (!ownerId) return [];
      const { data: p } = await db.from("profiles").select("id, onesignal_id, phone").eq("id", ownerId).maybeSingle();
      return p ? [toRecipient(p as Row)] : [];
    }
    case "driver": {
      if (!("driverId" in e)) return [];
      const { data: p } = await db.from("profiles").select("id, onesignal_id, phone").eq("id", e.driverId).maybeSingle();
      return p ? [toRecipient(p as Row)] : [];
    }
    case "ops": {
      const { data } = await db.from("profiles").select("id, onesignal_id, phone").in("role", ["admin", "manager"]);
      return ((data ?? []) as Row[]).map(toRecipient);
    }
  }
}
```

- [ ] **Step 2: `channels/in-app.ts`**

```ts
import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { isMissingTable } from "@/lib/data-access/schema-probe";
import type { ChannelOutcome, InAppRow } from "../engine-core";

/** The always-on channel. "skipped" before migration 0054 is applied. */
export async function writeInApp(rows: InAppRow[]): Promise<ChannelOutcome> {
  if (rows.length === 0) return "skipped";
  const { error } = await createAdminClient().from("notifications").insert(rows);
  if (!error) return "sent";
  return isMissingTable(error) ? "skipped" : "failed";
}
```

- [ ] **Step 3: `channels/push.ts`**

```ts
import "server-only";
import { sendPush, isPushConfigured } from "../onesignal";
import type { Rendered } from "../catalog";
import type { ChannelOutcome, Recipient } from "../engine-core";

/** OneSignal, addressed by profile id (external_id) with the stored player id as fallback. */
export async function sendPushTo(rs: Recipient[], r: Rendered): Promise<ChannelOutcome> {
  if (!isPushConfigured) return "skipped";
  const ok = await sendPush(
    { userIds: rs.map((x) => x.profileId), playerIds: rs.map((x) => x.onesignalId) },
    r.title,
    r.body,
    { url: r.url }
  );
  return ok ? "sent" : "failed";
}
```

Before writing this, open `src/lib/notifications/onesignal.ts:166` and confirm what `sendPush` returns. If it returns `Promise<void>`, use `await sendPush(...); return "sent";` and let `settle()` turn a throw into `"failed"`.

- [ ] **Step 4: `engine.ts`**

```ts
import "server-only";
import { runNotify, type EngineDeps } from "./engine-core";
import { resolveRecipients } from "./recipients";
import { writeInApp } from "./channels/in-app";
import { sendPushTo } from "./channels/push";
import type { NotifyEvent } from "./catalog";

/**
 * The notification engine's front door. Callers schedule it through
 * deferNotify(); it never throws.
 */
const deps: EngineDeps = {
  resolve: resolveRecipients,
  inApp: writeInApp,
  push: sendPushTo,
  sms: async () => "skipped",
  smsEnabled: false,
};

export async function notify(e: NotifyEvent): Promise<void> {
  try {
    await runNotify(e, deps);
  } catch {
    // runNotify does not throw; belt and braces.
  }
}
```

- [ ] **Step 5: Type-check and commit**

Run: `npx tsc --noEmit -p .`
Expected: no new errors in `src/lib/notifications/**`.

```bash
git add src/lib/notifications/recipients.ts src/lib/notifications/channels src/lib/notifications/engine.ts
git commit -m "feat(notifications): server wiring for recipients, in-app and push"
```

---

### Task 4: Route `order-events.ts` through the engine

**Files:**
- Modify: `src/lib/notifications/order-events.ts` (whole file)

**Interfaces:**
- Consumes: `notify` (Task 3), `NotifyEvent` (Task 2).
- Produces: unchanged exports. `notifyCustomer`, `notifyVendor`, `notifyDriver`, `notifyOps` and `pushToUser` are deleted. They are private in practice: confirmed on 2026-10-03 that no file outside `order-events.ts` calls them.

- [ ] **Step 1: Confirm nothing outside uses the generic helpers**

Run: `grep -rnE "\bnotify(Customer|Vendor|Driver|Ops)\(" src | grep -v order-events.ts`
Expected: no output. If there is output, keep that helper as a wrapper that calls `sendPush` exactly as today, and note it in the commit.

- [ ] **Step 2: Rewrite the file**

Keep the file's top doc comment, and change its last paragraph to say copy now lives in `catalog.ts`. Keep every per-function doc comment (they record why each message exists). Replace the bodies:

```ts
import "server-only";
import { notify } from "./engine";

/* ---------- customer-facing transitions ---------- */

export function notifyOrderPlaced(orderId: string): Promise<void> {
  return notify({ kind: "order.placed", orderId });
}
export function notifyOrderAccepted(orderId: string, restaurantName?: string): Promise<void> {
  return notify({ kind: "order.accepted", orderId, restaurantName });
}
export function notifyOrderReady(orderId: string): Promise<void> {
  return notify({ kind: "order.ready", orderId });
}
export function notifyOnTheWay(orderId: string): Promise<void> {
  return notify({ kind: "order.on_the_way", orderId });
}
export function notifyDelivered(orderId: string): Promise<void> {
  return notify({ kind: "order.delivered", orderId });
}
export function notifyOrderCancelled(
  orderId: string,
  opts: { byVendor?: boolean; refundQueued?: boolean } = {}
): Promise<void> {
  return notify({ kind: "order.cancelled", orderId, ...opts });
}
export function notifyPaymentFailed(orderId: string): Promise<void> {
  return notify({ kind: "payment.failed", orderId });
}
export function notifyRefundDecided(orderId: string, approved: boolean): Promise<void> {
  return notify({ kind: "refund.decided", orderId, approved });
}
export function notifyRiderArriving(orderId: string, riderName?: string | null): Promise<void> {
  return notify({ kind: "rider.arriving", orderId, riderName });
}

/* ---------- rider-facing ---------- */

export function notifyDriverPickupOffered(
  driverId: string,
  opts: { orderId: string; restaurantName: string; readyInMinutes: number; pickupArea?: string | null }
): Promise<void> {
  return notify({ kind: "driver.pickup_offered", driverId, ...opts });
}
export function notifyDriverPickupReady(
  driverId: string,
  opts: { orderId: string; restaurantName: string }
): Promise<void> {
  return notify({ kind: "driver.pickup_ready", driverId, ...opts });
}
export function notifyDriverAssigned(
  driverId: string,
  opts: { orderId: string; restaurantName: string }
): Promise<void> {
  return notify({ kind: "driver.assigned", driverId, ...opts });
}
export function notifyDriverOrderCancelled(
  driverId: string,
  opts: { orderId: string; pickedUp: boolean }
): Promise<void> {
  return notify({ kind: "driver.order_cancelled", driverId, ...opts });
}

/* ---------- vendor-facing ---------- */

export function notifyVendorNewOrder(orderId: string, itemCount?: number): Promise<void> {
  return notify({ kind: "vendor.new_order", orderId, itemCount });
}
export function notifyVendorOrderCancelled(orderId: string, opts: { byAdmin?: boolean } = {}): Promise<void> {
  return notify({ kind: "vendor.order_cancelled", orderId, ...opts });
}
export function notifyVendorRiderAssigned(orderId: string, riderName?: string | null): Promise<void> {
  return notify({ kind: "vendor.rider_assigned", orderId, riderName });
}

/* ---------- operations ---------- */

export function notifyOpsKitchenSlow(orderId: string, opts: { restaurantName: string; minutes: number }): Promise<void> {
  return notify({ kind: "ops.kitchen_slow", orderId, ...opts });
}
export function notifyOpsStuck(
  orderId: string,
  opts: { restaurantName: string; hours: number; status: string }
): Promise<void> {
  return notify({ kind: "ops.stuck", orderId, ...opts });
}
export function notifyOpsNoRider(orderId: string, opts: { restaurantName: string; minutes: number }): Promise<void> {
  return notify({ kind: "ops.no_rider", orderId, ...opts });
}
```

One behaviour change: the old functions returned early when `!isPushConfigured`. Now in-app rows are written even without OneSignal keys. That is intended (Global Constraints: "In-app is always on").

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit -p .` (expect no new errors) and `npx tsx scripts/qa/notification-engine.ts` (expect 0 failed). Then run `npm run test:qa` **without** E2E against live. If `run-all.sh` step 15 needs live writes, stop before it and ask the owner.

- [ ] **Step 4: Commit**

```bash
git add src/lib/notifications/order-events.ts
git commit -m "refactor(notifications): route every order event through the engine"
```

---

### Task 5: Reading notifications, plus the customer bell and page

**Files:**
- Create: `src/lib/data-access/my-notifications.ts`
- Create: `src/lib/notifications/actions.ts`
- Create: `src/components/notifications/notification-bell.tsx`
- Modify: `src/components/home/home-header.tsx:137-143`
- Modify: `src/app/(customer)/profile/notifications/page.tsx`

**Interfaces:**
- Consumes: `pickRow`, `badgeLabel` (Task 2); table from Task 1; `createClient` from `@/lib/supabase/server` and from `@/lib/supabase/client`; `getLang` from `@/lib/i18n/server`.
- Produces: `interface MyNotification { id; kind; url; title_en; title_hi; body_en; body_hi; created_at; read_at }`, `listMyNotifications(limit?: number): Promise<MyNotification[] | null>` (`null` = table missing), `countMyUnread(): Promise<number>`, server actions `fetchMyNotifications(): Promise<MyNotification[]>` and `markMyNotificationsRead(): Promise<void>`, `<NotificationBell userId lang initialUnread href? />`.

- [ ] **Step 1: `my-notifications.ts`**

```ts
import "server-only";
import { createClient } from "@/lib/supabase/server";
import { isMissingTable } from "@/lib/data-access/schema-probe";

/** The signed-in user's notifications, under RLS (migration 0054: own rows only). */
export interface MyNotification {
  id: string;
  kind: string;
  url: string;
  title_en: string;
  title_hi: string;
  body_en: string;
  body_hi: string;
  created_at: string;
  read_at: string | null;
}

const COLUMNS = "id, kind, url, title_en, title_hi, body_en, body_hi, created_at, read_at";

/** `null` means the table does not exist yet — callers fall back. */
export async function listMyNotifications(limit = 40): Promise<MyNotification[] | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notifications")
    .select(COLUMNS)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) return isMissingTable(error) ? null : [];
  return (data ?? []) as MyNotification[];
}

export async function countMyUnread(): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .is("read_at", null);
  return error ? 0 : (count ?? 0);
}
```

- [ ] **Step 2: `actions.ts`**

```ts
"use server";
import { createClient } from "@/lib/supabase/server";
import { listMyNotifications, type MyNotification } from "@/lib/data-access/my-notifications";

export async function fetchMyNotifications(): Promise<MyNotification[]> {
  return (await listMyNotifications(30)) ?? [];
}

/** RLS limits this to the caller's own rows; the column grant limits it to read_at. */
export async function markMyNotificationsRead(): Promise<void> {
  const supabase = await createClient();
  await supabase.from("notifications").update({ read_at: new Date().toISOString() }).is("read_at", null);
}
```

- [ ] **Step 3: `notification-bell.tsx`**

```tsx
"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { Bell } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { badgeLabel, pickRow } from "@/lib/notifications/engine-core";
import { fetchMyNotifications, markMyNotificationsRead } from "@/lib/notifications/actions";
import type { MyNotification } from "@/lib/data-access/my-notifications";
import type { Lang } from "@/lib/i18n/lang";
import { translator } from "@/lib/i18n/lang";
import { formatIst } from "@/lib/utils/ist-time";

/**
 * The 🔔 at the end of the engine diagram. Live: subscribes to INSERTs on
 * public.notifications for this user (Realtime applies the read-own RLS
 * policy, so nothing else can arrive). With `href` it is a link with a badge
 * (customer header → /profile/notifications); without, it opens a panel.
 */
export function NotificationBell({
  userId,
  lang,
  initialUnread,
  href,
}: {
  userId: string | null;
  lang: Lang;
  initialUnread: number;
  href?: string;
}) {
  const t = translator(lang);
  const [unread, setUnread] = useState(initialUnread);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<MyNotification[] | null>(null);
  const [, start] = useTransition();

  useEffect(() => {
    if (!userId) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `profile_id=eq.${userId}` },
        (payload) => {
          setUnread((n) => n + 1);
          setItems((list) => (list ? [payload.new as MyNotification, ...list] : list));
        }
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId]);

  const badge = badgeLabel(unread);
  const icon = (
    <span className="relative grid size-11 shrink-0 place-items-center rounded-full bg-accent/12 text-accent">
      <Bell className="size-[18px]" />
      {badge ? (
        <span className="absolute -right-0.5 -top-0.5 grid min-w-5 place-items-center rounded-full bg-red-600 px-1 text-[11px] font-bold leading-5 text-white">
          {badge}
        </span>
      ) : null}
    </span>
  );
  const label = t("Notifications", "सूचनाएं");

  if (href) {
    return (
      <Link href={href} aria-label={label} className="press">
        {icon}
      </Link>
    );
  }

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next) {
      start(async () => {
        setItems(await fetchMyNotifications());
        if (unread > 0) {
          await markMyNotificationsRead();
          setUnread(0);
        }
      });
    }
  }

  return (
    <div className="relative">
      <button type="button" aria-label={label} aria-expanded={open} onClick={toggle} className="press">
        {icon}
      </button>
      {open ? (
        <div className="absolute right-0 z-50 mt-2 max-h-[70vh] w-[min(22rem,calc(100vw-2rem))] overflow-y-auto rounded-2xl border border-border bg-surface p-2 shadow-xl">
          {items === null ? (
            <p className="p-4 text-center text-base text-muted">{t("Loading…", "लोड हो रहा है…")}</p>
          ) : items.length === 0 ? (
            <p className="p-4 text-center text-base text-muted">{t("No notifications yet", "अभी कोई सूचना नहीं")}</p>
          ) : (
            items.map((n) => {
              const { title, body } = pickRow(n, lang);
              return (
                <Link key={n.id} href={n.url} onClick={() => setOpen(false)} className="block rounded-xl p-3 hover:bg-surface-2">
                  <p className="text-base font-semibold">{title}</p>
                  <p className="text-sm text-muted">{body}</p>
                  <p className="mt-1 text-xs text-muted">{formatIst(n.created_at)}</p>
                </Link>
              );
            })
          )}
        </div>
      ) : null}
    </div>
  );
}
```

Before using `formatIst`, check its signature in `src/lib/utils/ist-time.ts`. If it needs a format argument, pass the one `profile/notifications/page.tsx` already uses.

- [ ] **Step 4: Customer header**

Read how `home-header.tsx` gets the user and `t`. Replace the `<Link href="/profile/notifications" …><Bell …/></Link>` block (lines 137–143) with:

```tsx
<NotificationBell userId={userId} lang={lang} initialUnread={unread} href="/profile/notifications" />
```

Pass `userId`, `lang` and `unread` down from the server parent that renders `HomeHeader`. Get them from `requireUser()`/profile, `getLang()` and `countMyUnread()`. If `HomeHeader` is rendered from a client tree, add the three props to its props interface and fetch them in the nearest server component. Do not call server data-access from the client component.

- [ ] **Step 5: Customer notifications page**

In `src/app/(customer)/profile/notifications/page.tsx`: call `listMyNotifications()` first. If it returns an array, render it with `pickRow(n, await getLang())`. Use the page's existing card markup with a `BellRing` icon for every row, and call `markMyNotificationsRead()` after rendering via a small client effect or at the top of the server action path. If it returns `null` (table missing), render the existing `listActivity()` feed **unchanged**.

- [ ] **Step 6: Verify against a dev server (read-only on live)**

Run: `npm run dev`, sign in as the demo customer (see the live E2E recipe memory). Check: the bell shows no badge and doesn't crash, and `/profile/notifications` renders. Before the migration you should see the old derived feed. After the migration you should see the stored list, or an empty state.

- [ ] **Step 7: Commit**

```bash
git add src/lib/data-access/my-notifications.ts src/lib/notifications/actions.ts src/components/notifications/notification-bell.tsx src/components/home/home-header.tsx "src/app/(customer)/profile/notifications/page.tsx"
git commit -m "feat(notifications): live bell and stored feed for customers"
```

---

### Task 6: Bell in the vendor, rider, manager and admin portals

**Files:**
- Modify: `src/app/vendor/layout.tsx` (near line 83)
- Modify: `src/components/driver/driver-header.tsx` and `src/app/driver/layout.tsx:60`
- Modify: `src/app/manager/layout.tsx` (near line 49)
- Modify: `src/app/admin/layout.tsx` (near line 74)

**Interfaces:**
- Consumes: `NotificationBell` (panel mode, no `href`), `countMyUnread`, `getLang`.

- [ ] **Step 1: Each layout**

Each layout already has the signed-in id (`profile.id` / `operator.id`, the same value passed to `<OneSignalInit userId=…>`). In each one, add:

```tsx
import { NotificationBell } from "@/components/notifications/notification-bell";
import { countMyUnread } from "@/lib/data-access/my-notifications";
import { getLang } from "@/lib/i18n/server";
// inside the async layout, beside the existing profile/operator load:
const [unread, lang] = await Promise.all([
  isSupabaseConfigured ? countMyUnread() : Promise.resolve(0),
  getLang(),
]);
```

Render `<NotificationBell userId={isSupabaseConfigured ? profile.id : null} lang={lang} initialUnread={unread} />` in the portal's top bar (use `operator.id` in admin). For the rider app, pass `unread` and `lang` into `DriverHeader` and render the bell next to the name. Put it where each portal's existing header actions sit. Read the layout first and place it in the row with the other header icons. Don't add a new header.

- [ ] **Step 2: Verify at phone width**

`npm run dev`, then open each portal at 360px width with Playwright `browser_resize` (360×740) and take a screenshot. Check: the bell is visible, the panel fits inside the screen with no horizontal scroll, and the empty state is in the selected language.

- [ ] **Step 3: Commit**

```bash
git add src/app/vendor/layout.tsx src/app/driver/layout.tsx src/components/driver/driver-header.tsx src/app/manager/layout.tsx src/app/admin/layout.tsx
git commit -m "feat(notifications): live bell in vendor, rider, manager and admin portals"
```

- [ ] **Step 4: Live end-to-end (with owner, after migration)**

With the owner's go-ahead, place one real test order as the demo customer at Saffron Kitchen, following the live E2E recipe. Check that the vendor bell badge goes up without a reload, then accept the order. Check that the customer bell goes up without a reload. Afterwards, cancel the test order through admin.

---

### Task 7: SMS channel (blocked on Task 0 DLT template IDs)

**Files:**
- Create: `src/lib/notifications/channels/sms.ts`
- Modify: `src/lib/notifications/engine.ts`
- Modify: `.env.example`

**Interfaces:**
- Consumes: `Recipient`, `ChannelOutcome`, `NotifyEvent`, `Rendered`; `toLocal10` from `@/lib/auth/phone`; `recordProvider` from `@/lib/obs/emit`.
- Produces: `sendSms(rs, e, r): Promise<ChannelOutcome>`, `smsChannelEnabled: boolean`.

- [ ] **Step 1: Owner registers these three DLT templates** (English, variables as `{#var#}`):

  1. `vendor.new_order`: `Deligro: New order #{#var#} is waiting for you to accept. Open the Deligro Vendor app.`
  2. `driver.assigned`: `Deligro: You have been assigned order #{#var#} from {#var#}. Open the Deligro Rider app.`
  3. `order.cancelled` (customer): `Deligro: Order #{#var#} could not be completed. {#var#}`

  The owner returns three MSG91 template IDs.

- [ ] **Step 2: `channels/sms.ts`**

Check the request shape against the current MSG91 Flow API docs before writing this. The shape below is the v5 `flow` endpoint.

```ts
import "server-only";
import { toLocal10 } from "@/lib/auth/phone";
import { recordProvider } from "@/lib/obs/emit";
import { shortOrderId } from "@/lib/utils/order-map";
import type { NotifyEvent, Rendered } from "../catalog";
import type { ChannelOutcome, Recipient } from "../engine-core";

/**
 * Optional SMS channel (MSG91 Flow, DLT-registered templates). Off unless
 * NOTIFY_SMS_ENABLED=1 and the key is set. Only events whose RULES entry has
 * sms: true reach here, and each needs its own DLT template id.
 *
 * Not recorded anywhere: the phone number or the auth key.
 */
const ENDPOINT = "https://control.msg91.com/api/v5/flow";
const KEY = process.env.MSG91_AUTH_KEY ?? "";

const TEMPLATES: Partial<Record<NotifyEvent["kind"], string | undefined>> = {
  "vendor.new_order": process.env.MSG91_TPL_VENDOR_NEW_ORDER,
  "driver.assigned": process.env.MSG91_TPL_DRIVER_ASSIGNED,
  "order.cancelled": process.env.MSG91_TPL_ORDER_CANCELLED,
};

export const smsChannelEnabled = process.env.NOTIFY_SMS_ENABLED === "1" && KEY.length > 0;

function vars(e: NotifyEvent, r: Rendered): Record<string, string> {
  const id = shortOrderId(e.orderId);
  if (e.kind === "driver.assigned") return { var1: id, var2: e.restaurantName };
  if (e.kind === "order.cancelled") {
    return { var1: id, var2: e.refundQueued ? "Your refund has been requested." : "" };
  }
  return { var1: id };
}

export async function sendSms(rs: Recipient[], e: NotifyEvent, r: Rendered): Promise<ChannelOutcome> {
  const templateId = TEMPLATES[e.kind];
  if (!smsChannelEnabled || !templateId) return "skipped";
  const recipients = rs
    .filter((x) => x.phone)
    .map((x) => ({ mobiles: `91${toLocal10(x.phone as string)}`, ...vars(e, r) }));
  if (recipients.length === 0) return "skipped";

  const started = Date.now();
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { authkey: KEY, "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ template_id: templateId, short_url: "0", recipients }),
      cache: "no-store",
    });
    const ok = res.ok;
    recordProvider("msg91", `sms:${e.kind}`, {
      ok,
      durationMs: Date.now() - started,
      status: res.status,
      detail: ok ? undefined : (await res.text()).slice(0, 200),
    });
    return ok ? "sent" : "failed";
  } catch (err) {
    recordProvider("msg91", `sms:${e.kind}`, { ok: false, durationMs: Date.now() - started, detail: (err as Error).message });
    return "failed";
  }
}
```

Check that `recordProvider`'s first argument accepts `"msg91"`: open `src/lib/obs/types.ts`. If the provider names are a union type, add `"msg91"` to it, and add the provider to the Observability → Notifications page next to `renflair`.

- [ ] **Step 3: Wire into `engine.ts`**

```ts
import { sendSms, smsChannelEnabled } from "./channels/sms";
// in deps:
  sms: sendSms,
  smsEnabled: smsChannelEnabled,
```

- [ ] **Step 4: `.env.example`**

```
# Order SMS (optional channel of the notification engine) — MSG91 Flow, DLT templates.
# Off unless NOTIFY_SMS_ENABLED=1. One template id per event; see
# docs/superpowers/plans/2026-10-03-notification-engine.md Task 7.
# NOTIFY_SMS_ENABLED=1
# MSG91_AUTH_KEY=your-msg91-auth-key
# MSG91_TPL_VENDOR_NEW_ORDER=
# MSG91_TPL_DRIVER_ASSIGNED=
# MSG91_TPL_ORDER_CANCELLED=
```

- [ ] **Step 5: Verify**

Run `npx tsx scripts/qa/notification-engine.ts` (expect 0 failed; the SMS routing tests from Task 2 still cover it). Then, with the owner, set the env on Vercel and place one test order to the owner's own vendor phone. One SMS should arrive, and Observability → Notifications should show a `msg91` row.

- [ ] **Step 6: Commit**

```bash
git add src/lib/notifications/channels/sms.ts src/lib/notifications/engine.ts .env.example src/lib/obs/types.ts
git commit -m "feat(notifications): optional SMS channel via MSG91 DLT templates"
```

---

### Task 8: Wire into the QA pack and release

**Files:**
- Modify: `scripts/qa/run-all.sh`

- [ ] **Step 1: Add the step**

In `run-all.sh`, after step 1 (the pure tests come first), insert the block below and renumber the `N/16` headers to `N/17`:

```bash
echo ""
echo "═══ 2/17 Notification engine ═══"
npx tsx scripts/qa/notification-engine.ts
```

- [ ] **Step 2: Run the pure part of the pack**

Run each of steps 1–9 directly with `npx tsx` (not the E2E/IDOR steps, which touch live). Expected: all pass.

- [ ] **Step 3: Commit**

```bash
git add scripts/qa/run-all.sh
git commit -m "test(qa): run notification engine checks in the QA pack"
```

- [ ] **Step 4: Release note for the owner**

Explain in plain language what changed: "Every portal now has a bell. Notifications are saved, so a missed push can be read later. SMS goes out for new orders, rider assignment and restaurant-declined orders, if SMS is on." No APK rebuild is needed: the APKs load the live site, so a Vercel deploy ships it.

---

## Admin notification management (Tasks 9–11)

The owner chose these three on 2026-10-03 (Task 0). They need Tasks 1–6 done and migration `0054` live. Real SMS switching needs Task 7 too, but Task 10 can ship before Task 7: the switches are then stored and simply have nothing to switch yet.

**Why `notification_settings` and not `role_feature_flags`:** `role_feature_flags` is built for something else. Its `role` check allows only `vendor | manager | driver`, it has per-shop and per-person overrides, and its resolver and catalogue (`src/lib/features/`) are typed to `FEATURES`. An SMS switch is one global boolean per event kind, so reusing that table would mean loosening its constraints and putting events into the feature panel.

---

### Task 9: Sent log (admin)

**Files:**
- Create: `supabase/migrations/0055_notification_log.sql`
- Modify: `src/lib/notifications/catalog.ts` (add `KIND_LABEL`)
- Modify: `src/lib/notifications/engine-core.ts`
- Create: `src/lib/notifications/log-filters.ts`
- Create: `src/lib/notifications/send-log.ts`
- Modify: `src/lib/notifications/channels/in-app.ts`
- Modify: `src/lib/notifications/channels/push.ts`
- Modify: `src/lib/notifications/engine.ts`
- Create: `src/lib/data-access/admin-notification-log.ts`
- Create: `src/components/admin/notification-ui.tsx`
- Create: `src/app/admin/notifications/page.tsx`
- Create: `src/app/admin/notifications/[id]/page.tsx`
- Modify: `src/components/admin/admin-nav.ts`
- Test: `scripts/qa/notification-engine.ts`

**Interfaces:**
- Consumes: `runNotify`, `Recipient`, `InAppRow`, `ChannelOutcome`, `EngineDeps`, `NotifyReport` (Task 2); `writeInApp`, `sendPushTo`, `resolveRecipients` (Task 3); `sendSms`, `smsChannelEnabled` (Task 7); `requireRole` from `@/lib/auth`; `createAdminClient` from `@/lib/supabase/admin`; `isMissingTable`, `isMissingColumn` from `@/lib/data-access/schema-probe`; `PageHeader`, `Section`, `StatusText`, `Tabs`, `Toolbar`, `type TabItem` from `@/components/admin/console`; `EmptyState` from `@/components/admin/admin-ui`; `DataTable`, `type Column` from `@/components/admin/data-table`; `FilterForm`, `SearchField`, `FilterSubmit`, `FilterReset` from `@/components/admin/admin-filters`; `SelectFilter` from `@/components/admin/select-filter`; `formatIst` from `@/lib/utils/ist-time`; `shortOrderId` from `@/lib/utils/order-map`.
- Produces:
  - Tables `public.notification_sends(id uuid pk, kind, order_id uuid null, order_ref text generated, audience text, recipients int, in_app, push, sms text, title_en, title_hi, sent_by uuid null, broadcast_id uuid null, error text null, created_at)` and `public.notification_settings(kind text pk, sms_enabled boolean, updated_by uuid null, updated_at)`, plus column `public.notifications.send_id uuid null`.
  - catalog: `KIND_LABEL: Record<NotifyKind, Bi>`.
  - core: `InAppRow.send_id: string`; `interface SendLogEntry`; `EngineDeps.newId(): string`; `EngineDeps.log(entry: SendLogEntry): Promise<ChannelOutcome>`; `NotifyReport.sendId: string`, `NotifyReport.error: string | null`; `toInAppRows(rs, e, r, sendId)`; `toSendLog(e, rep, r): SendLogEntry`; `audienceOf(e): string`; `chunk<T>(xs: T[], size: number): T[][]`; `combineOutcomes(xs: ChannelOutcome[]): ChannelOutcome`.
  - `log-filters.ts`: `type OrderRef`, `interface WhoQuery`, `interface LogFilters`, `parseOrderRef`, `parseWho`, `istDayRange`, `parseKind`, `parseLogFilters`, `isFiltered`.
  - `writeSendLog(entry: SendLogEntry): Promise<ChannelOutcome>`; `IN_APP_CHUNK = 500`; `PUSH_CHUNK = 2000`.
  - engine: `notifyWithReport(e: NotifyEvent): Promise<NotifyReport | null>`. `notify()` keeps its signature.
  - data access: `interface SendRow`, `interface SendRecipient`, `listSends(f: LogFilters, limit?: number): Promise<{ available: boolean; rows: SendRow[] }>`, `getSend(id: string): Promise<SendDetail | null>`.
  - UI: `NOTIFY_TABS: TabItem[]`, `<NotificationTabs active />`, `<Outcome channel value />`, `audienceText(a: string): string`.

- [ ] **Step 1: Write the migration**

`supabase/migrations/0055_notification_log.sql`:

```sql
-- ============================================================
-- 0055 — Notification admin: sent log, SMS switches, per-person link
-- ------------------------------------------------------------
-- Three things the admin panel needs from the notification engine (0054):
--
--   * notification_sends — one row per engine run (runNotify in
--     src/lib/notifications/engine-core.ts): which event, which order, which
--     audience, how many people, and what happened on each channel. Until
--     now the engine's report was thrown away, so "was the kitchen told?"
--     had no answer. Only the title is copied here; the per-person rows in
--     notifications carry the full text.
--   * notifications.send_id — ties each per-person row to its send, so the
--     log can show who got it and whether they opened it (read_at). There is
--     no FK on purpose: the per-person rows are written in parallel with the
--     log row, and before it.
--   * notification_settings — the admin's SMS on/off per event. No row means
--     the default in catalog.ts RULES. Only events with a DLT template can be
--     switched on; the server action checks that, this table only stores the
--     answer.
--
-- Both new tables are service_role only: RLS on, no policies, every privilege
-- revoked from anon/authenticated (same as 0052). They are reached only
-- through server-only code behind requireRole('admin').
--
-- Requires 0054. Idempotent: safe to re-run.
-- ============================================================

begin;

create table if not exists public.notification_sends (
  id            uuid primary key,
  kind          text        not null check (kind ~ '^[a-z]+\.[a-z_]+$'),
  order_id      uuid        references public.orders(id) on delete set null,
  -- Text form of order_id, so the admin can search by the 8-character short
  -- id (#3F2A9C1E) with a prefix match.
  order_ref     text        generated always as (coalesce(order_id::text, '')) stored,
  audience      text        not null,
  recipients    integer     not null default 0 check (recipients >= 0),
  in_app        text        not null check (in_app in ('sent', 'skipped', 'failed')),
  push          text        not null check (push   in ('sent', 'skipped', 'failed')),
  sms           text        not null check (sms    in ('sent', 'skipped', 'failed')),
  title_en      text,
  title_hi      text,
  sent_by       uuid        references public.profiles(id) on delete set null,
  broadcast_id  uuid,
  error         text,
  created_at    timestamptz not null default now()
);

comment on table public.notification_sends is
  'One row per notification engine run, with each channel''s outcome. service_role only — see migration 0055.';

create index if not exists notification_sends_created_idx
  on public.notification_sends (created_at desc);
create index if not exists notification_sends_kind_idx
  on public.notification_sends (kind, created_at desc);
create index if not exists notification_sends_order_idx
  on public.notification_sends (order_id);
create index if not exists notification_sends_order_ref_idx
  on public.notification_sends (order_ref text_pattern_ops);
create index if not exists notification_sends_broadcast_idx
  on public.notification_sends (broadcast_id)
  where broadcast_id is not null;

alter table public.notification_sends enable row level security;
revoke all on public.notification_sends from anon, authenticated;
grant select, insert, update, delete on public.notification_sends to service_role;

alter table public.notifications add column if not exists send_id uuid;
create index if not exists notifications_send_idx
  on public.notifications (send_id)
  where send_id is not null;

create table if not exists public.notification_settings (
  kind         text primary key check (kind ~ '^[a-z]+\.[a-z_]+$'),
  sms_enabled  boolean     not null,
  updated_by   uuid        references public.profiles(id) on delete set null,
  updated_at   timestamptz not null default now()
);

comment on table public.notification_settings is
  'Admin SMS on/off per notification event. No row = default from catalog.ts RULES. service_role only — see migration 0055.';

alter table public.notification_settings enable row level security;
revoke all on public.notification_settings from anon, authenticated;
grant select, insert, update, delete on public.notification_settings to service_role;

commit;
```

`authenticated` already has `SELECT` on `notifications` (0054), so a user can now also see the `send_id` of their own rows. That is a random id with no meaning outside the admin panel, so this is fine.

- [ ] **Step 2: Commit the migration**

```bash
git add supabase/migrations/0055_notification_log.sql
git commit -m "feat(db): 0055 notification sent log, SMS switches and send_id"
```

- [ ] **Step 3: Owner applies it to live**

Hand the file to the owner. They paste it into the Supabase SQL editor for the production project, **after `0054`**, and run it twice. The second run must also succeed. **Do not run it from this machine:** `.env.local` points at the live database. Then the owner runs:

```sql
select tablename, rowsecurity from pg_tables
 where tablename in ('notification_sends', 'notification_settings');
select count(*) from pg_policies
 where tablename in ('notification_sends', 'notification_settings');
select has_table_privilege('authenticated', 'public.notification_sends', 'select'),
       has_table_privilege('anon', 'public.notification_settings', 'select');
```

Expected: both tables with `rowsecurity = t`, policy count `0`, and `f | f`.

Steps 4 onward can be written before the owner applies the migration. The code works either way: the log reports `skipped` and in-app writes without `send_id`.

- [ ] **Step 4: Write the failing tests**

Make these changes in `scripts/qa/notification-engine.ts`.

Replace the two import lines at the top with:

```ts
import { render, RULES, orderIdOf, KIND_LABEL, type NotifyEvent } from "../../src/lib/notifications/catalog";
import {
  runNotify, toInAppRows, pickRow, badgeLabel, chunk, combineOutcomes,
  type EngineDeps, type Recipient, type InAppRow, type SendLogEntry,
} from "../../src/lib/notifications/engine-core";
import { parseOrderRef, parseWho, istDayRange, parseKind } from "../../src/lib/notifications/log-filters";
```

Below `const DRV = …`, add:

```ts
const SID = "5e0d0000-0000-4000-8000-000000000001";
```

Replace the `const rows = toInAppRows(...)` line and the `check("one row per recipient", …)` line with:

```ts
const rows = toInAppRows([one], SAMPLES["order.ready"], render(SAMPLES["order.ready"]), SID);
check("one row per recipient", rows.length === 1 && rows[0].profile_id === "p1" && rows[0].kind === "order.ready" && rows[0].order_id === OID);
check("in-app row carries the send id", rows[0].send_id === SID);
```

After the `badge 12 is 9+` check, add:

```ts
// --- sent-log helpers ---
for (const k of Object.keys(RULES) as (keyof typeof RULES)[]) {
  check(`${k}: label is Hindi + English`, DEV.test(KIND_LABEL[k].hi) && !DEV.test(KIND_LABEL[k].en));
}
check("chunk 1201 by 500", chunk(Array.from({ length: 1201 }, (_, i) => i), 500).map((c) => c.length).join(",") === "500,500,201");
check("chunk of nothing is nothing", chunk([], 500).length === 0);
check("combine: all sent", combineOutcomes(["sent", "sent"]) === "sent");
check("combine: one failed is failed", combineOutcomes(["sent", "failed"]) === "failed");
check("combine: sent + skipped is sent", combineOutcomes(["sent", "skipped"]) === "sent");
check("combine: all skipped", combineOutcomes(["skipped", "skipped"]) === "skipped");
check("combine: empty is skipped", combineOutcomes([]) === "skipped");

const full = parseOrderRef("3F2A9C1E-0000-4000-8000-000000000001");
check("full order id is matched exactly", full?.kind === "full" && full.id === OID);
const short = parseOrderRef("#3F2A9C1E");
check("short id with # is a prefix", short?.kind === "prefix" && short.prefix === "3f2a9c1e");
check("too short order id is ignored", parseOrderRef("3f") === null);
check("non-hex order id is ignored", parseOrderRef("hello") === null);
check("phone with +91 and spaces", parseWho("+91 98765 43210")?.phone === "9876543210");
check("part of a phone", parseWho("98765")?.phone === "98765");
check("name keeps letters", parseWho("Ravi K.")?.name === "Ravi K");
check("Hindi name kept", parseWho("रवि")?.name === "रवि");
check("wildcards stripped", parseWho("%_") === null);
const day = istDayRange("2026-10-03");
check("IST day starts at 18:30 UTC the day before", day?.from === "2026-10-02T18:30:00.000Z" && day?.to === "2026-10-03T18:30:00.000Z");
check("impossible date ignored", istDayRange("2026-02-30") === null && istDayRange("2026-13-40") === null);
check("known kind accepted", parseKind("vendor.new_order") === "vendor.new_order");
check("unknown kind ignored", parseKind("drop table") === null && parseKind("constructor") === null);
```

Replace the whole `function fakeDeps(...) { ... }` with:

```ts
function fakeDeps(over: Partial<EngineDeps> & { recipients?: Recipient[] } = {}) {
  const log = { inApp: [] as InAppRow[], push: 0, sms: [] as string[], sends: [] as SendLogEntry[] };
  const deps: EngineDeps = {
    resolve: async () => over.recipients ?? [one],
    inApp: async (r) => { log.inApp.push(...r); return "sent"; },
    push: async () => { log.push++; return "sent"; },
    sms: async (rs) => { log.sms.push(...rs.map((x) => x.phone ?? "")); return "sent"; },
    smsEnabled: false,
    newId: () => SID,
    log: async (s) => { log.sends.push(s); return "sent"; },
    ...over,
  };
  return { deps, log };
}
```

Inside `main()`, before `console.log(\`\n${passed} passed…`, add:

```ts
  // --- sent log ---
  {
    const { deps, log } = fakeDeps();
    const rep = await runNotify(SAMPLES["order.ready"], deps);
    const s = log.sends[0];
    check("one log row per call", log.sends.length === 1);
    check("log row carries the outcomes",
      s?.id === SID && s.kind === "order.ready" && s.order_id === OID && s.audience === "customer" &&
      s.recipients === 1 && s.in_app === "sent" && s.push === "sent" && s.sms === "skipped" && s.error === null);
    check("log row carries the title", s?.title_hi === render(SAMPLES["order.ready"]).title.hi);
    check("report and in-app rows share the send id", rep.sendId === SID && log.inApp[0]?.send_id === SID);
  }
  {
    const { deps, log } = fakeDeps({ push: async () => { throw new Error("onesignal down"); } });
    await runNotify(SAMPLES["order.ready"], deps);
    check("log records a failed push", log.sends[0]?.push === "failed" && log.sends[0]?.in_app === "sent");
  }
  {
    const { deps, log } = fakeDeps({ log: async () => { throw new Error("log table down"); } });
    let threw = false;
    try { await runNotify(SAMPLES["order.ready"], deps); } catch { threw = true; }
    check("log failure does not throw", !threw && log.inApp.length === 1 && log.push === 1);
  }
  {
    const { deps, log } = fakeDeps({ resolve: async () => { throw new Error("db down"); } });
    await runNotify(SAMPLES["order.ready"], deps);
    check("resolver failure is logged", log.sends.length === 1 && log.sends[0].error === "resolve_failed" && log.sends[0].recipients === 0);
  }
  {
    const { deps, log } = fakeDeps({ recipients: [] });
    await runNotify(SAMPLES["ops.no_rider"], deps);
    check("zero recipients is logged", log.sends.length === 1 && log.sends[0].recipients === 0 && log.sends[0].audience === "ops");
  }
```

- [ ] **Step 5: Run the tests to verify they fail**

Run: `npx tsx scripts/qa/notification-engine.ts`
Expected: FAIL. The run stops on the first missing piece, with either `does not provide an export named 'KIND_LABEL'` or `Cannot find module '../../src/lib/notifications/log-filters'`.

- [ ] **Step 6: `KIND_LABEL` in `catalog.ts`**

Add below `RULES`:

```ts
/**
 * What each event is called in the admin panel (sent log, SMS switches).
 * Hindi first: the people reading the panel are in Bemetara.
 */
export const KIND_LABEL: Record<NotifyKind, Bi> = {
  "order.placed": { hi: "ऑर्डर भेजा गया", en: "Order placed" },
  "order.accepted": { hi: "ऑर्डर स्वीकार हुआ", en: "Order accepted" },
  "order.ready": { hi: "खाना तैयार", en: "Food ready" },
  "order.on_the_way": { hi: "ऑर्डर रास्ते में", en: "On the way" },
  "order.delivered": { hi: "डिलीवर हो गया", en: "Delivered" },
  "order.cancelled": { hi: "ऑर्डर रद्द (ग्राहक को)", en: "Order cancelled (customer)" },
  "payment.failed": { hi: "भुगतान नहीं हुआ", en: "Payment failed" },
  "refund.decided": { hi: "रिफ़ंड का फ़ैसला", en: "Refund decided" },
  "rider.arriving": { hi: "राइडर पहुँच गया", en: "Rider arriving" },
  "driver.pickup_offered": { hi: "पिकअप आ रहा है (राइडर)", en: "Pickup offered (rider)" },
  "driver.pickup_ready": { hi: "ऑर्डर लेने को तैयार (राइडर)", en: "Pickup ready (rider)" },
  "driver.assigned": { hi: "नई डिलीवरी मिली (राइडर)", en: "Delivery assigned (rider)" },
  "driver.order_cancelled": { hi: "ऑर्डर रद्द (राइडर को)", en: "Order cancelled (rider)" },
  "vendor.new_order": { hi: "नया ऑर्डर (दुकान)", en: "New order (vendor)" },
  "vendor.order_cancelled": { hi: "ऑर्डर रद्द (दुकान को)", en: "Order cancelled (vendor)" },
  "vendor.rider_assigned": { hi: "राइडर आ रहा है (दुकान)", en: "Rider on the way (vendor)" },
  "ops.kitchen_slow": { hi: "किचन ने स्वीकार नहीं किया", en: "Kitchen slow (ops)" },
  "ops.stuck": { hi: "ऑर्डर अटका है", en: "Order stuck (ops)" },
  "ops.no_rider": { hi: "कोई राइडर नहीं", en: "No rider (ops)" },
};
```

- [ ] **Step 7: Engine core: send id, log, chunks**

In `src/lib/notifications/engine-core.ts`:

Add `send_id` as the last field of `InAppRow`:

```ts
  url: string;
  /** Links the row to its notification_sends row (migration 0055). */
  send_id: string;
}
```

Replace `EngineDeps` and `NotifyReport` with the code below, and add `SendLogEntry`:

```ts
export interface EngineDeps {
  resolve(audience: Audience, e: NotifyEvent): Promise<Recipient[]>;
  inApp(rows: InAppRow[]): Promise<ChannelOutcome>;
  push(recipients: Recipient[], r: Rendered): Promise<ChannelOutcome>;
  sms(recipients: Recipient[], e: NotifyEvent, r: Rendered): Promise<ChannelOutcome>;
  smsEnabled: boolean;
  /** A fresh uuid for this run: the notification_sends id and every row's send_id. */
  newId(): string;
  /** Writes the sent-log row. "skipped" before migration 0055. */
  log(entry: SendLogEntry): Promise<ChannelOutcome>;
}

export interface NotifyReport {
  sendId: string;
  kind: NotifyEvent["kind"];
  recipients: number;
  inApp: ChannelOutcome;
  push: ChannelOutcome;
  sms: ChannelOutcome;
  /** "resolve_failed" when nobody could be looked up; null otherwise. */
  error: string | null;
}

/** One row of notification_sends (migration 0055). */
export interface SendLogEntry {
  id: string;
  kind: string;
  order_id: string | null;
  audience: string;
  recipients: number;
  in_app: ChannelOutcome;
  push: ChannelOutcome;
  sms: ChannelOutcome;
  title_en: string | null;
  title_hi: string | null;
  sent_by: string | null;
  broadcast_id: string | null;
  error: string | null;
}
```

Replace `toInAppRows` with:

```ts
export function toInAppRows(rs: Recipient[], e: NotifyEvent, r: Rendered, sendId: string): InAppRow[] {
  return rs.map((x) => ({
    profile_id: x.profileId,
    kind: e.kind,
    order_id: orderIdOf(e),
    title_en: r.title.en,
    title_hi: r.title.hi,
    body_en: r.body.en,
    body_hi: r.body.hi,
    url: r.url,
    send_id: sendId,
  }));
}
```

Add after `badgeLabel`:

```ts
/** Split a list into runs of `size` (DB inserts of 500, OneSignal sends of 2000). */
export function chunk<T>(xs: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < xs.length; i += size) out.push(xs.slice(i, i + size));
  return out;
}

/** One outcome for a channel that ran in several chunks: any failure is a failure. */
export function combineOutcomes(xs: ChannelOutcome[]): ChannelOutcome {
  if (xs.includes("failed")) return "failed";
  if (xs.includes("sent")) return "sent";
  return "skipped";
}

/** The audience as the sent log names it. */
export function audienceOf(e: NotifyEvent): string {
  return RULES[e.kind].audience;
}

export function toSendLog(e: NotifyEvent, rep: NotifyReport, r: Rendered): SendLogEntry {
  return {
    id: rep.sendId,
    kind: e.kind,
    order_id: orderIdOf(e),
    audience: audienceOf(e),
    recipients: rep.recipients,
    in_app: rep.inApp,
    push: rep.push,
    sms: rep.sms,
    title_en: r.title.en,
    title_hi: r.title.hi,
    sent_by: null,
    broadcast_id: null,
    error: rep.error,
  };
}
```

Replace `runNotify` with:

```ts
function newSendId(deps: EngineDeps): string {
  try {
    return deps.newId();
  } catch {
    // randomUUID does not throw in practice; if it ever does, still log.
    return `00000000-0000-4000-8000-${Date.now().toString(16).padStart(12, "0").slice(-12)}`;
  }
}

async function fanOut(e: NotifyEvent, deps: EngineDeps, rendered: Rendered, report: NotifyReport): Promise<void> {
  const rule = RULES[e.kind];
  let recipients: Recipient[] = [];
  try {
    recipients = await deps.resolve(rule.audience, e);
  } catch {
    report.error = "resolve_failed";
    return;
  }
  report.recipients = recipients.length;
  if (recipients.length === 0) return;

  const smsTo = deps.smsEnabled && rule.sms ? recipients.filter((x) => x.phone) : [];

  const [inApp, push, sms] = await Promise.all([
    settle(() => deps.inApp(toInAppRows(recipients, e, rendered, report.sendId))),
    settle(() => deps.push(recipients, rendered)),
    smsTo.length > 0 ? settle(() => deps.sms(smsTo, e, rendered)) : Promise.resolve<ChannelOutcome>("skipped"),
  ]);
  report.inApp = inApp;
  report.push = push;
  report.sms = sms;
}

export async function runNotify(e: NotifyEvent, deps: EngineDeps): Promise<NotifyReport> {
  const report: NotifyReport = {
    sendId: newSendId(deps),
    kind: e.kind,
    recipients: 0,
    inApp: "skipped",
    push: "skipped",
    sms: "skipped",
    error: null,
  };
  const rendered = render(e);
  try {
    await fanOut(e, deps, rendered, report);
  } catch {
    report.error = report.error ?? "engine_error";
  }
  // Last, and never allowed to throw: the log must not cost a notification.
  try {
    await deps.log(toSendLog(e, report, rendered));
  } catch {
    // nothing to do; the notification itself already went out
  }
  return report;
}
```

- [ ] **Step 8: `log-filters.ts`**

```ts
import { RULES, type NotifyKind } from "./catalog";

/**
 * The sent-log filters, read from the URL. Pure, so what an admin types can
 * be tested offline (scripts/qa/notification-engine.ts), and nothing typed
 * reaches a query without being checked.
 */

export type OrderRef = { kind: "full"; id: string } | { kind: "prefix"; prefix: string };

/** Exactly one of the two is set. */
export interface WhoQuery {
  phone: string | null;
  name: string | null;
}

export interface LogFilters {
  order: OrderRef | null;
  who: WhoQuery | null;
  kind: NotifyKind | null;
  date: { from: string; to: string } | null;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** A full order id, or the short id the apps print (#3F2A9C1E), or nothing. */
export function parseOrderRef(raw: string | undefined): OrderRef | null {
  const s = (raw ?? "").trim().toLowerCase().replace(/^#/, "");
  if (UUID.test(s)) return { kind: "full", id: s };
  if (/^[0-9a-f]{4,8}$/.test(s)) return { kind: "prefix", prefix: s };
  return null;
}

/**
 * Four or more digits is a phone search, on the last ten digits so "+91 98765
 * 43210" finds "+919876543210". Anything else is a name. Letters, digits,
 * spaces and Devanagari only, so `%` and `_` can never reach an ilike.
 */
export function parseWho(raw: string | undefined): WhoQuery | null {
  const s = (raw ?? "").slice(0, 60);
  const digits = s.replace(/\D/g, "");
  if (digits.length >= 4) return { phone: digits.slice(-10), name: null };
  const name = s
    .replace(/[^A-Za-z0-9ऀ-ॿ ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 40);
  return name.length >= 2 ? { phone: null, name } : null;
}

/** One India calendar day as a UTC range, or null for anything that is not a real date. */
export function istDayRange(raw: string | undefined): { from: string; to: string } | null {
  const s = (raw ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const from = new Date(`${s}T00:00:00+05:30`);
  if (Number.isNaN(from.getTime())) return null;
  // Rejects dates JavaScript quietly rolls over, like 2026-02-30.
  const back = new Date(from.getTime() + 5.5 * 3_600_000).toISOString().slice(0, 10);
  if (back !== s) return null;
  return { from: from.toISOString(), to: new Date(from.getTime() + 86_400_000).toISOString() };
}

export function parseKind(raw: string | undefined): NotifyKind | null {
  const s = (raw ?? "").trim();
  return Object.prototype.hasOwnProperty.call(RULES, s) ? (s as NotifyKind) : null;
}

export function parseLogFilters(sp: { order?: string; who?: string; kind?: string; date?: string }): LogFilters {
  return {
    order: parseOrderRef(sp.order),
    who: parseWho(sp.who),
    kind: parseKind(sp.kind),
    date: istDayRange(sp.date),
  };
}

export function isFiltered(f: LogFilters): boolean {
  return Boolean(f.order || f.who || f.kind || f.date);
}
```

- [ ] **Step 9: Run the tests to verify they pass**

Run: `npx tsx scripts/qa/notification-engine.ts`
Expected: all lines `ok`, ends `N passed, 0 failed`.

- [ ] **Step 10: Server side: `send-log.ts`, chunked channels, `engine.ts`**

`src/lib/notifications/send-log.ts`:

```ts
import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { isMissingTable } from "@/lib/data-access/schema-probe";
import type { ChannelOutcome, SendLogEntry } from "./engine-core";

/** The sent log (migration 0055). "skipped" before the table exists; never throws. */
export async function writeSendLog(entry: SendLogEntry): Promise<ChannelOutcome> {
  try {
    const { error } = await createAdminClient().from("notification_sends").insert(entry);
    if (!error) return "sent";
    return isMissingTable(error) ? "skipped" : "failed";
  } catch {
    return "failed";
  }
}
```

Replace `src/lib/notifications/channels/in-app.ts` with:

```ts
import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { isMissingColumn, isMissingTable } from "@/lib/data-access/schema-probe";
import { chunk, combineOutcomes, type ChannelOutcome, type InAppRow } from "../engine-core";

/** Rows per insert. A broadcast to every customer is thousands of rows. */
export const IN_APP_CHUNK = 500;

async function insertChunk(rows: InAppRow[]): Promise<ChannelOutcome> {
  const db = createAdminClient();
  const { error } = await db.from("notifications").insert(rows);
  if (!error) return "sent";
  if (isMissingTable(error)) return "skipped";
  // 0054 applied but 0055 not yet: send_id does not exist. PostgREST answers
  // PGRST204 for an unknown column in an insert body. Write the rows without it.
  if (isMissingColumn(error) || error.code === "PGRST204") {
    const bare = rows.map(({ send_id: _sendId, ...rest }) => rest);
    const { error: again } = await db.from("notifications").insert(bare);
    if (!again) return "sent";
    return isMissingTable(again) ? "skipped" : "failed";
  }
  return "failed";
}

/** The always-on channel. "skipped" before migration 0054 is applied. */
export async function writeInApp(rows: InAppRow[]): Promise<ChannelOutcome> {
  if (rows.length === 0) return "skipped";
  const outcomes: ChannelOutcome[] = [];
  for (const part of chunk(rows, IN_APP_CHUNK)) outcomes.push(await insertChunk(part));
  return combineOutcomes(outcomes);
}
```

Replace `src/lib/notifications/channels/push.ts` with the version below. `sendPush` returns `Promise<boolean>`, which was checked in `onesignal.ts` on 2026-10-03. `onesignal.ts` has **no** chunk size today: it sends every external id in one request. OneSignal documents a limit of 2,000 ids per request for `include_aliases`. Check that against the current OneSignal docs before shipping.

```ts
import "server-only";
import { sendPush, isPushConfigured } from "../onesignal";
import { chunk } from "../engine-core";
import type { Rendered } from "../catalog";
import type { ChannelOutcome, Recipient } from "../engine-core";

/** OneSignal's per-request cap on external ids (include_aliases). */
export const PUSH_CHUNK = 2000;

/**
 * OneSignal, addressed by profile id (external_id) with the stored player id
 * as fallback. "sent" when at least one batch reached a device: most of a
 * broadcast's audience may never have allowed notifications, and that is not
 * a failure of the send.
 */
export async function sendPushTo(rs: Recipient[], r: Rendered): Promise<ChannelOutcome> {
  if (!isPushConfigured) return "skipped";
  let reached = false;
  for (const part of chunk(rs, PUSH_CHUNK)) {
    const ok = await sendPush(
      { userIds: part.map((x) => x.profileId), playerIds: part.map((x) => x.onesignalId) },
      r.title,
      r.body,
      { url: r.url }
    );
    reached = reached || ok;
  }
  return reached ? "sent" : "failed";
}
```

Replace `src/lib/notifications/engine.ts` with the code below. If Task 7 is still blocked, leave out the `./channels/sms` import and keep Task 3's two lines `sms: async () => "skipped",` and `smsEnabled: false,`.

```ts
import "server-only";
import { randomUUID } from "node:crypto";
import { runNotify, type EngineDeps, type NotifyReport } from "./engine-core";
import { resolveRecipients } from "./recipients";
import { writeInApp } from "./channels/in-app";
import { sendPushTo } from "./channels/push";
import { sendSms, smsChannelEnabled } from "./channels/sms";
import { writeSendLog } from "./send-log";
import type { NotifyEvent } from "./catalog";

/**
 * The notification engine's front door. Callers schedule notify() through
 * deferNotify(); it never throws. notifyWithReport() is for the admin
 * broadcast, which shows the outcome to the admin.
 */
const deps: EngineDeps = {
  resolve: resolveRecipients,
  inApp: writeInApp,
  push: sendPushTo,
  sms: sendSms,
  smsEnabled: smsChannelEnabled,
  newId: randomUUID,
  log: writeSendLog,
};

export async function notifyWithReport(e: NotifyEvent): Promise<NotifyReport | null> {
  try {
    return await runNotify(e, deps);
  } catch {
    // runNotify does not throw; belt and braces.
    return null;
  }
}

export async function notify(e: NotifyEvent): Promise<void> {
  await notifyWithReport(e);
}
```

- [ ] **Step 11: `admin-notification-log.ts`**

`src/lib/data-access/admin-notification-log.ts`:

```ts
import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { isMissingTable } from "@/lib/data-access/schema-probe";
import type { ChannelOutcome } from "@/lib/notifications/engine-core";
import type { LogFilters, WhoQuery } from "@/lib/notifications/log-filters";

/**
 * Reads for Admin → Notifications. Service-role, because notification_sends
 * is service_role only (0055) and the admin needs everyone's rows. Every
 * caller is an admin page that has called requireRole("admin").
 */

export interface SendRow {
  id: string;
  kind: string;
  order_id: string | null;
  audience: string;
  recipients: number;
  in_app: ChannelOutcome;
  push: ChannelOutcome;
  sms: ChannelOutcome;
  title_en: string | null;
  title_hi: string | null;
  sent_by: string | null;
  broadcast_id: string | null;
  error: string | null;
  created_at: string;
}

export interface SendRecipient {
  profileId: string;
  name: string | null;
  phone: string | null;
  readAt: string | null;
}

export interface SendDetail {
  send: SendRow;
  recipients: SendRecipient[];
  total: number;
  read: number;
}

const COLS =
  "id, kind, order_id, audience, recipients, in_app, push, sms, title_en, title_hi, sent_by, broadcast_id, error, created_at";

function one<T>(v: T | T[] | null | undefined): T | null {
  return Array.isArray(v) ? (v[0] ?? null) : (v ?? null);
}

/** The sends that reached anyone matching a phone or name (newest 500 rows). */
async function sendIdsFor(who: WhoQuery): Promise<string[]> {
  const db = createAdminClient();
  const people = who.phone
    ? db.from("profiles").select("id").ilike("phone", `%${who.phone}%`).limit(50)
    : db.from("profiles").select("id").ilike("full_name", `%${who.name ?? ""}%`).limit(50);
  const { data: found } = await people;
  const ids = ((found ?? []) as { id: string }[]).map((p) => p.id);
  if (ids.length === 0) return [];
  const { data } = await db
    .from("notifications")
    .select("send_id")
    .in("profile_id", ids)
    .not("send_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(500);
  return [...new Set(((data ?? []) as { send_id: string }[]).map((r) => r.send_id))];
}

/** `available: false` means migration 0055 is not applied yet. */
export async function listSends(
  f: LogFilters,
  limit = 100
): Promise<{ available: boolean; rows: SendRow[] }> {
  const db = createAdminClient();
  let q = db.from("notification_sends").select(COLS).order("created_at", { ascending: false }).limit(limit);
  if (f.order) q = f.order.kind === "full" ? q.eq("order_id", f.order.id) : q.like("order_ref", `${f.order.prefix}%`);
  if (f.kind) q = q.eq("kind", f.kind);
  if (f.date) q = q.gte("created_at", f.date.from).lt("created_at", f.date.to);
  if (f.who) {
    const ids = await sendIdsFor(f.who);
    if (ids.length === 0) return { available: true, rows: [] };
    q = q.in("id", ids);
  }
  const { data, error } = await q;
  if (error) return { available: !isMissingTable(error), rows: [] };
  return { available: true, rows: (data ?? []) as SendRow[] };
}

/** One send, the first 200 people it reached, and how many have opened it. */
export async function getSend(id: string): Promise<SendDetail | null> {
  const db = createAdminClient();
  const { data: send, error } = await db.from("notification_sends").select(COLS).eq("id", id).maybeSingle();
  if (error || !send) return null;
  const [list, total, read] = await Promise.all([
    db
      .from("notifications")
      .select("profile_id, read_at, profile:profiles(full_name, phone)")
      .eq("send_id", id)
      .order("read_at", { ascending: false, nullsFirst: false })
      .limit(200),
    db.from("notifications").select("id", { count: "exact", head: true }).eq("send_id", id),
    db.from("notifications").select("id", { count: "exact", head: true }).eq("send_id", id).not("read_at", "is", null),
  ]);
  type Raw = {
    profile_id: string;
    read_at: string | null;
    profile: { full_name: string | null; phone: string | null } | { full_name: string | null; phone: string | null }[] | null;
  };
  const recipients = ((list.data ?? []) as Raw[]).map((r) => {
    const p = one(r.profile);
    return { profileId: r.profile_id, name: p?.full_name ?? null, phone: p?.phone ?? null, readAt: r.read_at };
  });
  return { send: send as SendRow, recipients, total: total.count ?? 0, read: read.count ?? 0 };
}
```

- [ ] **Step 12: `notification-ui.tsx`**

`src/components/admin/notification-ui.tsx`:

```tsx
import { StatusText, Tabs, type TabItem } from "@/components/admin/console";
import type { ChannelOutcome } from "@/lib/notifications/engine-core";

/** The three notification pages. Tasks 10 and 11 each add their tab here. */
export const NOTIFY_TABS: TabItem[] = [
  { href: "/admin/notifications", label: "भेजी गई · Sent" },
];

export function NotificationTabs({ active }: { active: string }) {
  return <Tabs items={NOTIFY_TABS} active={active} label="सूचनाएं · Notifications" />;
}

const OUTCOME: Record<ChannelOutcome, { tone: "green" | "neutral" | "red"; hi: string }> = {
  sent: { tone: "green", hi: "गया" },
  skipped: { tone: "neutral", hi: "नहीं भेजा" },
  failed: { tone: "red", hi: "फ़ेल" },
};

export function Outcome({ channel, value }: { channel: string; value: ChannelOutcome }) {
  const o = OUTCOME[value] ?? OUTCOME.failed;
  return (
    <StatusText tone={o.tone}>
      {channel}: {o.hi}
    </StatusText>
  );
}

const AUDIENCE_HI: Record<string, string> = {
  customer: "ग्राहक",
  vendor: "दुकान",
  driver: "राइडर",
  ops: "एडमिन / मैनेजर",
  // Task 11 broadcasts
  "broadcast:customer": "सभी ग्राहक",
  "broadcast:vendor": "सभी दुकानें",
  "broadcast:driver": "सभी राइडर",
};

export function audienceText(a: string): string {
  return AUDIENCE_HI[a] ?? a;
}
```

- [ ] **Step 13: The sent-log page**

`src/app/admin/notifications/page.tsx`:

```tsx
import Link from "next/link";
import { BellRing } from "lucide-react";
import { PageHeader, Section, Toolbar } from "@/components/admin/console";
import { EmptyState } from "@/components/admin/admin-ui";
import { DataTable, type Column } from "@/components/admin/data-table";
import { FilterForm, FilterReset, FilterSubmit, SearchField } from "@/components/admin/admin-filters";
import { SelectFilter } from "@/components/admin/select-filter";
import { NotificationTabs, Outcome, audienceText } from "@/components/admin/notification-ui";
import { requireRole } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { listSends, type SendRow } from "@/lib/data-access/admin-notification-log";
import { KIND_LABEL, RULES, type NotifyKind } from "@/lib/notifications/catalog";
import { isFiltered, parseLogFilters } from "@/lib/notifications/log-filters";
import { shortOrderId } from "@/lib/utils/order-map";
import { formatIst } from "@/lib/utils/ist-time";

/**
 * Admin → Notifications → Sent. Platform: BOTH, because a list reads fine
 * on a phone.
 *
 * Every run of the notification engine: what was sent, to whom, and how
 * each channel went. Open a row to see each person and whether they opened
 * it. Admin only. The layout checks the role and so does this page, because
 * it shows phone numbers.
 */
export const dynamic = "force-dynamic";

const LIMIT = 100;
const KINDS = Object.keys(RULES) as NotifyKind[];

type Search = { order?: string; who?: string; kind?: string; date?: string };

export default async function NotificationLogPage({ searchParams }: { searchParams: Promise<Search> }) {
  await requireRole("admin");
  const sp = await searchParams;
  const f = parseLogFilters(sp);
  const filtered = isFiltered(f);

  if (!isSupabaseConfigured) {
    return (
      <div className="admin-measure">
        <PageHeader title="सूचनाएं · Notifications" description="Supabase जोड़ें, फिर यहाँ भेजी गई सूचनाएं दिखेंगी।" />
      </div>
    );
  }

  const { available, rows } = await listSends(f, LIMIT);

  const columns: Column<SendRow>[] = [
    {
      key: "what",
      header: "सूचना",
      role: "title",
      cell: (s) => (
        <span className="min-w-0">
          <span className="block truncate text-[13px] font-semibold">
            {KIND_LABEL[s.kind as NotifyKind]?.hi ?? s.kind}
          </span>
          <span className="block truncate text-[11.5px] text-muted">{s.title_hi ?? s.title_en ?? ""}</span>
        </span>
      ),
    },
    {
      key: "when",
      header: "कब",
      width: "w-[130px]",
      cell: (s) => (
        <span className="text-data whitespace-nowrap text-[11.5px] text-muted">
          {formatIst(s.created_at, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}
        </span>
      ),
    },
    {
      key: "order",
      header: "ऑर्डर",
      width: "w-[110px]",
      cell: (s) =>
        s.order_id ? (
          <Link href={`/admin/orders/${s.order_id}`} className="text-data text-[12.5px] font-semibold text-accent-ink hover:underline">
            #{shortOrderId(s.order_id)}
          </Link>
        ) : (
          <span className="text-[11.5px] text-muted">—</span>
        ),
    },
    {
      key: "who",
      header: "किसे",
      width: "w-[160px]",
      cell: (s) => (
        <span className="text-[12.5px]">
          {audienceText(s.audience)} · {s.recipients} लोग
          {s.error ? <span className="block text-[11px] text-deal">नहीं ढूंढ पाए</span> : null}
        </span>
      ),
    },
    {
      key: "channels",
      header: "कैसे गया",
      role: "trailing",
      width: "w-[270px]",
      cell: (s) => (
        <span className="flex flex-wrap gap-x-3 gap-y-1">
          <Outcome channel="ऐप" value={s.in_app} />
          <Outcome channel="पुश" value={s.push} />
          <Outcome channel="SMS" value={s.sms} />
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="सूचनाएं · Notifications"
        description="कौन सी सूचना, किसे, कब और कैसे गई। लाइन खोलें तो हर व्यक्ति और उसने देखा या नहीं, दिखेगा।"
      />
      <NotificationTabs active="/admin/notifications" />

      {!available ? (
        <Section title="अभी चालू नहीं · Not active yet">
          <p className="text-sm text-muted">
            Migration <code>0055_notification_log.sql</code> अभी लाइव डेटाबेस पर नहीं चला है, इसलिए लॉग खाली है।
            मालिक इसे Supabase SQL editor में चलाएं, फिर यह पेज दोबारा खोलें।
          </p>
        </Section>
      ) : null}

      <Toolbar>
        <FilterForm action="/admin/notifications">
          <SearchField name="order" defaultValue={sp.order ?? ""} placeholder="ऑर्डर नंबर · Order #" />
          <SearchField name="who" defaultValue={sp.who ?? ""} placeholder="फ़ोन या नाम · Phone or name" />
          <SelectFilter
            name="kind"
            label="सूचना का प्रकार · Kind"
            value={f.kind ?? ""}
            options={[
              { value: "", label: "सभी सूचनाएं" },
              ...KINDS.map((k) => ({ value: k, label: KIND_LABEL[k].hi })),
            ]}
          />
          <input
            type="date"
            name="date"
            defaultValue={f.date ? (sp.date ?? "") : ""}
            aria-label="तारीख · Date"
            className="h-8 shrink-0 rounded-[var(--c-r)] border border-line bg-surface px-2 text-[12px] text-ink"
          />
          <FilterSubmit label="खोजें" />
        </FilterForm>
        {filtered ? <FilterReset href="/admin/notifications" /> : null}
      </Toolbar>

      <DataTable
        caption="भेजी गई सूचनाएं"
        columns={columns}
        rows={rows}
        rowKey={(s) => s.id}
        rowHref={(s) => `/admin/notifications/${s.id}`}
        minWidth={820}
        empty={
          <EmptyState
            icon={BellRing}
            title={filtered ? "कुछ नहीं मिला" : "अभी कोई सूचना नहीं"}
            description={
              filtered
                ? "इन फ़िल्टर से कोई सूचना नहीं मिली। फ़िल्टर हटाकर देखें।"
                : "ऑर्डर पर जो भी सूचना जाएगी, यहाँ सबसे नई ऊपर दिखेगी।"
            }
            action={
              filtered ? (
                <Link href="/admin/notifications" className="c-btn c-btn-outline press">
                  फ़िल्टर हटाएं
                </Link>
              ) : null
            }
          />
        }
      />
      <p className="text-xs text-muted">सबसे नई {LIMIT} दिखती हैं · Newest {LIMIT} shown</p>
    </div>
  );
}
```

`src/app/admin/notifications/[id]/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import { PageHeader, Section } from "@/components/admin/console";
import { Outcome, audienceText } from "@/components/admin/notification-ui";
import { requireRole } from "@/lib/auth";
import { getSend } from "@/lib/data-access/admin-notification-log";
import { KIND_LABEL, type NotifyKind } from "@/lib/notifications/catalog";
import { shortOrderId } from "@/lib/utils/order-map";
import { formatIst } from "@/lib/utils/ist-time";

/**
 * One send: what it said, how each channel went, and each person with
 * whether they have opened it. "देखा" means read_at is set, which happens
 * when the person opens their bell or the notifications page. Admin only.
 */
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const WHEN: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" };

export default async function NotificationSendPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("admin");
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const detail = await getSend(id);
  if (!detail) notFound();
  const { send, recipients, total, read } = detail;
  const label = KIND_LABEL[send.kind as NotifyKind];

  return (
    <div className="space-y-6">
      <PageHeader
        title={label ? `${label.hi} · ${label.en}` : send.kind}
        description={`${formatIst(send.created_at, WHEN)} · ${audienceText(send.audience)}${send.order_id ? ` · ऑर्डर #${shortOrderId(send.order_id)}` : ""}`}
        back={{ href: "/admin/notifications", label: "सूचनाएं" }}
      />

      <Section title="क्या गया · What was sent">
        <p className="text-base font-semibold text-ink">{send.title_hi ?? "—"}</p>
        <p className="text-sm text-muted">{send.title_en ?? ""}</p>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
          <Outcome channel="ऐप" value={send.in_app} />
          <Outcome channel="पुश" value={send.push} />
          <Outcome channel="SMS" value={send.sms} />
        </div>
        {send.error ? <p className="mt-2 text-sm text-deal">किसे भेजना है, यह नहीं ढूंढ पाए ({send.error})।</p> : null}
      </Section>

      <Section title="किसे गया · Recipients" meta={`${read} ने देखा / ${total} को गया`}>
        {recipients.length === 0 ? (
          <p className="text-sm text-muted">
            ऐप में किसी को नहीं गया। या तो किसी को भेजना ही नहीं था, या यह 0055 लगने से पहले का है।
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {recipients.map((r) => (
              <li key={r.profileId} className="flex items-center justify-between gap-3 py-2.5">
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-ink">{r.name ?? "बिना नाम"}</span>
                  <span className="text-data block text-xs text-muted">{r.phone ?? "फ़ोन नहीं"}</span>
                </span>
                <span className={r.readAt ? "text-xs font-semibold text-green" : "text-xs text-muted"}>
                  {r.readAt ? `देखा · ${formatIst(r.readAt, WHEN)}` : "अभी नहीं देखा"}
                </span>
              </li>
            ))}
          </ul>
        )}
        {total > recipients.length ? (
          <p className="mt-2 text-xs text-muted">पहले {recipients.length} दिख रहे हैं, कुल {total}।</p>
        ) : null}
      </Section>
    </div>
  );
}
```

`PageHeader`'s `back` prop is `{ href: string; label: string }`, checked in `src/components/admin/console/page-header.tsx` on 2026-10-03.

- [ ] **Step 14: Link it from the admin nav**

In `src/components/admin/admin-nav.ts`, add `BellRing` to the `lucide-react` import, after `Banknote`. Then insert this entry into `ADMIN_NAV` right after the `"/admin/cash-ledger"` entry, keeping the two-space `{` indent that `scripts/qa/platform-separation.ts` parses:

```ts
  {
    // Sent log, SMS switches and broadcast (plan 2026-10-03, Tasks 9–11).
    // BOTH: the log is a list and the broadcast form is four fields, so a
    // phone works as well as a desk. No `reach: "console"`, so no
    // ConsoleOnly gate is owed.
    href: "/admin/notifications",
    label: "Notifications",
    icon: BellRing,
    group: "Operations",
    tone: "accent",
    match: (p) => p.startsWith("/admin/notifications"),
  },
```

`ADMIN_PHONE_MENU` is derived from `ADMIN_NAV`, so the phone's Settings menu picks it up with no further edit.

- [ ] **Step 15: Verify**

Run: `npx tsc --noEmit -p .`
Expected: no new errors.

Run: `npx tsx scripts/qa/notification-engine.ts`
Expected: ends `N passed, 0 failed`.

Run: `npm run test:platform`
Expected: passes. The new nav entry is not console-only, so no gate file is needed.

Then run `npm run dev`. These checks only read from live:
1. As the demo admin, open `/admin/notifications`. Before `0055` is applied it shows the "अभी चालू नहीं" notice and an empty table, with no error. After `0055` and one real order event, it shows rows.
2. Filter by the short order id from an order page (`#XXXXXXXX`), then by the demo customer's phone, then by kind, then by today's date. Each filter narrows the list, and "Clear filters" brings everything back.
3. Open a row. The recipient list shows names and phones, with `देखा` against anyone who has opened their bell.
4. **Non-admin check:** sign out, sign in as the demo manager, and open `/admin/notifications` and `/admin/notifications/<any id>`. Both must redirect to the admin sign-in with `?denied=1`.
5. At 360×740 (Playwright `browser_resize`), the filters wrap and the table becomes cards, with no horizontal page scroll.

- [ ] **Step 16: Commit**

```bash
git add src/lib/notifications/catalog.ts src/lib/notifications/engine-core.ts src/lib/notifications/log-filters.ts src/lib/notifications/send-log.ts src/lib/notifications/channels/in-app.ts src/lib/notifications/channels/push.ts src/lib/notifications/engine.ts src/lib/data-access/admin-notification-log.ts src/components/admin/notification-ui.tsx src/app/admin/notifications src/components/admin/admin-nav.ts scripts/qa/notification-engine.ts
git commit -m "feat(notifications): admin sent log with per-channel outcomes and read state"
```

---

### Task 10: SMS switches (admin)

**Files:**
- Modify: `src/lib/notifications/catalog.ts` (add `SMS_SWITCHABLE`, `isSmsSwitchable`)
- Modify: `src/lib/notifications/engine-core.ts` (add `SmsOverrides`, `effectiveSms`, `EngineDeps.smsSwitches`)
- Create: `src/lib/notifications/settings.server.ts`
- Modify: `src/lib/notifications/engine.ts`
- Create: `src/app/admin/notifications/actions.ts`
- Create: `src/app/admin/notifications/sms/page.tsx`
- Create: `src/app/admin/notifications/sms/sms-switches.tsx`
- Modify: `src/components/admin/notification-ui.tsx` (add the tab)
- Test: `scripts/qa/notification-engine.ts`

**Interfaces:**
- Consumes: `RULES`, `KIND_LABEL`, `NotifyKind` (Tasks 2, 9); table `notification_settings` (Task 9, migration 0055); `requireRole` from `@/lib/auth`; `rateLimit` from `@/lib/rate-limit` (`rateLimit(key, limit, windowMs): Promise<{ ok; remaining; resetAt; retryAfter }>`, the same helper `src/app/driver/actions.ts` uses); `Toggle` from `@/components/ui/field`; `NOTIFY_TABS`, `NotificationTabs` (Task 9).
- Produces:
  - catalog: `SMS_SWITCHABLE: NotifyKind[]`, `isSmsSwitchable(k: string): k is NotifyKind`.
  - core: `type SmsOverrides = Partial<Record<NotifyKind, boolean>>`, `effectiveSms(kind: NotifyKind, rule: { sms: boolean }, overrides: SmsOverrides, envOn: boolean): boolean`, `EngineDeps.smsSwitches(): Promise<SmsOverrides>`.
  - server: `loadSmsOverrides(): Promise<SmsOverrides>` (cached 30 s), `readSmsSwitches(): Promise<{ overrides: SmsOverrides; available: boolean }>` (fresh), `writeSmsSwitch(kind: NotifyKind, enabled: boolean, adminId: string): Promise<void>`.
  - action: `setSmsSwitchAction(input: { kind: string; enabled: boolean }): Promise<ActionResult>`, `interface ActionResult { ok: boolean; error?: string }`.

**The rule, in order:** if `NOTIFY_SMS_ENABLED` is off (the env kill switch), there is no SMS at all. If `RULES[kind].sms` is `false`, the event has no DLT template and cannot be switched on. Otherwise the admin's switch decides, and with no switch stored it is on. So `RULES.sms` is both the default and the allow-list.

- [ ] **Step 1: Write the failing tests**

In `scripts/qa/notification-engine.ts`, change the catalog import to:

```ts
import { render, RULES, orderIdOf, KIND_LABEL, SMS_SWITCHABLE, isSmsSwitchable, type NotifyEvent } from "../../src/lib/notifications/catalog";
```

and add `effectiveSms` to the engine-core import list.

In `fakeDeps`, add this line after `log: async (s) => { … },`:

```ts
    smsSwitches: async () => ({}),
```

After the sent-log helper checks (outside `main`), add:

```ts
// --- SMS switches ---
const NEW = "vendor.new_order" as const;
check("env off beats everything", effectiveSms(NEW, RULES[NEW], { [NEW]: true }, false) === false);
check("no template, cannot switch on", effectiveSms("order.ready", RULES["order.ready"], { "order.ready": true }, true) === false);
check("no switch stored follows the rule", effectiveSms(NEW, RULES[NEW], {}, true) === true);
check("admin can switch one off", effectiveSms(NEW, RULES[NEW], { [NEW]: false }, true) === false);
check("switching one off leaves the others", effectiveSms("driver.assigned", RULES["driver.assigned"], { [NEW]: false }, true) === true);
check("switchable list is the three DLT events", SMS_SWITCHABLE.slice().sort().join(",") === "driver.assigned,order.cancelled,vendor.new_order");
check("isSmsSwitchable refuses others", !isSmsSwitchable("order.ready") && !isSmsSwitchable("nope") && !isSmsSwitchable("constructor") && isSmsSwitchable(NEW));
```

Inside `main()`, after the sent-log blocks, add:

```ts
  // --- SMS switches in the engine ---
  {
    const phone: Recipient = { profileId: "p5", onesignalId: null, phone: "+919811111111" };
    const { deps, log } = fakeDeps({ smsEnabled: true, recipients: [phone], smsSwitches: async () => ({ "vendor.new_order": false }) });
    const rep = await runNotify(SAMPLES["vendor.new_order"], deps);
    check("admin switch off stops the sms", log.sms.length === 0 && rep.sms === "skipped" && log.inApp.length === 1);
  }
  {
    const phone: Recipient = { profileId: "p6", onesignalId: null, phone: "+919822222222" };
    const { deps, log } = fakeDeps({ smsEnabled: true, recipients: [phone], smsSwitches: async () => { throw new Error("db down"); } });
    await runNotify(SAMPLES["vendor.new_order"], deps);
    check("switch read failure falls back to the default", log.sms.length === 1);
  }
  {
    let asked = 0;
    const { deps } = fakeDeps({ smsEnabled: false, smsSwitches: async () => { asked++; return {}; } });
    await runNotify(SAMPLES["vendor.new_order"], deps);
    check("switches not read when env is off", asked === 0);
  }
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx tsx scripts/qa/notification-engine.ts`
Expected: FAIL, with either `does not provide an export named 'SMS_SWITCHABLE'` or `effectiveSms is not a function`.

- [ ] **Step 3: Catalog allow-list**

In `catalog.ts`, below `KIND_LABEL`:

```ts
/**
 * Events the admin may switch SMS on or off for: exactly those whose RULES
 * entry says sms: true, because only they have a DLT template (Task 7). The
 * admin switch can never add an SMS that has no template.
 */
export const SMS_SWITCHABLE: NotifyKind[] = (Object.keys(RULES) as NotifyKind[]).filter((k) => RULES[k].sms);

export function isSmsSwitchable(k: string): k is NotifyKind {
  return Object.prototype.hasOwnProperty.call(RULES, k) && RULES[k as NotifyKind].sms;
}
```

- [ ] **Step 4: Engine core**

In `engine-core.ts`, change the catalog import to also bring in `NotifyKind`:

```ts
import { render, RULES, orderIdOf, type Audience, type NotifyEvent, type NotifyKind, type Rendered } from "./catalog";
```

Add above `EngineDeps`:

```ts
/** The admin's SMS switches (notification_settings, migration 0055). Missing = default. */
export type SmsOverrides = Partial<Record<NotifyKind, boolean>>;

/**
 * Whether this event goes by SMS. The env kill switch beats everything; an
 * event without a DLT template (rule.sms false) can never be switched on;
 * otherwise the admin's switch decides, defaulting to on.
 */
export function effectiveSms(kind: NotifyKind, rule: { sms: boolean }, overrides: SmsOverrides, envOn: boolean): boolean {
  if (!envOn) return false;
  if (!rule.sms) return false;
  return overrides[kind] ?? true;
}
```

Add to `EngineDeps`, after `smsEnabled`:

```ts
  /** The admin's SMS switches, cached briefly by the server. Only read when SMS could go out. */
  smsSwitches(): Promise<SmsOverrides>;
```

In `fanOut`, replace the line `const smsTo = deps.smsEnabled && rule.sms ? recipients.filter((x) => x.phone) : [];` with:

```ts
  let overrides: SmsOverrides = {};
  if (deps.smsEnabled && rule.sms) {
    try {
      overrides = await deps.smsSwitches();
    } catch {
      overrides = {}; // cannot read the switches: fall back to the RULES default
    }
  }
  const smsTo = effectiveSms(e.kind, rule, overrides, deps.smsEnabled) ? recipients.filter((x) => x.phone) : [];
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx tsx scripts/qa/notification-engine.ts`
Expected: ends `N passed, 0 failed`. The Task 2 checks `sms only for events whose rule says so` and `sms off by flag sends no sms` still pass.

- [ ] **Step 6: `settings.server.ts`**

```ts
import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { isMissingTable } from "@/lib/data-access/schema-probe";
import { isSmsSwitchable, type NotifyKind } from "./catalog";
import type { SmsOverrides } from "./engine-core";

/**
 * The admin's per-event SMS switches (notification_settings, migration 0055).
 *
 * Cached for 30 s per server instance, because the engine runs on every order
 * transition. A change can therefore take up to 30 s to reach every
 * instance; the admin page says "within a minute".
 *
 * If the read fails, the answer is the last good one, or no overrides (the
 * RULES default). A blip must not silently switch off the vendor's new-order
 * SMS. The opposite risk, an SMS the admin turned off going out for a few
 * seconds, costs a few paise.
 */
const CACHE_MS = 30_000;
let cache: { at: number; value: SmsOverrides; available: boolean } | null = null;

async function load(fresh: boolean): Promise<{ value: SmsOverrides; available: boolean }> {
  if (!isSupabaseConfigured) return { value: {}, available: false };
  if (!fresh && cache && Date.now() - cache.at < CACHE_MS) return cache;
  try {
    const { data, error } = await createAdminClient().from("notification_settings").select("kind, sms_enabled");
    if (error) {
      if (isMissingTable(error)) {
        cache = { at: Date.now(), value: {}, available: false };
        return cache;
      }
      return cache ?? { value: {}, available: true };
    }
    const value: SmsOverrides = {};
    for (const r of (data ?? []) as { kind: string; sms_enabled: boolean }[]) {
      if (isSmsSwitchable(r.kind)) value[r.kind] = r.sms_enabled;
    }
    cache = { at: Date.now(), value, available: true };
    return cache;
  } catch {
    return cache ?? { value: {}, available: true };
  }
}

/** For the engine: cached. */
export async function loadSmsOverrides(): Promise<SmsOverrides> {
  return (await load(false)).value;
}

/** For the admin page: fresh, plus whether 0055 is live. */
export async function readSmsSwitches(): Promise<{ overrides: SmsOverrides; available: boolean }> {
  const r = await load(true);
  return { overrides: r.value, available: r.available };
}

/** Admin write. Callers have checked requireRole("admin") and isSmsSwitchable(kind). */
export async function writeSmsSwitch(kind: NotifyKind, enabled: boolean, adminId: string): Promise<void> {
  const { error } = await createAdminClient()
    .from("notification_settings")
    .upsert(
      { kind, sms_enabled: enabled, updated_by: adminId, updated_at: new Date().toISOString() },
      { onConflict: "kind" }
    );
  if (error) throw error;
  cache = null;
}
```

- [ ] **Step 7: Wire into `engine.ts`**

```ts
import { loadSmsOverrides } from "./settings.server";
// in deps, after smsEnabled:
  smsSwitches: loadSmsOverrides,
```

- [ ] **Step 8: The server action**

`src/app/admin/notifications/actions.ts`:

```ts
"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { isSmsSwitchable } from "@/lib/notifications/catalog";
import { writeSmsSwitch } from "@/lib/notifications/settings.server";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

/**
 * Turn SMS on or off for one event. Admin only (a server action is a public
 * endpoint, so the role is checked here, not only by the layout),
 * rate-limited, and limited to events with a DLT template.
 */
export async function setSmsSwitchAction(input: { kind: string; enabled: boolean }): Promise<ActionResult> {
  const admin = await requireRole("admin");
  if (!isSupabaseConfigured) return { ok: false, error: "डेटाबेस नहीं जुड़ा है। / Supabase is not configured." };

  const limit = await rateLimit(`sms-switch:${admin.id}`, 30, 60_000);
  if (!limit.ok) return { ok: false, error: "बहुत जल्दी-जल्दी बदलाव। थोड़ा रुकें। / Too many changes, wait a moment." };

  const kind = String(input?.kind ?? "");
  if (!isSmsSwitchable(kind)) {
    return { ok: false, error: "इस सूचना का SMS टेम्पलेट नहीं है। / This event has no SMS template." };
  }
  if (typeof input.enabled !== "boolean") return { ok: false, error: "गलत मान। / Invalid value." };

  try {
    await writeSmsSwitch(kind, input.enabled, admin.id);
  } catch {
    return { ok: false, error: "सेव नहीं हुआ। क्या 0055 लाइव पर लगा है? / Could not save. Is migration 0055 applied?" };
  }
  revalidatePath("/admin/notifications/sms");
  return { ok: true };
}
```

- [ ] **Step 9: The page and the switches**

In `src/components/admin/notification-ui.tsx`, add a second entry to `NOTIFY_TABS`:

```ts
  { href: "/admin/notifications/sms", label: "SMS चालू/बंद · SMS" },
```

`src/app/admin/notifications/sms/page.tsx`:

```tsx
import { PageHeader, Section } from "@/components/admin/console";
import { NotificationTabs } from "@/components/admin/notification-ui";
import { requireRole } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { KIND_LABEL, RULES, SMS_SWITCHABLE } from "@/lib/notifications/catalog";
import { effectiveSms } from "@/lib/notifications/engine-core";
import { readSmsSwitches } from "@/lib/notifications/settings.server";
import { SmsSwitches, type SmsSwitchRow } from "./sms-switches";

/**
 * Admin → Notifications → SMS. Platform: BOTH.
 *
 * SMS on or off for each event that has a DLT template. In-app and push are
 * always on and are not listed. The env kill switch NOTIFY_SMS_ENABLED still
 * wins: when it is off, these switches are saved but nothing is sent.
 */
export const dynamic = "force-dynamic";

export default async function SmsSwitchesPage() {
  await requireRole("admin");
  const envOn = process.env.NOTIFY_SMS_ENABLED === "1";
  const { overrides, available } = isSupabaseConfigured
    ? await readSmsSwitches()
    : { overrides: {}, available: false };

  const rows: SmsSwitchRow[] = SMS_SWITCHABLE.map((kind) => ({
    kind,
    labelHi: KIND_LABEL[kind].hi,
    labelEn: KIND_LABEL[kind].en,
    // The admin's own switch, shown whatever the env says; the env is shown separately.
    on: effectiveSms(kind, RULES[kind], overrides, true),
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="SMS चालू / बंद · SMS switches"
        description="किन सूचनाओं पर SMS भी जाए। ऐप की घंटी और पुश हमेशा जाते हैं। बदलाव एक मिनट के अंदर लागू होता है।"
      />
      <NotificationTabs active="/admin/notifications/sms" />

      {!envOn ? (
        <Section title="SMS अभी पूरी तरह बंद है · SMS is off">
          <p className="text-sm text-muted">
            सर्वर पर <code>NOTIFY_SMS_ENABLED</code> चालू नहीं है, इसलिए कोई SMS नहीं जाएगा। यहाँ के स्विच
            सेव होते रहेंगे और उसके चालू होते ही लागू होंगे।
          </p>
        </Section>
      ) : null}

      {!available ? (
        <Section title="अभी चालू नहीं · Not active yet">
          <p className="text-sm text-muted">
            Migration <code>0055_notification_log.sql</code> लाइव पर नहीं लगा है। तब तक हर SMS अपनी पहली
            सेटिंग पर चलता है और यहाँ बदलाव सेव नहीं होंगे।
          </p>
        </Section>
      ) : null}

      <Section title="हर सूचना का SMS · Per event" meta={`${rows.length} सूचनाएं`}>
        <SmsSwitches rows={rows} disabled={!available} />
        <p className="mt-3 text-xs text-muted">
          बाकी सूचनाओं का SMS टेम्पलेट (DLT) नहीं है, इसलिए वे यहाँ नहीं हैं।
        </p>
      </Section>
    </div>
  );
}
```

`src/app/admin/notifications/sms/sms-switches.tsx`:

```tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Toggle } from "@/components/ui/field";
import { setSmsSwitchAction } from "../actions";

export interface SmsSwitchRow {
  kind: string;
  labelHi: string;
  labelEn: string;
  on: boolean;
}

/**
 * Saved the moment it is flipped (no Save button to forget), then the page
 * re-reads so what is shown is what is stored. On a failed save the switch
 * flips back and the reason is shown.
 */
export function SmsSwitches({ rows, disabled }: { rows: SmsSwitchRow[]; disabled: boolean }) {
  const [state, setState] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(rows.map((r) => [r.kind, r.on]))
  );
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function save(kind: string, enabled: boolean) {
    if (disabled || pending) return;
    setError(null);
    setState((s) => ({ ...s, [kind]: enabled }));
    start(async () => {
      const res = await setSmsSwitchAction({ kind, enabled });
      if (!res.ok) {
        setError(res.error ?? "सेव नहीं हुआ। / Could not save.");
        setState((s) => ({ ...s, [kind]: !enabled }));
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      {error ? (
        <p role="alert" className="rounded-lg border border-deal/30 bg-deal-soft px-3 py-2 text-sm font-semibold text-deal">
          {error}
        </p>
      ) : null}
      {rows.map((r) => (
        <Toggle
          key={r.kind}
          label={`${r.labelHi} · ${r.labelEn}`}
          description={state[r.kind] ? "SMS जाएगा" : "SMS बंद — सिर्फ़ ऐप और पुश"}
          checked={state[r.kind]}
          onChange={(v) => save(r.kind, v)}
        />
      ))}
    </div>
  );
}
```

`Toggle` wraps its label text and `Switch` in one `<label>`, which is the shape `scripts/qa/switch-affordance.ts` asserts. Do not pass an `id`.

- [ ] **Step 10: Verify**

Run: `npx tsc --noEmit -p .`
Expected: no new errors.

Run: `npx tsx scripts/qa/notification-engine.ts && npm run test:switch`
Expected: both pass.

Then run `npm run dev` and open `/admin/notifications/sms` as the demo admin. It shows three switches, all on, and the "SMS अभी पूरी तरह बंद है" notice unless `NOTIFY_SMS_ENABLED=1`. **Flipping a switch writes to the live database. Ask the owner first.** With their go-ahead, flip `नया ऑर्डर (दुकान)` off, reload (it stays off), then flip it back on. In the SQL editor, `select * from notification_settings;` shows the row with `updated_by` set to the demo admin's id.

- [ ] **Step 11: Commit**

```bash
git add src/lib/notifications/catalog.ts src/lib/notifications/engine-core.ts src/lib/notifications/settings.server.ts src/lib/notifications/engine.ts src/app/admin/notifications/actions.ts src/app/admin/notifications/sms src/components/admin/notification-ui.tsx scripts/qa/notification-engine.ts
git commit -m "feat(notifications): admin SMS on/off per event, env kill switch kept"
```

---

### Task 11: Broadcast (admin)

**Files:**
- Modify: `src/lib/notifications/catalog.ts` (new event `admin.broadcast`, audience `"broadcast"`, `orderIdOf` returns `string | null`)
- Modify: `src/lib/notifications/engine-core.ts` (`audienceOf`, `toSendLog`)
- Modify: `src/lib/notifications/recipients.ts` (null order id guard, `resolveRoles`, `countBroadcastRecipients`)
- Modify: `src/lib/notifications/channels/sms.ts` (`vars()` null order id guard)
- Create: `src/lib/notifications/broadcast.ts`
- Modify: `src/app/admin/notifications/actions.ts`
- Create: `src/app/admin/notifications/broadcast/page.tsx`
- Create: `src/app/admin/notifications/broadcast/broadcast-form.tsx`
- Modify: `src/components/admin/notification-ui.tsx` (add the tab)
- Test: `scripts/qa/notification-engine.ts`

**Interfaces:**
- Consumes: `notifyWithReport` (Task 9); `isSmsSwitchable` (Task 10); `chunk`, `IN_APP_CHUNK = 500`, `PUSH_CHUNK = 2000` (Task 9); `rateLimit` from `@/lib/rate-limit`; `requireRole` from `@/lib/auth`; `Field`, `fieldCls` from `@/components/ui/field`; `cn` from `@/lib/utils/cn`.
- Produces:
  - catalog: `type BroadcastRole = "customer" | "driver" | "vendor"`; `Audience` gains `"broadcast"`; `NotifyEvent` gains `{ kind: "admin.broadcast"; role: BroadcastRole; title: Bi; body: Bi; sentBy: string; broadcastId: string }`; `BROADCAST_DB_ROLE: Record<BroadcastRole, "customer" | "restaurant" | "driver">`; `BROADCAST_HOME: Record<BroadcastRole, string>`; **`orderIdOf(e: NotifyEvent): string | null`** (was `string`).
  - recipients: `resolveRoles(roles: BroadcastRole[]): Promise<Recipient[]>`, `countBroadcastRecipients(roles: BroadcastRole[]): Promise<{ role: BroadcastRole; count: number }[]>`.
  - `broadcast.ts`: `type BroadcastTarget`, `BROADCAST_TARGETS`, `TITLE_MAX = 60`, `BODY_MAX = 300`, `interface BroadcastInput`, `interface BroadcastDraft`, `type BroadcastCheck`, `rolesFor(target: string): BroadcastRole[] | null`, `checkBroadcast(input: BroadcastInput): BroadcastCheck`.
  - actions: `previewBroadcastAction(input: BroadcastInput): Promise<BroadcastPreview>`, `sendBroadcastAction(input: BroadcastInput): Promise<BroadcastResult>`.

**Design notes:**
- **One event per role.** "सभी को" sends three `admin.broadcast` events, one each for customers, riders and vendors, all sharing one `broadcastId`. Each person's link and the push's tap target are a single URL per OneSignal request, and that URL has to open the right app: `/` for customers, `/driver` for riders, `/vendor` for vendors. The sent log shows the three rows, which can be found together by `broadcast_id`. `resolveRoles()` still takes a list, as asked, so the preview count can cover any mix.
- **Vendors are `profiles.role = 'restaurant'`.** The `user_role` enum is `customer | restaurant | driver | admin | manager` (migrations 0001 and 0022, `Role` in `src/lib/auth.ts`). There is no `vendor` role in the database. `BROADCAST_DB_ROLE` maps it, and a test pins that.
- **Never SMS:** `RULES["admin.broadcast"].sms` is `false`, so `effectiveSms` is always false for it, whatever is stored. `isSmsSwitchable("admin.broadcast")` is false, so it can't even be stored.
- **Sizes:** profiles are read 1,000 at a time (PostgREST's default max rows), in-app rows go in 500 per insert, and push goes 2,000 external ids per OneSignal request (Task 9).

- [ ] **Step 1: Write the failing tests**

In `scripts/qa/notification-engine.ts`:

Change the catalog import to:

```ts
import { render, RULES, orderIdOf, KIND_LABEL, SMS_SWITCHABLE, isSmsSwitchable, BROADCAST_DB_ROLE, type NotifyEvent } from "../../src/lib/notifications/catalog";
import { checkBroadcast, rolesFor, TITLE_MAX } from "../../src/lib/notifications/broadcast";
```

Below `const SID = …`, add:

```ts
const BID = "b0000000-0000-4000-8000-000000000001";
```

Add as the last entry of `SAMPLES`:

```ts
  "admin.broadcast": { kind: "admin.broadcast", role: "customer", title: { en: "Diwali offer", hi: "दिवाली ऑफ़र" }, body: { en: "Free delivery today.", hi: "आज डिलीवरी मुफ़्त है।" }, sentBy: "admin-1", broadcastId: BID },
```

In the `for (const e of Object.values(SAMPLES) …)` loop, replace the `carries its order id` line with:

```ts
  check(`${e.kind}: carries its order id`, e.kind === "admin.broadcast" ? orderIdOf(e) === null : orderIdOf(e) === OID);
```

After the SMS-switch checks (outside `main`), add:

```ts
// --- broadcast ---
const GOOD = { target: "all", titleHi: "दिवाली ऑफ़र", titleEn: "Diwali offer", bodyHi: "आज डिलीवरी मुफ़्त है।", bodyEn: "Free delivery today." };
check("all means the three roles", JSON.stringify(rolesFor("all")) === JSON.stringify(["customer", "driver", "vendor"]));
check("unknown target refused", rolesFor("admin") === null && !checkBroadcast({ ...GOOD, target: "admin" }).ok);
check("good broadcast passes", checkBroadcast(GOOD).ok);
check("missing Hindi title refused", !checkBroadcast({ ...GOOD, titleHi: "   " }).ok);
check("missing English body refused", !checkBroadcast({ ...GOOD, bodyEn: "" }).ok);
check("English typed in the Hindi box refused", !checkBroadcast({ ...GOOD, bodyHi: "Free delivery" }).ok);
check("long title refused", !checkBroadcast({ ...GOOD, titleEn: "x".repeat(TITLE_MAX + 1) }).ok);
const tidied = checkBroadcast({ ...GOOD, titleEn: "  Diwali   offer " });
check("text is tidied", tidied.ok && tidied.draft.title.en === "Diwali offer");
check("error is Hindi first", (() => { const r = checkBroadcast({ ...GOOD, titleHi: "" }); return !r.ok && DEV.test(r.error.hi); })());
check("vendor broadcast targets the restaurant role", BROADCAST_DB_ROLE.vendor === "restaurant" && BROADCAST_DB_ROLE.driver === "driver" && BROADCAST_DB_ROLE.customer === "customer");
check("broadcast never sends sms by rule", RULES["admin.broadcast"].sms === false && !SMS_SWITCHABLE.includes("admin.broadcast"));
check("broadcast cannot be switched to sms", !isSmsSwitchable("admin.broadcast"));
check("broadcast to customers opens the customer app", render(SAMPLES["admin.broadcast"]).url === "/");
check("broadcast to riders opens the rider app", render({ ...SAMPLES["admin.broadcast"], role: "driver" }).url === "/driver");
check("broadcast to vendors opens the vendor app", render({ ...SAMPLES["admin.broadcast"], role: "vendor" }).url === "/vendor");
check("broadcast text is the admin's, unchanged", render(SAMPLES["admin.broadcast"]).body.hi === "आज डिलीवरी मुफ़्त है।");
```

Inside `main()`, after the SMS-switch blocks, add:

```ts
  // --- broadcast in the engine ---
  {
    let audience = "";
    const phone: Recipient = { profileId: "p9", onesignalId: null, phone: "+919833333333" };
    const { deps, log } = fakeDeps({
      smsEnabled: true,
      smsSwitches: async () => ({ "admin.broadcast": true }),
      resolve: async (a) => { audience = a; return [phone]; },
    });
    const rep = await runNotify(SAMPLES["admin.broadcast"], deps);
    const s = log.sends[0];
    check("broadcast resolves the broadcast audience", audience === "broadcast");
    check("broadcast: in-app yes, sms never, logged with sender",
      log.inApp.length === 1 && log.inApp[0].order_id === null && log.sms.length === 0 && rep.sms === "skipped" &&
      s?.audience === "broadcast:customer" && s.sent_by === "admin-1" && s.broadcast_id === BID && s.order_id === null);
  }
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx tsx scripts/qa/notification-engine.ts`
Expected: FAIL, with either `Cannot find module '../../src/lib/notifications/broadcast'` or `does not provide an export named 'BROADCAST_DB_ROLE'`.

- [ ] **Step 3: Catalog: the new event, and `orderIdOf` becomes nullable**

These are the exact edits to `src/lib/notifications/catalog.ts`.

1. Add to the end of the `NotifyEvent` union, after the `ops.no_rider` line (move the `;` to the new last line):

```ts
  | { kind: "admin.broadcast"; role: BroadcastRole; title: Bi; body: Bi; sentBy: string; broadcastId: string };
```

2. Replace `export type Audience = "customer" | "vendor" | "driver" | "ops";` with:

```ts
/** "broadcast": everyone with the event's role (admin.broadcast). Resolved in recipients.ts. */
export type Audience = "customer" | "vendor" | "driver" | "ops" | "broadcast";

/** Who an admin broadcast can go to. */
export type BroadcastRole = "customer" | "driver" | "vendor";

/** The profiles.role behind each broadcast role. Vendors are 'restaurant' in the user_role enum. */
export const BROADCAST_DB_ROLE: Record<BroadcastRole, "customer" | "restaurant" | "driver"> = {
  customer: "customer",
  driver: "driver",
  vendor: "restaurant",
};

/** Where tapping a broadcast opens, per app. */
export const BROADCAST_HOME: Record<BroadcastRole, string> = {
  customer: "/",
  driver: "/driver",
  vendor: "/vendor",
};
```

3. Add as the last entry of `RULES`:

```ts
  "admin.broadcast": { audience: "broadcast", sms: false },
```

4. Add as the last entry of `KIND_LABEL`:

```ts
  "admin.broadcast": { hi: "सबको संदेश", en: "Broadcast" },
```

5. Replace `orderIdOf` with:

```ts
/** The order an event is about; null for admin.broadcast, which has none. */
export function orderIdOf(e: NotifyEvent): string | null {
  return e.kind === "admin.broadcast" ? null : e.orderId;
}
```

6. In `render`, insert this as the first statement, before `const id = shortOrderId(e.orderId);`:

```ts
  if (e.kind === "admin.broadcast") {
    // The admin's own words, both languages, stored as typed (checkBroadcast tidied them).
    return { title: e.title, body: e.body, url: BROADCAST_HOME[e.role] };
  }
```

After this early return, TypeScript narrows `e` to the order events, so `e.orderId` in the rest of `render` still type-checks and the `switch` stays exhaustive.

`toInAppRows` and `toSendLog` already type `order_id` as `string | null`, so they need no change for the nullable `orderIdOf`. Steps 4–6 cover everything else that reads an order id.

- [ ] **Step 4: Engine core: name the broadcast audience and the sender in the log**

In `engine-core.ts`, replace `audienceOf` with:

```ts
/** The audience as the sent log names it: "broadcast:driver" for a broadcast to riders. */
export function audienceOf(e: NotifyEvent): string {
  return e.kind === "admin.broadcast" ? `broadcast:${e.role}` : RULES[e.kind].audience;
}
```

In `toSendLog`, replace the two lines `sent_by: null,` and `broadcast_id: null,` with:

```ts
    sent_by: e.kind === "admin.broadcast" ? e.sentBy : null,
    broadcast_id: e.kind === "admin.broadcast" ? e.broadcastId : null,
```

- [ ] **Step 5: Run the tests to verify the pure parts pass, except `broadcast.ts`**

Run: `npx tsx scripts/qa/notification-engine.ts`
Expected: still FAIL, only on `Cannot find module '../../src/lib/notifications/broadcast'`. Step 7 creates it.

- [ ] **Step 6: `recipients.ts` and `sms.ts`**

In `src/lib/notifications/recipients.ts`:

Change the imports to:

```ts
import { BROADCAST_DB_ROLE, orderIdOf, type Audience, type BroadcastRole, type NotifyEvent } from "./catalog";
```

In `case "customer"` and in `case "vendor"`, add these two lines as the first lines of the block:

```ts
      const orderId = orderIdOf(e);
      if (!orderId) return [];
```

and change `.eq("id", e.orderId)` to `.eq("id", orderId)` in both.

Add this case after `case "ops"`:

```ts
    case "broadcast":
      return e.kind === "admin.broadcast" ? resolveRoles([e.role]) : [];
```

Add at the end of the file:

```ts
/** PostgREST returns at most 1,000 rows per request by default. */
const PAGE = 1000;

/** Everyone with one of these roles, read a page at a time. Throws on a read error (runNotify logs it). */
export async function resolveRoles(roles: BroadcastRole[]): Promise<Recipient[]> {
  const dbRoles = [...new Set(roles.map((r) => BROADCAST_DB_ROLE[r]))];
  if (dbRoles.length === 0) return [];
  const db = createAdminClient();
  const out: Recipient[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await db
      .from("profiles")
      .select("id, onesignal_id, phone")
      .in("role", dbRoles)
      .order("id", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw error;
    const rows = (data ?? []) as Row[];
    out.push(...rows.map(toRecipient));
    if (rows.length < PAGE) break;
  }
  return out;
}

/** How many people each broadcast role reaches, for the confirm step. */
export async function countBroadcastRecipients(
  roles: BroadcastRole[]
): Promise<{ role: BroadcastRole; count: number }[]> {
  const db = createAdminClient();
  return Promise.all(
    roles.map(async (role) => {
      const { count } = await db
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("role", BROADCAST_DB_ROLE[role]);
      return { role, count: count ?? 0 };
    })
  );
}
```

In `src/lib/notifications/channels/sms.ts` (Task 7), add `orderIdOf` to the catalog import (`import { orderIdOf, type NotifyEvent, type Rendered } from "../catalog";`) and replace the first line of `vars()`, `const id = shortOrderId(e.orderId);`, with:

```ts
  const oid = orderIdOf(e);
  if (!oid) return {};
  const id = shortOrderId(oid);
```

A broadcast never reaches `sendSms` (its rule says no SMS, and there is no template for it), but `vars()` must still type-check against the wider union. If Task 7 is not done yet, skip this edit; Task 7 then writes `vars()` this way from the start.

- [ ] **Step 7: `broadcast.ts`**

```ts
import type { Bi } from "@/lib/i18n/lang";
import type { BroadcastRole } from "./catalog";

/**
 * The admin broadcast form, checked. Pure, so the same rules run in the
 * preview, again on send (the server never trusts the preview), and in
 * scripts/qa/notification-engine.ts.
 */

export type BroadcastTarget = BroadcastRole | "all";

export const BROADCAST_TARGETS: { value: BroadcastTarget; label: Bi }[] = [
  { value: "customer", label: { hi: "सभी ग्राहक", en: "All customers" } },
  { value: "driver", label: { hi: "सभी राइडर", en: "All riders" } },
  { value: "vendor", label: { hi: "सभी दुकानें", en: "All vendors" } },
  { value: "all", label: { hi: "सभी को", en: "Everyone" } },
];

/** A push title longer than this is cut off on most Android phones. */
export const TITLE_MAX = 60;
export const BODY_MAX = 300;

export interface BroadcastInput {
  target: string;
  titleHi: string;
  titleEn: string;
  bodyHi: string;
  bodyEn: string;
}

export interface BroadcastDraft {
  roles: BroadcastRole[];
  title: Bi;
  body: Bi;
}

export type BroadcastCheck = { ok: true; draft: BroadcastDraft } | { ok: false; error: Bi };

const DEVANAGARI = /[ऀ-ॿ]/;

/** One line, no control characters, single spaces. */
function tidy(v: unknown): string {
  return typeof v === "string"
    ? v.replace(/[\u0000-\u001F\u007F]+/g, " ").replace(/\s+/g, " ").trim()
    : "";
}

export function rolesFor(target: string): BroadcastRole[] | null {
  if (target === "all") return ["customer", "driver", "vendor"];
  if (target === "customer" || target === "driver" || target === "vendor") return [target];
  return null;
}

export function checkBroadcast(input: BroadcastInput): BroadcastCheck {
  const roles = rolesFor(String(input?.target ?? ""));
  if (!roles) return { ok: false, error: { hi: "किसे भेजना है, चुनें।", en: "Choose who to send to." } };

  const titleHi = tidy(input.titleHi);
  const titleEn = tidy(input.titleEn);
  const bodyHi = tidy(input.bodyHi);
  const bodyEn = tidy(input.bodyEn);

  if (!titleHi || !titleEn || !bodyHi || !bodyEn) {
    return {
      ok: false,
      error: { hi: "शीर्षक और संदेश, हिंदी और English दोनों में लिखें।", en: "Write the title and message in both Hindi and English." },
    };
  }
  if (!DEVANAGARI.test(titleHi) || !DEVANAGARI.test(bodyHi)) {
    return { ok: false, error: { hi: "हिंदी वाले खानों में हिंदी में लिखें।", en: "Write the Hindi boxes in Hindi." } };
  }
  if (titleHi.length > TITLE_MAX || titleEn.length > TITLE_MAX) {
    return { ok: false, error: { hi: `शीर्षक ${TITLE_MAX} अक्षर तक रखें।`, en: `Keep the title to ${TITLE_MAX} characters.` } };
  }
  if (bodyHi.length > BODY_MAX || bodyEn.length > BODY_MAX) {
    return { ok: false, error: { hi: `संदेश ${BODY_MAX} अक्षर तक रखें।`, en: `Keep the message to ${BODY_MAX} characters.` } };
  }
  return { ok: true, draft: { roles, title: { hi: titleHi, en: titleEn }, body: { hi: bodyHi, en: bodyEn } } };
}
```

- [ ] **Step 8: Run the tests to verify they pass**

Run: `npx tsx scripts/qa/notification-engine.ts`
Expected: all lines `ok`, ends `N passed, 0 failed`.

Run: `npx tsc --noEmit -p .`
Expected: no new errors. Any error naming `orderId` on `admin.broadcast` points to a reader that Steps 3–6 missed. Fix it with `orderIdOf(e)` and a null check, not with a cast.

- [ ] **Step 9: The actions**

Replace `src/app/admin/notifications/actions.ts` (from Task 10) with:

```ts
"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { isSmsSwitchable, type BroadcastRole } from "@/lib/notifications/catalog";
import { writeSmsSwitch } from "@/lib/notifications/settings.server";
import { checkBroadcast, type BroadcastDraft, type BroadcastInput } from "@/lib/notifications/broadcast";
import { countBroadcastRecipients } from "@/lib/notifications/recipients";
import { notifyWithReport } from "@/lib/notifications/engine";
import type { ChannelOutcome } from "@/lib/notifications/engine-core";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

const NOT_CONFIGURED = "डेटाबेस नहीं जुड़ा है। / Supabase is not configured.";

/**
 * Turn SMS on or off for one event. Admin only (a server action is a public
 * endpoint, so the role is checked here, not only by the layout),
 * rate-limited, and limited to events with a DLT template.
 */
export async function setSmsSwitchAction(input: { kind: string; enabled: boolean }): Promise<ActionResult> {
  const admin = await requireRole("admin");
  if (!isSupabaseConfigured) return { ok: false, error: NOT_CONFIGURED };

  const limit = await rateLimit(`sms-switch:${admin.id}`, 30, 60_000);
  if (!limit.ok) return { ok: false, error: "बहुत जल्दी-जल्दी बदलाव। थोड़ा रुकें। / Too many changes, wait a moment." };

  const kind = String(input?.kind ?? "");
  if (!isSmsSwitchable(kind)) {
    return { ok: false, error: "इस सूचना का SMS टेम्पलेट नहीं है। / This event has no SMS template." };
  }
  if (typeof input.enabled !== "boolean") return { ok: false, error: "गलत मान। / Invalid value." };

  try {
    await writeSmsSwitch(kind, input.enabled, admin.id);
  } catch {
    return { ok: false, error: "सेव नहीं हुआ। क्या 0055 लाइव पर लगा है? / Could not save. Is migration 0055 applied?" };
  }
  revalidatePath("/admin/notifications/sms");
  return { ok: true };
}

/* ---------------- broadcast ---------------- */

export interface BroadcastPreview extends ActionResult {
  draft?: BroadcastDraft;
  counts?: { role: BroadcastRole; count: number }[];
  total?: number;
}

export interface BroadcastResult extends ActionResult {
  sent?: { role: BroadcastRole; recipients: number; inApp: ChannelOutcome; push: ChannelOutcome }[];
}

/** Check the message and count who it would reach. Sends nothing. */
export async function previewBroadcastAction(input: BroadcastInput): Promise<BroadcastPreview> {
  await requireRole("admin");
  if (!isSupabaseConfigured) return { ok: false, error: NOT_CONFIGURED };
  const checked = checkBroadcast(input);
  if (!checked.ok) return { ok: false, error: `${checked.error.hi} / ${checked.error.en}` };
  try {
    const counts = await countBroadcastRecipients(checked.draft.roles);
    return { ok: true, draft: checked.draft, counts, total: counts.reduce((n, c) => n + c.count, 0) };
  } catch {
    return { ok: false, error: "गिनती नहीं हो पाई। दोबारा कोशिश करें। / Could not count recipients, try again." };
  }
}

/**
 * Send it: in-app + push only, one engine run per role (each opens its own
 * app), all sharing one broadcast id in the sent log. Checked again here,
 * because the preview ran on the client's word. One broadcast per minute
 * across all admins, so a double tap or two admins at once cannot send twice.
 */
export async function sendBroadcastAction(input: BroadcastInput): Promise<BroadcastResult> {
  const admin = await requireRole("admin");
  if (!isSupabaseConfigured) return { ok: false, error: NOT_CONFIGURED };

  const checked = checkBroadcast(input);
  if (!checked.ok) return { ok: false, error: `${checked.error.hi} / ${checked.error.en}` };

  const limit = await rateLimit("admin-broadcast", 1, 60_000);
  if (!limit.ok) {
    return {
      ok: false,
      error: `एक मिनट में एक ही संदेश भेज सकते हैं। ${limit.retryAfter} सेकंड रुकें। / One broadcast per minute. Wait ${limit.retryAfter}s.`,
    };
  }

  const broadcastId = randomUUID();
  const sent: NonNullable<BroadcastResult["sent"]> = [];
  for (const role of checked.draft.roles) {
    const rep = await notifyWithReport({
      kind: "admin.broadcast",
      role,
      title: checked.draft.title,
      body: checked.draft.body,
      sentBy: admin.id,
      broadcastId,
    });
    sent.push({
      role,
      recipients: rep?.recipients ?? 0,
      inApp: rep?.inApp ?? "failed",
      push: rep?.push ?? "failed",
    });
  }
  revalidatePath("/admin/notifications");
  return { ok: true, sent };
}
```

- [ ] **Step 10: The page and the form**

In `src/components/admin/notification-ui.tsx`, add a third entry to `NOTIFY_TABS`:

```ts
  { href: "/admin/notifications/broadcast", label: "सबको संदेश · Broadcast" },
```

`src/app/admin/notifications/broadcast/page.tsx`:

```tsx
import { PageHeader, Section } from "@/components/admin/console";
import { NotificationTabs } from "@/components/admin/notification-ui";
import { requireRole } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { BroadcastForm } from "./broadcast-form";

/**
 * Admin → Notifications → Broadcast. Platform: BOTH (four fields and a button).
 *
 * One message to every customer, rider or vendor, or all of them: in the bell
 * and by push, never by SMS. Write it, preview it with the head count,
 * confirm. Every broadcast appears in the sent log.
 */
export const dynamic = "force-dynamic";
// A broadcast to every customer writes one row per person and pushes in
// batches; give the server action room.
export const maxDuration = 60;

export default async function BroadcastPage() {
  await requireRole("admin");
  return (
    <div className="space-y-6">
      <PageHeader
        title="सबको संदेश · Broadcast"
        description="सभी ग्राहकों, राइडरों या दुकानों को एक संदेश। यह ऐप की घंटी 🔔 और पुश से जाता है, SMS से कभी नहीं।"
      />
      <NotificationTabs active="/admin/notifications/broadcast" />
      {isSupabaseConfigured ? (
        <Section title="संदेश लिखें · Write the message">
          <BroadcastForm />
        </Section>
      ) : (
        <Section title="अभी चालू नहीं · Not active">
          <p className="text-sm text-muted">Supabase जोड़ें, फिर संदेश भेज सकेंगे।</p>
        </Section>
      )}
    </div>
  );
}
```

`src/app/admin/notifications/broadcast/broadcast-form.tsx`:

```tsx
"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { cn } from "@/lib/utils/cn";
import { Field, fieldCls } from "@/components/ui/field";
import { BODY_MAX, BROADCAST_TARGETS, TITLE_MAX, type BroadcastInput } from "@/lib/notifications/broadcast";
import type { BroadcastRole } from "@/lib/notifications/catalog";
import {
  previewBroadcastAction,
  sendBroadcastAction,
  type BroadcastPreview,
  type BroadcastResult,
} from "../actions";

const EMPTY: BroadcastInput = { target: "", titleHi: "", titleEn: "", bodyHi: "", bodyEn: "" };
const ROLE_HI: Record<BroadcastRole, string> = { customer: "ग्राहक", driver: "राइडर", vendor: "दुकानें" };
const OUT_HI = { sent: "गया", skipped: "नहीं भेजा", failed: "फ़ेल" } as const;

/**
 * Write → preview (with the head count) → confirm → result. Any edit after a
 * preview throws the preview away, so what is confirmed is what is sent. The
 * server checks the message again and rate-limits; this is the human step.
 */
export function BroadcastForm() {
  const [input, setInput] = useState<BroadcastInput>(EMPTY);
  const [preview, setPreview] = useState<BroadcastPreview | null>(null);
  const [result, setResult] = useState<BroadcastResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function edit(k: keyof BroadcastInput, v: string) {
    setInput((s) => ({ ...s, [k]: v }));
    setPreview(null);
    setResult(null);
  }

  function onPreview() {
    setError(null);
    start(async () => {
      const p = await previewBroadcastAction(input);
      if (p.ok) setPreview(p);
      else setError(p.error ?? "देख नहीं पाए। / Could not preview.");
    });
  }

  function onSend() {
    setError(null);
    start(async () => {
      const r = await sendBroadcastAction(input);
      if (r.ok) {
        setResult(r);
        setPreview(null);
        setInput(EMPTY);
      } else {
        setError(r.error ?? "भेज नहीं पाए। / Could not send.");
      }
    });
  }

  const total = preview?.total ?? 0;
  const draft = preview?.draft;

  return (
    <div className="space-y-5">
      {result?.ok ? (
        <div role="status" className="rounded-xl border border-green/30 bg-green/10 px-3 py-3 text-sm text-ink">
          <p className="font-semibold">भेज दिया ✅ · Sent</p>
          <ul className="mt-1 space-y-0.5 text-[13px]">
            {(result.sent ?? []).map((s) => (
              <li key={s.role}>
                {ROLE_HI[s.role]}: {s.recipients} लोग · ऐप {OUT_HI[s.inApp]} · पुश {OUT_HI[s.push]}
              </li>
            ))}
          </ul>
          <Link
            href="/admin/notifications?kind=admin.broadcast"
            className="mt-2 inline-block text-[13px] font-semibold text-accent-ink underline-offset-2 hover:underline"
          >
            भेजी गई सूचनाओं में देखें →
          </Link>
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="rounded-lg border border-deal/30 bg-deal-soft px-3 py-2 text-sm font-semibold text-deal">
          {error}
        </p>
      ) : null}

      <fieldset disabled={pending || Boolean(draft)} className="space-y-4">
        <div role="radiogroup" aria-label="किसे भेजना है · Send to" className="flex flex-wrap gap-2">
          {BROADCAST_TARGETS.map((t) => (
            <button
              key={t.value}
              type="button"
              role="radio"
              aria-checked={input.target === t.value}
              onClick={() => edit("target", t.value)}
              className={cn(
                "press min-h-11 rounded-full border px-4 text-sm font-semibold",
                input.target === t.value ? "border-accent bg-accent text-[var(--on-accent)]" : "border-line bg-surface text-ink"
              )}
            >
              {t.label.hi} <span className="font-normal opacity-80">· {t.label.en}</span>
            </button>
          ))}
        </div>

        <Field label={`शीर्षक हिंदी में · Title in Hindi (${input.titleHi.length}/${TITLE_MAX})`} required>
          <input lang="hi" className={fieldCls} value={input.titleHi} maxLength={TITLE_MAX} onChange={(e) => edit("titleHi", e.target.value)} />
        </Field>
        <Field label={`Title in English (${input.titleEn.length}/${TITLE_MAX})`} required>
          <input lang="en" className={fieldCls} value={input.titleEn} maxLength={TITLE_MAX} onChange={(e) => edit("titleEn", e.target.value)} />
        </Field>
        <Field label={`संदेश हिंदी में · Message in Hindi (${input.bodyHi.length}/${BODY_MAX})`} required>
          <textarea lang="hi" rows={3} className={fieldCls} value={input.bodyHi} maxLength={BODY_MAX} onChange={(e) => edit("bodyHi", e.target.value)} />
        </Field>
        <Field label={`Message in English (${input.bodyEn.length}/${BODY_MAX})`} required>
          <textarea lang="en" rows={3} className={fieldCls} value={input.bodyEn} maxLength={BODY_MAX} onChange={(e) => edit("bodyEn", e.target.value)} />
        </Field>
      </fieldset>

      {draft ? (
        <div className="space-y-3 rounded-xl border border-line bg-surface-2 p-3">
          <p className="text-sm font-semibold text-ink">फ़ोन पर ऐसा दिखेगा · Preview</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {[draft.title.hi, draft.title.en].map((title, i) => (
              <div key={i} className="rounded-xl border border-line bg-surface p-3">
                <p className="text-base font-semibold text-ink">{title}</p>
                <p className="text-sm text-muted">{i === 0 ? draft.body.hi : draft.body.en}</p>
              </div>
            ))}
          </div>
          <p className="text-lg font-bold text-ink">कुल {total} लोगों को जाएगा</p>
          <ul className="text-[13px] text-muted">
            {(preview?.counts ?? []).map((c) => (
              <li key={c.role}>
                {ROLE_HI[c.role]}: {c.count}
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted">सिर्फ़ ऐप की घंटी और पुश से। SMS नहीं जाएगा। भेजने के बाद वापस नहीं ले सकते।</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={onSend} disabled={pending || total === 0} className="c-btn c-btn-dark press min-h-11 px-4">
              {pending ? "भेज रहे हैं…" : `हाँ, ${total} लोगों को भेजें · Send`}
            </button>
            <button type="button" onClick={() => setPreview(null)} disabled={pending} className="c-btn c-btn-outline press min-h-11 px-4">
              वापस बदलें · Edit
            </button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={onPreview} disabled={pending} className="c-btn c-btn-dark press min-h-11 px-4">
          {pending ? "देख रहे हैं…" : "पहले देखें · Preview"}
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 11: Verify**

Run: `npx tsc --noEmit -p .`
Expected: no new errors.

Run: `npx tsx scripts/qa/notification-engine.ts && npm run test:platform`
Expected: both pass.

Then run `npm run dev` as the demo admin and open `/admin/notifications/broadcast`. Check these. They only read from live:
1. Pressing "पहले देखें" with an empty form shows the Hindi-first error, and nothing is sent.
2. Typing English into a Hindi box gives "हिंदी वाले खानों में हिंदी में लिखें।".
3. A valid message with "सभी राइडर" shows both preview cards, and a count that matches `select count(*) from profiles where role = 'driver';` in the SQL editor.
4. Editing any field after the preview hides the confirm button.
5. At 360×740 the four target buttons wrap, and the confirm button is at least 44px tall.
6. **Non-admin check:** signed in as the demo manager, `/admin/notifications/broadcast` redirects to the admin sign-in with `?denied=1`.

**Sending writes to the live database and reaches real phones.** Do not press "हाँ, भेजें" on live as a test. The first real send is done by the owner, with a message they actually want sent, aimed at "सभी राइडर" (the smallest group). Afterwards, check together that `/admin/notifications?kind=admin.broadcast` shows one row with `सभी राइडर · N लोग`, and that a rider's bell shows the message without a reload. A second send within 60 s must show "एक मिनट में एक ही संदेश…".

- [ ] **Step 12: Commit**

```bash
git add src/lib/notifications/catalog.ts src/lib/notifications/engine-core.ts src/lib/notifications/recipients.ts src/lib/notifications/channels/sms.ts src/lib/notifications/broadcast.ts src/app/admin/notifications/actions.ts src/app/admin/notifications/broadcast src/components/admin/notification-ui.tsx scripts/qa/notification-engine.ts
git commit -m "feat(notifications): admin broadcast to customers, riders and vendors (in-app + push)"
```

- [ ] **Step 13: Release note for the owner**

Explain in plain language: "Admin → Notifications now shows every notification that went out: to whom, by app, push or SMS, and who opened it. You can switch SMS off for any of the three SMS events. You can send one message to all customers, riders or vendors. It goes by app and push only, never SMS, and only one per minute." No APK rebuild is needed: a Vercel deploy ships it, after the owner has applied `0055`.
