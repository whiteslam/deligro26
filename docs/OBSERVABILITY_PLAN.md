# Deligro — Observability & Incident Centre

**Status:** Built. Phases 1–7 complete; see §15 for what shipped and §16 for what remains
to be done by hand on the database.
**Date:** 2026-09-02
**Decisions:** answered — see §12.

---

## 1. What Deligro actually is

Audited against the tree at `master` (10850f4), not against assumptions.

| Layer | Reality |
| --- | --- |
| Framework | Next.js **16.3.0**, App Router, React 19.2.4, TypeScript, Tailwind v4 |
| Edge/middleware | `src/proxy.ts` — Next 16's `proxy` convention, coarse gate only, deliberately DB-free |
| Backend | Next Route Handlers (33 of them) + Server Actions + `server-only` data-access modules |
| Datastore | Supabase Postgres. **The only datastore.** 32 tables, 45 migrations, RLS everywhere |
| Auth | Supabase Auth, phone OTP (customers) and email/password (staff) |
| Roles | Postgres enum: `customer, restaurant, driver, admin, manager`. `lock_role` trigger prevents self-promotion |
| Deployment | Vercel-style serverless (`0027`'s comment: "across all Vercel serverless instances"). Node 24. No `vercel.json`, no `.github/`, no CI |
| Charts | `recharts` already a dependency, already lazy-loaded (`gmv-chart-lazy.tsx`) |

### Third-party dependencies that can fail

| Service | Module | Failure today |
| --- | --- | --- |
| Razorpay | `lib/payments/razorpay.ts`, 3 routes + webhook | Recorded on `payments.error_code` / `error_description` — the **only** provider failure that is persisted |
| OneSignal push | `lib/notifications/onesignal.ts` | **Silently swallowed.** `sendPush` returns `false` on any throw; `pushToPlayer` catches and discards |
| Renflair SMS | `lib/sms/renflair.ts` | Returns `{sent:false, detail}` — the OTP route sees it, records nothing |
| Google Maps | `lib/maps/loader.ts` | Client-side, unobserved |
| Upstash Redis | `lib/rate-limit.ts` | Optional; silently falls through to Postgres, then to memory |
| Supabase | everywhere | RLS refusals (42501) and missing columns (42703) handled inline |

### What already exists that is observability-shaped

These are good and must be **extended, not replaced** (AGENTS.md "Resolving conflicting or duplicated code"):

- **`src/lib/console-health.ts`** — the sidebar health card. Reports *configuration facts* and
  explicitly refuses to invent liveness numbers. Its doc comment already states the rule this
  whole system must obey: *"a health indicator that reports an invented figure is worse than no
  health indicator at all: it is a green light wired to nothing."* This is the seed of System Health.
- **`src/lib/data-access/schema-probe.ts`** — per-column memory of whether a migration landed.
  This is a *degradation signal* nobody currently surfaces.
- **Order lifecycle timestamps** (`0026`) — `accepted_at`, `ready_at`, `cancelled_at`, stamped by a
  **database trigger**, not the app. Forgery-proof and path-independent. This is already a
  trustworthy event stream for order-health monitoring; it needs reading, not building.
- **`banner_events`** (`0014`) — the existing pattern for an append-only event table with RLS.
- **`app_release_config`** (`0045`) + `lib/releases/app-version.ts` — version tracking exists for
  the two Android apps. Reusable for release correlation on the mobile side.
- **`admin/error.tsx`** — already surfaces `error.digest`, and its comment says the digest "is what
  ties this screen to the server log". **There is no server log to tie it to.** Closing that loop is
  one of the highest-value single changes in this plan.

### What does not exist

No Sentry, no OpenTelemetry, no Datadog, no logging library, no `instrumentation.ts`, no log/audit/
event table beyond `banner_events`, no request IDs, no trace IDs, no metrics, no alerting.

**Total production error visibility today: 28 `console.error` / `console.warn` calls**, going to a
serverless stdout that nobody reads and that is retained by the host for ~1 hour on the hobby tier.

---

## 2. Constraints this stack imposes (read before designing anything)

These are the facts that kill half the naïve designs. Stating them up front so the plan is honest.

1. **There is no long-lived process.** Serverless functions are cold-started and torn down. So:
   in-memory buffering, batching, aggregation daemons and sampling counters **do not survive
   between requests**. Everything must be durable on write or it does not exist.
2. **There is no queue and there are no background workers.** §21 of the brief asks for a job
   dashboard. Deligro has no jobs. What it has is *fire-and-forget async work inside request
   handlers*: `sendPush`, `sendOtpSms`, `dispatchRider`, `notifyCustomer`. These are the real
   analogue and they are exactly the code paths that swallow errors. Monitoring **side-effect
   outcomes** is the honest version of that section; a Jobs page with Pending/Processing/Retrying
   columns would be a fabricated UI.
3. **Host-level metrics are not reachable from app code.** CPU %, memory pressure, connection-pool
   utilisation, deadlocks, and worker health are properties of Vercel's and Supabase's
   infrastructure. `process.memoryUsage()` in a serverless invocation describes one ephemeral
   sandbox and is meaningless as a platform gauge. **These will not be built.** Where the brief asks
   for them (§16, §21), the page will link to the Supabase and Vercel dashboards and say so, rather
   than draw a gauge wired to nothing.
   - The one exception worth doing: `pg_stat_statements` (Supabase can enable it) gives real slow-query
     data. That is a §12 decision because it needs a DB extension.
4. **Writing telemetry to the same Postgres the app depends on is a coupling risk.** If the database
   is the outage, the telemetry about the outage cannot be written. Mitigation: all ingest is
   best-effort and never throws into the request path, *and* System Health derives DB status from
   the app's own query results rather than from the telemetry table — so "database down" is still
   reported when nothing can be logged.
5. **Adding a telemetry write to a hot path adds latency.** Next 16 ships `after()` from
   `next/server` (verified in `node_modules/next/dist/server/after/after.d.ts`), which runs a
   callback *after the response is flushed*. Every ingest write goes through `after()`. The customer
   never waits for a log line.
6. **AGENTS.md rules bind this feature specifically.** Telemetry tables are new tables that will
   hold operational data about real users. Per rule 1 and rule 4: RLS on, **no policies**, all
   privileges revoked from `anon`/`authenticated`, `service_role` only, reached exclusively through
   a `server-only` module behind `requireRole("admin")` — the `rate_limits` (0027) and
   `vendor_login_credentials` (0039) containment pattern. Per rule 2: a broken pipeline reads
   "unknown", never "healthy".

---

## 3. Where Deligro can actually break

Enumerated from the code, with the file that would emit the signal. This list is the specification
for what gets instrumented — not a generic error taxonomy.

### Ordering
| Failure | Where | Observable today? |
| --- | --- | --- |
| Unmapped order-creation failure | `api/orders/route.ts` — the `mapCreateError` default branch | `console.error` only |
| RLS refusal placing an order (wrong role) | same file, `isRlsRefusal` | No |
| Coupon rejection spikes | `lib/data-access/coupons.ts` | No |
| Order stuck in a status | `orders.accepted_at/ready_at` vs `now()` | **Derivable from existing trigger data** |
| Cancellation failure | `api/orders/[id]/cancel/route.ts` | No |
| Tip / online-payment schema not migrated (`503 tip_unsupported`) | `orders.ts` | No |

### Payments
| Failure | Where | Observable today? |
| --- | --- | --- |
| Invalid webhook signature (possible forgery, or a rotated secret) | `payments/razorpay/webhook/route.ts` | No — returns 400 silently |
| Webhook for an unknown order (two envs on one webhook) | same, `unknown_order` branch | No |
| `settlePayment` write failure → **paid money, unpaid order** | `lib/data-access/payments.ts` | 5xx to Razorpay only |
| Razorpay API latency / timeout on order creation | `payments/razorpay/order/route.ts` | No |
| Verify-signature mismatch on the browser callback | `payments/razorpay/verify/route.ts` | No |
| Refund failure | `lib/payments/refunds.ts`, `api/refunds` | No |
| `PaymentsNotMigratedError` | `lib/data-access/payments.ts` | No |

### Delivery
| Failure | Where | Observable today? |
| --- | --- | --- |
| No rider assignable | `lib/dispatch/rider-dispatch.ts` — "swallows its own failures" | No |
| Stale rider fix (older than `MAX_FIX_AGE_MS`) → dispatched blind | same | No |
| Offer expiry → order re-opened to pool | same | No |
| Location update rejected | `api/driver/location/route.ts` | No |
| Order ready with no rider for N minutes | derivable from `ready_at` | Derivable |

### Notifications
| Failure | Where | Observable today? |
| --- | --- | --- |
| OneSignal non-2xx | `onesignal.ts` returns `false` | **Discarded** |
| OneSignal timeout (8s abort) | same `catch` | **Discarded** |
| Customer has no `onesignal_id` (never subscribed) | `pushToPlayer` early return | **Discarded** |
| Renflair SMS rejection → **customer cannot log in** | `renflair.ts` `detail` | Returned, never stored |

### Auth
| Failure | Where |
| --- | --- |
| OTP verify failure rate (brute force vs broken SMS) | `api/auth/otp/verify/route.ts` |
| Rate-limit 429 rate per endpoint | `lib/rate-limit.ts` |
| Rate limiter degraded to in-memory (**cap silently becomes per-instance**) | `rate-limit.ts` — logs once, then permanently quiet |
| Portal access denied (`?denied=1`) | `lib/auth.ts` `requireRole` |

### Platform
| Failure | Where |
| --- | --- |
| Any thrown Server Component / Route Handler / Server Action error | `instrumentation.ts` `onRequestError` (to be added) |
| Client-side React error | `error.tsx` boundaries + `window.onerror` |
| Missing column → silent feature degradation | `schema-probe.ts` `rememberColumn(key, false)` |
| Supabase unreachable | any data-access throw |

---

## 4. Proposed architecture

```
                        ┌─────────────────────────────────────────┐
 REQUEST PATH           │  instrumentation.ts                     │
 ───────────            │   register()      → boot marker, release│
 proxy.ts               │   onRequestError()→ every server throw  │
   └─ mint requestId    └─────────────────────────────────────────┘
      + traceId                        │
      → response header                │
                                       ▼
 route handler ──► withObservability() wrapper
   └─ business logic       │  times the request, catches, tags
        └─ recordProvider()│  emits via  after()  — off the hot path
        └─ recordDomain()  │
                           ▼
                  ┌──────────────────┐   redact()   ┌──────────────────┐
 CLIENT           │  lib/obs/emit.ts │ ───────────► │  obs_events      │  ← raw, 14d, partitioned
 ──────           └──────────────────┘              └──────────────────┘
 error.tsx  ─┐                                               │ fingerprint()
 onerror    ─┼─► POST /api/obs/client  (rate-limited, capped)│
 boundaries ─┘                                               ▼
                                                    ┌──────────────────┐
                                                    │  obs_issues      │  ← grouped, 180d
                                                    └──────────────────┘
                                                             │
 pg_cron ──► rollup (1 min) ──► obs_metrics_rollup           │ evaluate
        └──► retention (daily) ──► drop old partitions       ▼
                                                    ┌──────────────────┐
                                                    │  obs_alert_*     │
                                                    └──────────────────┘
                                                             │
 /admin/observability/*  ── requireRole("admin") ── server-only reads
```

**Design stance:** build in-house on Postgres. Rationale, since §33 asks for it explicitly —

- No observability platform is present, so there is nothing to integrate with.
- Sentry/Datadog would solve errors and traces, but **not** the half of this brief that is
  Deligro-specific: stuck orders, unassigned deliveries, vendor acceptance failures, settlement
  anomalies. Those need joins against `orders`, `deliveries`, `payments`, `restaurants` — which live
  in Postgres. An external APM cannot answer "which 17 orders are stuck".
- The volume is a regional food-delivery platform, not a hyperscaler. Postgres handles this.
- Cost and vendor count stay flat; no new runtime dependency in the request path.

**Recommended addition anyway:** Sentry for *client-side* JS errors is genuinely better than what we
can build (source maps, release health, breadcrumbs). Flagged as an optional §12 decision — the
in-house client ingest below works without it.

---

## 5. Data model

Seven tables, prefix `obs_`. All: RLS enabled, **no policies**, `revoke all from anon, authenticated`,
`grant` to `service_role` only.

### `obs_events` — raw telemetry (hot, short retention)

Partitioned by range on `occurred_at`, one partition per week. Retention is `drop partition`, not
`delete` — deleting millions of rows is precisely the expense §32 warns about.

```
id                bigint identity
occurred_at       timestamptz not null
env               text not null        -- production | preview | development
release           text                 -- VERCEL_GIT_COMMIT_SHA (short)
kind              text not null        -- http | error | provider | db | domain | client | log
level             text not null        -- debug | info | warn | error | fatal
source            text not null        -- 'api/orders' | 'lib/dispatch' | 'client'
message           text not null        -- redacted, truncated 2KB
trace_id          text                 -- trace_<26 char>
request_id        text                 -- req_<26 char>
span_id           text
parent_span_id    text
duration_ms       integer
http_method       text
http_route        text                 -- TEMPLATED: /api/orders/[id]  (never the concrete id)
http_status       smallint
provider          text                 -- razorpay | onesignal | renflair | supabase | maps
error_type        text
error_fingerprint text
stack             text                 -- redacted, truncated 8KB
actor_role        text                 -- + 'anon' | 'guest'
actor_id          uuid
order_id          uuid
restaurant_id     uuid
driver_id         uuid
attrs             jsonb not null default '{}'   -- redacted allowlist only
```

Indexes: BRIN on `occurred_at` (append-only time series — far smaller than btree); btree on
`trace_id`, `request_id`, `order_id`; composite `(error_fingerprint, occurred_at desc)`;
composite `(http_route, occurred_at desc)`; **partial** btree `(occurred_at desc) where level in
('error','fatal')` so the error feed never scans the http firehose.

**`http_route` is templated, deliberately.** Storing `/api/orders/9f3c…` would make per-endpoint
aggregation impossible and would leak an id into an index. The concrete id goes in `order_id`.

### `obs_issues` — grouped issues (warm, long retention)

```
fingerprint         text primary key
short_id            text unique          -- DEL-4821, from a sequence
title               text not null
culprit             text                 -- route or first in-repo stack frame
kind, level         text
severity            text not null        -- critical|high|medium|low|info
severity_source     text not null        -- 'auto' | 'manual'  (manual is never overwritten)
status              text not null        -- open|investigating|resolved|ignored|regressed
first_seen          timestamptz
last_seen           timestamptz
occurrences         bigint not null      -- incremented on write
release_first_seen  text
assigned_to         uuid
incident_id         bigint
resolved_at         timestamptz
resolved_by         uuid
resolution_note     text
sample_event_id     bigint               -- most recent full event, for the detail page
```

**Counting honestly:** `occurrences` is incremented atomically on every ingest and is exact forever.
*Affected users* and *affected orders* are `count(distinct …)` over `obs_events` — which means they
are only knowable inside the raw-event retention window. The UI will therefore label them
**"183 users affected (last 14 days)"**, not "183 users affected". A distinct count that silently
shrinks when a partition is dropped is a lie, and this system's whole value is that its numbers are
not lies.

**Regression detection:** an issue in status `resolved` that fingerprints again flips to `regressed`,
records the new release, and fires an alert. That is the "Learn" step of the brief's workflow.

### `obs_metrics_rollup` — pre-aggregated (cold, long retention)

Written by `pg_cron` every minute. Survives raw-event expiry, so 30/90-day trend charts keep working.

```
bucket        timestamptz    -- minute
env, release  text
dimension     text           -- 'route' | 'provider' | 'domain'
key           text           -- '/api/orders' | 'razorpay' | 'order.created'
count         bigint
error_count   bigint
p50_ms, p95_ms, p99_ms  integer
primary key (bucket, env, dimension, key)
```

Percentiles from `percentile_disc` over the minute's raw rows at rollup time. Exact within the
minute; approximate across a wider window (a p95-of-p95s). The UI will say so on hover rather than
pretending otherwise.

### `obs_incidents`, `obs_incident_notes`
Human workflow. Statuses per §23: `detected → investigating → identified → mitigating → resolved → closed`.
Owner, severity, linked issues (`obs_issues.incident_id`), notes with author + timestamp, resolution
note. Notes are append-only.

### `obs_alert_rules`, `obs_alert_firings`
Rule: metric + comparator + threshold + window + minimum-sample floor + cooldown + destination.
The sample floor matters: "payment failure rate > 10%" must not fire on 1 failure out of 3 requests
at 4am. Firings are recorded so an alert that fired can be reviewed after the fact, and so cooldown
is enforced across serverless instances.

### `obs_deploys`
Release markers: `release`, `env`, `deployed_at`, `commit_sha`, `commit_message`. Written once by
`instrumentation.ts` `register()` on first boot of a new `VERCEL_GIT_COMMIT_SHA` (upsert, so
concurrent cold starts write one row). Drawn as a vertical line on every issue and metric chart.
Per §28 the UI states adjacency — "v2.4.1 deployed 10:35, errors rose 10:42" — and never asserts
causation.

---

## 6. Instrumentation surfaces

| Surface | Mechanism | Catches |
| --- | --- | --- |
| Every request | `src/proxy.ts` mints `requestId`/`traceId`, sets `x-request-id` response header | Correlation root |
| Every server throw | `src/instrumentation.ts` → `onRequestError` (Next ≥15, verified in local docs) | Server Components, Route Handlers, Server Actions, proxy — with `routeType` and `routePath` supplied by the framework |
| Route handlers | `withObservability(handler)` wrapper | status, latency, tagged domain context |
| Provider calls | `recordProvider()` inside `onesignal.ts`, `renflair.ts`, `razorpay.ts` | **the currently-invisible half of the system** |
| Domain events | `recordDomain()` at the ~15 named checkpoints in §3 | order/payment/dispatch outcomes |
| Client | `POST /api/obs/client` from `error.tsx` boundaries + `window.onerror` + `unhandledrejection` | JS errors, with the digest that ties back to the server event |
| Degradation | `schema-probe.ts` `rememberColumn(k,false)` emits a `warn` | silent feature loss |

**Correlation.** `requestId` is one HTTP request. `traceId` spans a logical operation and is carried
across boundaries — checkout → `/api/payments/razorpay/order` → Razorpay → webhook → `settlePayment`
→ dispatch → push. The webhook leg is the hard one: Razorpay will not echo our header. The trace is
rejoined through `payments.provider_order_id`, which we already store; the ingest resolves it to the
originating `traceId` at write time. That is a real join, not an invented one, and it is what makes
"trace this order end to end" (§13) actually work on this architecture.

**Cost control.** `http` events sample: 100% of non-2xx and of anything slower than 1s, and a
configurable fraction (default 10%) of fast successes. Errors, provider failures and domain events
are **never** sampled. The sample rate is shown in the UI next to request counts so nobody reads a
sampled figure as a total.

---

## 7. Grouping, severity, redaction

### Fingerprint (§6)
Deterministic, server-side, at ingest:

```
sha256( env | kind | error_type | normalise(message) | culprit )  → first 16 hex
```

`normalise()` replaces UUIDs, digit runs, quoted strings, emails, phone numbers, URLs and hex blobs
with typed placeholders, so `Order 9f3c… not found` and `Order 71ab… not found` are one issue.
`culprit` is the first stack frame inside `src/`, falling back to `routePath`. HTTP errors with no
exception fingerprint on `method + route + status` instead.

### Severity (§7)
Auto-classified at ingest from a rule table, and **`severity_source='manual'` is never overwritten** —
an admin's judgement outranks the classifier permanently.

- **CRITICAL** — payment settlement write failing; DB unreachable; order creation failing >50% over
  5 min with ≥20 attempts; auth/OTP send failing platform-wide.
- **HIGH** — order creation failure rate >10%; dispatch producing no rider while orders sit `ready`;
  refund failures; webhook signature failures >0 sustained (forgery *or* a rotated secret — both urgent);
  rate limiter degraded to in-memory.
- **MEDIUM** — individual endpoint 5xx; push/SMS provider failures; p95 latency >3× the 7-day baseline.
- **LOW** — client JS errors, recoverable warnings, missing-column degradation.
- **INFO** — deploys, config changes, lifecycle notes.

### Redaction (§31) — enforced at write, not at display
A single `redact()` in `lib/obs/redact.ts`, applied inside `emit()` **before** the row is built, so
there is no path that reaches the table unredacted.

- **Key allowlist for `attrs`.** Deny-lists are the wrong shape: the next feature adds a field nobody
  thought to deny. Only explicitly permitted keys survive.
- Key-name denial regardless of allowlist: `password`, `token`, `secret`, `key`, `authorization`,
  `cookie`, `session`, `otp`, `pepper`, `signature`, `card`, `cvv`, `pan`, `upi`.
- **Value-shape scrubbing** over free text (`message`, `stack`): card-shaped digit runs (with Luhn),
  E.164 phone numbers, emails, JWTs, `rzp_*` / `sk_*` / `Bearer …` tokens, Supabase keys.
- **Headers:** allowlist only — `user-agent`, `content-type`, `x-request-id`, `x-vercel-id`. Never
  `cookie`, never `authorization`, never `x-razorpay-signature`.
- **Bodies are never captured.** Not truncated, not hashed — not captured. The brief's §9 metadata
  list is fully satisfiable without them.
- **PII minimisation:** `actor_id` is the `profiles.id` UUID, never a name, phone or email. The UI
  resolves it to "Customer #8291" and offers a link to the existing customer page, where an admin
  already has an audited path to real details. IP addresses are **not** stored — the rate limiter
  needs one transiently; the telemetry does not.
- A QA scenario asserts redaction directly: emit a synthetic event containing a card number, a JWT
  and a `password` field, then assert the stored row contains none of them.

---

## 8. Admin UI

Route root `/admin/observability`. New nav group **"Observability"** in `admin-nav.ts`, `reach: "console"`
on the deep technical pages (the phone frame carries five tabs and cannot usefully render a stack trace).
Built from the existing kit — `KpiStrip`, `Panel`, `DataTable`, `FilterChips`, `RangeTabs`, `recharts` —
so it inherits dark mode and the console's density for free. No new UI dependency.

| Route | Content | Brief § |
| --- | --- | --- |
| `/observability` | System health, error KPIs, top issues, active incidents, deploy markers | 3, 4, 36 |
| `/observability/issues` | Grouped issue list; severity/status/service/release filters | 5, 6, 26 |
| `/observability/issues/[shortId]` | The investigation page: stack viewer, request context, order context, user context, timeline, deploy correlation, root-cause evidence, "what should I do" | 8–12, 24, 35 |
| `/observability/orders` | Stuck / failed / delayed orders, acceptance + assignment failure rates | 18 |
| `/observability/payments` | Success rate, failures, timeouts, webhook health, **Deligro fault vs Razorpay fault** | 17 |
| `/observability/delivery` | Unassigned orders, dispatch failures, stale rider fixes | 19 |
| `/observability/notifications` | Push/SMS sent vs failed, per provider | 20 |
| `/observability/api` | Per-endpoint requests, error rate, p50/p95/p99 | 14, 15 |
| `/observability/logs` | Structured log viewer: level, service, time range, trace/request search, JSON + pretty, expand, copy | 27 |
| `/observability/traces/[traceId]` | Waterfall for one operation | 13 |
| `/observability/incidents` | Incident list + detail with notes, owner, linked issues | 23 |
| `/observability/settings` | Alert rules, thresholds, sample rate, retention | 22 |

**Sections deliberately NOT built:** a Jobs/Queue page (§21 — no queue exists), and infrastructure
gauges for CPU/memory/connection-pool/deadlocks (§16, §21 — not reachable; the System Health page
links to the Supabase and Vercel dashboards instead and says why). Users and Restaurants get filter
facets inside Issues rather than pages of their own; a page per entity with nothing distinct on it is
navigation debt.

**Global search** (§25) accepts `DEL-####`, `req_*`, `trace_*`, an order id or short code, a profile
UUID, a restaurant slug, an endpoint path, or free-text error message — dispatching by pattern to
the right view.

### "Possible root cause" (§24) and "What should I do" (§35)
Rule-based correlation only — **no invented narrative**. The engine checks a fixed set of relations
(a provider's failure rate rose in the same window; a deploy landed within 30 min; a dependency
issue is open; the error began at a schema probe failure) and reports each as **Confirmed / Likely /
Possible / Unknown** with the evidence rows that support it, each clickable. Where nothing correlates
it says **Unknown** and shows the investigation checklist for that service. It never writes a
sentence the data does not support.

---

## 9. Alerts (§22)

Evaluated by `pg_cron` every minute against `obs_metrics_rollup`, so evaluation is not tied to a
request and keeps working when traffic stops — *"orders dropped to zero"* is itself an alert, and a
request-triggered evaluator can never fire it.

Every rule carries a **minimum sample floor** and a **cooldown**. Delivery: in-app (the existing
admin badge pattern) plus optional push to admin devices, reusing OneSignal. Email/SMS are a §12
decision. Default rules ship **disabled with sensible thresholds**, so the first week produces data
rather than noise, and an operator turns them on once the baselines are real.

**The alerting path is itself monitored** (§36): a heartbeat row per evaluation run. If evaluation
stops, the Overview reports *"Alerting: last ran 47 min ago — stale"*, because an alert system that
fails silently is worse than none.

---

## 10. Access control (§30) — and an honest gap

**The brief's five-tier matrix (Super Admin / Operations / Support / Developer / Viewer) cannot be
implemented as written.** Deligro's `profiles.role` enum has exactly five values across the whole
platform — `customer, restaurant, driver, admin, manager` — with no sub-role dimension for admins,
and it is guarded by the `lock_role` trigger. MFA was removed in `0033`. There is no permission
system to "use if available" (§30).

Three options, decision required (§12):

1. **Ship on `admin` only** (recommended for v1). The entire Observability section sits behind
   `requireRole("admin")`, exactly as the rest of `/admin` does. `manager` gets no access. Simple,
   consistent, no new security surface. The team is small enough that this is the accurate model.
2. **Add a read-only tier by granting `manager` the operational pages** (Orders/Delivery/Incidents)
   and withholding Logs/Traces/Stack traces. Small change, uses the role that already exists, and
   maps onto the brief's "Operations Admin" reasonably.
3. **Build an admin-permission dimension.** A new `admin_permissions` table, a new migration, a new
   check in every page, and a new thing that can be misconfigured. This is a security change of its
   own and needs `SECURITY_AUDIT.md` run against it. Real work, deferred unless wanted.

Whichever is chosen: **stack traces, raw logs and traces are the most sensitive surface** — they can
contain internal structure and, despite redaction, are the most likely place for a leak. They stay
`admin`-only in every option.

**Environment separation (§29)** is by the `env` column, defaulted from `VERCEL_ENV`, with the filter
pinned to `production` by default and a visible banner when an operator switches to preview/development.
Production and development telemetry share a table but never share a view without saying so.

---

## 11. Retention (§32)

| Tier | Retention | Mechanism |
| --- | --- | --- |
| `obs_events` (raw) | **14 days** | weekly partitions, `drop partition` via `pg_cron` |
| `obs_metrics_rollup` | **13 months** | minute buckets compacted to hourly after 14d, daily after 90d |
| `obs_issues` | **180 days after last_seen**, resolved ones kept 30d | `pg_cron` delete |
| `obs_incidents` + notes | **indefinite** | never auto-deleted — this is the institutional memory §"Learn" depends on |
| `obs_deploys` | **indefinite** | tiny |
| `obs_alert_firings` | **90 days** | `pg_cron` delete |

A hard **daily ingest cap** per environment prevents an error loop from filling the database: past
the cap, ingest sheds low-level events, keeps errors, and raises a `critical` self-alert saying
telemetry is being dropped. Silent shedding would make the dashboard lie during exactly the incident
it exists for.

---

## 12. Decisions — ANSWERED 2026-09-02

| # | Question | Decision |
| --- | --- | --- |
| 1 | Access model | **Admin only.** The whole section sits behind `requireRole("admin")`, exactly like the rest of `/admin`. `manager` gets no access. No new role dimension, no new security surface. |
| 2 | Scheduler | **Enable `pg_cron`.** Rollups, retention and alert evaluation run as scheduled SQL inside the database we already have. No `vercel.json`, no external scheduler, and alert evaluation keeps working when traffic stops. |
| 3 | `pg_stat_statements` | **Not enabled.** Database observability is limited to latencies our own queries measure. The Database panel will say so rather than imply it knows which query is slow. |
| 4 | Client-side errors | **In-house.** `POST /api/obs/client` from the error boundaries plus `window.onerror` / `unhandledrejection`. No Sentry, no new vendor, no CSP change. Accepted cost: client stacks are minified. |
| 5 | Alert delivery | **In-app only** for v1 — a badge on the Observability nav item and the incident list, reusing the existing admin badge pattern. No push, no email, no SMS provider. |
| 6 | Order reference | Resolved by reading the code: `orders.external_id` is the *legacy import key* (`legacy-<id>`), null for in-app orders, so it is **not** the operator-facing reference. The reference is `shortOrderId(id)` in `lib/utils/order-map.ts` — the first 8 characters of the UUID, uppercased. Observability will use that, so an id shown here matches the one shown everywhere else in the console. |

Consequences of 4 and 5 worth stating: with no Sentry, a client stack trace is minified and the issue's `culprit` will often be a bundle frame — good enough to group and count, not always good enough to locate. With in-app-only alerting, **nobody is woken up**; alerts are found when someone opens the console. That is a deliberate v1 scope choice, not an oversight, and adding OneSignal push later is a small change because `obs_alert_firings` already records everything a sender would need.

## 13. Phasing

| Phase | Deliverable | Depends on |
| --- | --- | --- |
| **3a** | Migration `0046_observability.sql` — 7 tables, partitions, indexes, RLS-with-no-policies, grants | §12.1, §12.2 |
| **3b** | `lib/obs/` — `emit`, `redact`, `fingerprint`, `ids`, `severity`; `instrumentation.ts`; `proxy.ts` id minting; `withObservability` | 3a |
| **3c** | Instrument the §3 failure list: providers, domain checkpoints, client ingest route (rate-limited) | 3b |
| **4** | Overview, Issues, Issue detail, Logs, System Health | 3c + real data |
| **5** | Orders, Payments, Delivery, Notifications, API/Performance | 4 |
| **6** | Alert rules, evaluation cron, delivery, self-monitoring | 5 |
| **7** | `scripts/qa/obs-pipeline.ts` — controlled failure injection through the full chain | 6 |

**Phase 7 detail**, since §37 is the part that proves the system works. A QA script that triggers
each failure class **against a development environment only** and asserts the whole chain —
event stored → redacted → fingerprinted → grouped → severity assigned → visible to the admin query →
alert fired. Per §38 there is no seeding of the production dashboard: the test data is generated by
causing real (development) failures, is stamped `env='development'`, and the UI's default production
filter excludes it. No mock rows are ever written to a production table.

**Standing gates:** this feature adds tables, grants and an unauthenticated write endpoint
(`/api/obs/client`), so `docs/SECURITY_AUDIT.md` is mandatory before it ships, and its log table gets
filled in. `docs/DEPLOYMENT_AUDIT.md` before promotion.

---

## 14. When a real bug happens, how does an admin find it?

The concrete walkthrough the brief asks for — a customer reports "my payment went through but the
order says unpaid":

1. **Detect.** The alert already fired: `settlePayment` write failures crossed its threshold at
   12:04, so the incident is open before the customer called.
2. **Search.** Admin pastes the order short code into global search → Issue `DEL-4821`,
   *"Payment settled at provider, order not updated"*, 247 occurrences, 96 orders.
3. **Understand.** Issue detail: `PaymentsNotMigratedError` at `lib/data-access/payments.ts:88`,
   full stack, first seen 10:42.
4. **Correlate.** Deploy marker: release `a3f9c21` at 10:35. Adjacent, stated as adjacency — the
   evidence panel shows "Likely: a deploy landed 7 min before onset", with the deploy row linked.
5. **Trace.** One click into the trace: checkout → Razorpay order created → webhook received,
   signature valid → `settlePayment` threw → push never sent. The exact step that broke, and
   confirmation the money is real.
6. **Scope the damage.** Order context lists all 96 affected orders with their current status — the
   list needed to make it right with customers, available before anyone asks.
7. **Attribute.** Payments page separates Deligro faults from Razorpay faults: Razorpay's success
   rate is normal, so this is ours. No time wasted on the provider's status page.
8. **Fix and resolve.** Migration applied, issue marked resolved with a note, incident closed.
9. **Learn.** If it recurs, the issue flips to `regressed` and re-alerts against the new release.
   The incident and its notes are kept indefinitely.

Today, step 1 does not happen at all, and steps 2 through 7 are a `console.error` in a serverless log
that expired an hour ago.


---

## 15. What shipped

### Database — `supabase/migrations/0046_observability.sql`

Nine tables, all RLS-enabled **and forced**, zero policies, revoked from `anon` and
`authenticated`, granted only to `service_role`:

| Table | Holds | Retention |
| --- | --- | --- |
| `obs_events` | Raw telemetry, range-partitioned weekly | 14 days, by `DROP TABLE` on a partition |
| `obs_issues` | Fingerprinted groups, `DEL-####` | 180d from last seen; linked-to-incident rows exempt |
| `obs_metrics_rollup` | Minute/hour/day aggregates | 13 months, compacted upward |
| `obs_incidents`, `obs_incident_notes` | Human workflow | **Never auto-deleted** |
| `obs_alert_rules`, `obs_alert_firings` | Thresholds and what crossed them | Rules kept; firings 90d |
| `obs_deploys` | Release markers | Indefinite |
| `obs_job_runs` | Heartbeats for the scheduled jobs | One row per job |

Five `security definer` functions, all revoked from `public`/`anon`/`authenticated`:
`obs_ingest(jsonb)` (insert + issue upsert in one round trip, with a per-environment
daily cap that sheds low-level events and records the shedding), `obs_rollup(int)`,
`obs_retention()`, `obs_evaluate_alerts()`, `obs_maintain_partitions(int)`.

Eight alert rules seeded **disabled**.

### Application — `src/lib/obs/`

| File | Role |
| --- | --- |
| `types.ts` | Closed vocabularies, mirrored by the migration's CHECK constraints |
| `redact.ts` | Allowlist for `attrs`, separator-normalised key deny-list, Luhn-checked card masking, JWT/bearer/key/email/phone scrubbing, header allowlist, URL query-value stripping |
| `fingerprint.ts` | `normaliseMessage`, `culpritFrame`, and a 64-bit hash built from two `Math.imul` FNV-1a passes — no BigInt (ES2017 target), no `node:crypto` (Edge runtime), so the same input fingerprints identically in both runtimes |
| `severity.ts` | Single-event classification. Rate-based judgement lives in SQL, deliberately |
| `ids.ts` | `req_`/`trace_`/`span_` minting, shape validation, `currentEnv`, `currentRelease`, `templateRoute` |
| `emit.ts` | Buffered, `after()`-flushed, never-throwing writer. HTTP sampling at 10% for fast successes; failures and slow requests never sampled |
| `request.ts` | `withObservability()` route wrapper, `obsRequestContext()` |
| `read.ts` / `metrics.ts` | Every read, each behind `requireRole("admin")` above the RLS bypass |
| `diagnose.ts` | Rule-based root cause. Confirmed / Likely / Possible / **Unknown** |
| `client.ts` | Browser reporter: `sendBeacon`, deduped, capped at 5 per page load |

`src/instrumentation.ts` — `register()` writes the deploy marker; `onRequestError`
catches every server throw with the framework's own `routePath` and `routeType`, and
records the `digest` that `admin/error.tsx` was already printing with nothing behind it.

`src/proxy.ts` — mints the correlation ids on the one path every request takes,
propagates them to handlers via `NextResponse.next({ request })` and echoes them on
the response.

### Instrumented failure paths

Each of these was previously silent:

- **OneSignal** — every push now records accepted/rejected, status and timeout; before, `sendPush` returned `false` and `pushToPlayer` discarded even that.
- **Renflair SMS** — OTP send failures were returned to the route and never stored. A failure here is a customer who cannot sign in at all.
- **Rate limiter** — the Postgres→memory fallback logged once per process and then went quiet forever. It is a *security* degradation (per-instance caps), classified `high`.
- **Schema probe** — a missing or ungranted column latches a feature into a degraded form for the life of the process, with no signal. Now a `warn` per column per process.
- **Payment webhook** — signature rejections, unknown-order deliveries, and settlement write failures (the one that means money taken against an order that reads unpaid).
- **Order creation** — the unmapped `server_error` branch, RLS refusals, refusals, and the success path (so "orders stopped" is alertable).

### Admin console — 14 routes under `/admin/observability`

Overview, Issues, Issue detail, Incidents, Incident detail, Orders, Payments, Delivery,
Notifications, API, Logs, Alerts, Trace detail, plus `POST /api/obs/client`.
One rail entry (`reach: "console"`), section tabs, and a single search box that
dispatches on the shape of whatever was pasted.

### Testing — `scripts/qa/obs-telemetry.ts` (`npm run test:obs`)

**69 assertions, all passing**, offline. Wired into `scripts/qa/run-all.sh` as step 4/7.
Asserts that a Luhn-valid card, a JWT, a bearer token, a `password` field and the
`x-razorpay-signature` header are all absent from a stored row; that a non-Luhn digit
run survives (so payment messages stay diagnosable); that identical bugs with different
order ids group to one issue; that production and development never merge; that a 4xx is
not an error and a 5xx is; and that the diagnosis engine reports **Unknown** rather than
inventing a cause, and never promotes a nearby deploy into its statement.

### Verification performed

`npm run build` compiles clean, all 14 routes present. `npx tsc --noEmit` clean.
`npm run lint` — 0 errors (6 pre-existing `<img>` warnings in files not touched here).
`npm run test:obs` — 69/69.

**Not run:** `test:idor` and `test:e2e` need live Supabase credentials and a running
server; nothing in this change touches the paths they cover, but they should be run
before promotion. The migration has **not** been applied to any database — see §16.

### New dependencies, environment variables, breaking changes

**None.** No package was added. No environment variable was added — release
correlation reads `VERCEL_GIT_COMMIT_SHA` / `VERCEL_ENV`, which the platform already
provides, and degrades to no marker when absent. No CSP change (the client reporter
posts same-origin).

---

## 16. Before this works in production

1. **Apply `supabase/migrations/0046_observability.sql`.** Until then every screen
   says "not installed" rather than showing an empty dashboard, which was deliberate:
   an empty observability page and a healthy platform look identical.
2. **Enable `pg_cron`** (Dashboard → Database → Extensions) and run the four
   `cron.schedule` calls commented at the foot of the migration. Without them ingest
   still works, but nothing is rolled up, nothing expires and no alert can fire —
   and System Health will say so from the age of the `obs_job_runs` rows.
3. **Run `docs/SECURITY_AUDIT.md`** and fill in its log table. This change adds tables,
   grants, and an unauthenticated write endpoint.
4. **Watch a week, then enable alert rules.** The eight seeded thresholds are starting
   points, not measurements.

## 17. Known limitations

- **Client stack traces are minified.** No Sentry, so no source maps (decision Q4).
  Browser errors group and count reliably; they locate only sometimes.
- **Nobody is paged.** Alert delivery is in-app only (decision Q5). `obs_alert_firings`
  already stores everything a sender would need.
- **Slow queries are not identifiable.** `pg_stat_statements` was not enabled
  (decision Q3), so database observability is limited to latencies our own queries measure.
- **Host metrics are absent by design.** CPU, memory, connection pool and deadlocks
  belong to Vercel and Supabase; System Health links out and says why rather than
  drawing a gauge wired to nothing.
- **No queue dashboard.** Deligro has no queue. Fire-and-forget side effects are
  monitored as provider and domain outcomes instead.
- **Distinct user/order counts are 14-day figures** and labelled as such. The
  occurrence count is exact and permanent.
- **HTTP call counts are sampled** at 10% for fast successes, so error *rates* on the
  API page understate. Error counts are exact. The page says so.
