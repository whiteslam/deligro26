# Deligro — Second Audit (runtime)

**Date:** 2026-08-19 (same day as audit 1, after the 10-fix pass)
**Scope:** Full repo + **the app actually running**. Production build served on localhost, every route probed, payloads measured, database queried directly, timings taken.
**Why a second pass:** Audit 1 listed "runtime behaviour — no browser session was driven" under *what this audit did not check*. That gap hid the single worst finding in this report, in code I had written myself.

---

## Headline

**The SEO and PWA work from the first fix pass was completely inert.** `robots.txt`, `sitemap.xml` and `manifest.webmanifest` all answered **307 → /login** to anonymous requests. The files were generated correctly and appeared in the build output — which is exactly what I verified last time, and it was not enough. `src/proxy.ts`'s matcher caught all three and the session gate redirected them. Googlebot has no session.

So: the sitemap listing 50 restaurants was unreachable, the robots.txt pointing at it was unreachable, and the manifest that makes the app installable was unreachable to precisely the first-time visitor it exists for.

**Fixed this round and verified against a running production server.** One-line matcher change; auth gates confirmed still intact.

The second finding is bigger in ongoing cost: **every customer downloads the entire city's menu — 3,157 dishes — on the home page, the search page and the stores page.** Measured, not estimated.

---

## Scorecard

| Axis | Audit 1 | Now | Note |
|---|---:|---:|---|
| Security | 84 | **86** | `/build` gated, duplicate env removed. Runtime headers verified present; API endpoints correctly refuse anon. |
| Performance | 66 | **58** | ↓ — not a regression, a measurement. The full-catalog payload was invisible to static analysis. |
| SEO | 31 | **44** | Files now actually reachable. Still login-walled, still no `<h1>` on 3 of 4 main pages. |
| Code quality | 79 | **85** | Dead code gone, deps declared, docs current. |
| **Overall** | **69** | **69** | Real gains offset by a real problem that was there all along and is now measured. |
| *Realtime / sync* | 55 | **55** | Unchanged. Still zero subscriptions. |
| *UX fit (tier-3)* | 52 | **60** | 16px base, zoom restored, installable. Still English-only. |

`Overall = 86×0.35 + 58×0.25 + 44×0.20 + 85×0.20 = 69`

The Performance drop is honest bookkeeping: the catalog payload existed at audit 1 and I scored the axis without having measured it.

---

## What running the app revealed

Nine things static analysis had missed or could not confirm.

### 1. HIGH — Public metadata files were unreachable *(fixed)*

```
/robots.txt            307 → /login
/sitemap.xml           307 → /login
/manifest.webmanifest  307 → /login
```

`src/proxy.ts:101`'s matcher excluded `_next/static`, `_next/image`, `favicon.ico` and image extensions — but not these three. Everything else fell through to the session gate at `proxy.ts:91`.

Consequences, all silent: a crawler cannot read robots.txt, so it never discovers the sitemap; it cannot read the sitemap, so no restaurant page is indexed; a browser cannot read the manifest, so Chrome never offers "Add to home screen".

**Fix applied** — [proxy.ts:101](src/proxy.ts#L101):

```diff
-"/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"
+"/((?!_next/static|_next/image|favicon.ico|robots\\.txt|sitemap\\.xml|manifest\\.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"
```

Verified on a production server:

```
/robots.txt 200   /sitemap.xml 200   /manifest.webmanifest 200
/admin      307   /checkout    307    (gates intact)
```

**The lesson worth keeping:** "it appears in the build output" is not "it is reachable". Every public file needs one HTTP request against a running server before it counts as shipped.

### 2. HIGH — Every catalog page ships the entire city's menu

Measured on a production build:

| Page | Raw HTML | Gzipped | Server render |
|---|---:|---:|---:|
| `/` | 1,210,678 B | 81 KB | 1.3–2.5 s |
| `/search` | 1,248,670 B | 79 KB | 1.1 s |
| `/stores` | 1,200,779 B | 80 KB | 1.4 s |
| `/restaurant/[slug]` | **38,788 B** | **10 KB** | **0.5 s** |

The page that shows one real menu is **30× smaller** than the pages that show none.

Payload composition of `/`: **3,207 price fields, 3,157 veg flags, 3,167 descriptions** — the full menu of all 50 approved restaurants. Confirmed against the database: 50 approved restaurants, 3,797 menu items.

This is deliberate. [dishes.ts:9](src/lib/search/dishes.ts#L9) says so plainly: *"the customer app already loads the whole approved catalog with menus for the feed, so search runs over that same array on the client and stays instant while typing."* It also names the seam to change — `buildDishIndex`.

It is the wrong trade **for this audience**. Instant client-side search is a luxury; 81 KB of gzipped HTML plus 1.2 MB to parse and hydrate on a low-end Android over patchy 4G is a cost paid on every visit by everyone, including the majority who never type a search. And it grows linearly with vendor onboarding — at 100 vendors it doubles.

**Fix:** move search server-side at the seam the code already identifies.

```ts
// The feed needs name, image, rating, eta, cuisines, price tier — not menus.
export async function listRestaurantsForFeed(): Promise<RestaurantCard[]>
// Search hits the server, debounced ~250ms.
// GET /api/search?q=... → runs over menu_items with a trigram index
```

Add the index this needs:

```sql
create extension if not exists pg_trgm;
create index on menu_items using gin (name gin_trgm_ops);
```

Expected: `/` drops from ~81 KB to well under 15 KB gzipped, and stops growing with the vendor count. Search costs one debounced request instead of a megabyte up front.

### 3. MEDIUM — No `<h1>` on three of the four main customer pages

| Page | `<h1>` |
|---|---|
| `/` | **0** |
| `/search` | **0** |
| `/stores` | **0** |
| `/restaurant/[slug]` | 1 |

The home page has 0 `<h1>`, 3 `<h2>` and **56 `<h3>`**. Screen-reader users navigate by heading level, and a crawler reads the `<h1>` as the page's subject — this is one defect scoring against both accessibility and SEO. Give each page one `<h1>` (visually styled as it already looks, or `sr-only` where the design has no room) and demote the 56 `<h3>` card titles so the hierarchy is real.

### 4. MEDIUM — Admin can't assign a rider, though the code authorizes it

`assignRider` in [manager/actions.ts:105](src/app/manager/actions.ts#L105) is a well-built action — role-checked as `["manager", "admin"]`, handles the duplicate-key race with a human message ("A rider took this order first"), degrades gracefully on a pre-migration database.

It is called from exactly one place: `manager-order-board.tsx`. The admin console's `LiveBoard` renders the word **"Unassigned"** with no way to act on it. So an admin looking at a stuck order can see the problem and not fix it, despite the server already permitting them to.

Meanwhile the only other path to a delivery row is a driver self-claiming via `acceptDelivery` ([driver-orders.ts:487](src/lib/data-access/driver-orders.ts#L487)). If no rider is online, an order sits in READY with no escalation.

**Fix:** surface the existing action in the admin LiveBoard's rider cell. The authorization already covers it; this is a UI gap, not a permissions change.

### 5. Confirmed — still no realtime, anywhere

Re-verified across `src/` and all 40 migrations: zero `.channel(`, zero `postgres_changes`, zero `supabase_realtime`. Current polling:

| Surface | Interval |
|---|---|
| Admin orders, manager, driver | 4 s |
| Vendor kitchen (`whenHidden`) | 8 s |
| Customer tracking | 3 s |
| Customer orders list | 10 s *(added in fix pass 1)* |

Measured cost of one admin-orders poll: **211 ms, 21 KB**. At 4 s that is 900 queries and ~19 MB per open tab per hour, before the RSC payload around it. Unchanged recommendation from audit 1, with the migration and hook in that report.

### 6. Verified — the `order_items` join I added is nearly free

I added a join to a query that polls every 4 seconds and should have measured it at the time. Five runs each, median:

| Query | Median | Payload |
|---|---:|---:|
| without `order_items` | 245 ms | 17.2 KB |
| with `order_items` | 211 ms | 21.1 KB |

+3.9 KB, no measurable latency cost (the difference is noise). The trade was sound.

### 7. Verified — runtime security holds up

Every header from `next.config.ts` is present on a live response: CSP, HSTS, `X-Frame-Options: DENY`, `nosniff`, Referrer-Policy, Permissions-Policy.

Unauthenticated API probes behave:

```
/api/me 200 {"role":null}   /api/orders 401   /api/addresses 401
/api/vendor/earnings 403    /api/{favorites,profile,refunds,reviews} 405
```

`/api/me` returning 200 is correct — it answers "who am I" with `null` and leaks nothing.

### 8. Verified — the fail-closed SEO default works

With `SITE_INDEXABLE` unset, the live server serves `User-Agent: * / Disallow: /` and an empty sitemap. A staging host cannot accidentally index itself. Production needs `SITE_URL` and `SITE_INDEXABLE=true` set explicitly.

### 9. Verified — typography fix landed; error copy is genuinely good

Base font is 16px (`globals.css:524`), pinch-zoom restored. Small-text utility usage is 414 (was 416 — unchanged, as expected: the base size changed, not the utilities). Six CSS rules still sit below 14px, including one at 10.5px.

Error copy is a strength. `errorText()` in `otp-login.tsx:352` maps every API code to a human sentence — "Code expired — request a new one", "Too many tries. Request a new code." No raw error code reaches a user on the paths checked. The driver board is the same: "Another rider just grabbed this order", "Wrong code — ask the customer again". All of it in English, which is finding #10.

---

## Unchanged from audit 1, still the two biggest

**Hindi.** `<html lang="en">` confirmed on the live response. Every string in the product is English, in a Hindi-speaking district, including the driver and vendor boards operated by the people least likely to read it. Still the single largest barrier to "very easy to understand" for this audience. Plan and ordering in [AUDIT_REPORT.md](AUDIT_REPORT.md).

**Supabase Realtime.** See #5.

---

## Revised priority list

| # | Action | Effort | Why now |
|---|---|---|---|
| ~~0~~ | ~~Un-block robots/sitemap/manifest~~ | — | **Done this round** |
| 1 | **Hindi** — customer status words, driver board, vendor board | 2–3 d | Decides whether the app is usable by its users |
| 2 | **Move search server-side**, ship a feed without menus | 1–2 d | 81 KB → <15 KB on every catalog page; stops growing with vendors |
| 3 | **Supabase Realtime** on `orders` + `deliveries` | 1–2 d | Kitchen latency 8 s → <1 s; removes ~19 MB/tab/hour |
| 4 | Add one `<h1>` per page; fix heading hierarchy | 2 h | a11y + SEO, one change |
| 5 | Surface `assignRider` in the admin LiveBoard | 3 h | Action exists and already authorizes admin |
| 6 | Open `/`, `/search`, `/restaurant/*` to anonymous visitors | 4 h | Needs the `docs/SECURITY_AUDIT.md` gate |
| 7 | Global offline banner + checkout submit guard | 4 h | Routine condition here, not an edge case |
| 8 | Set `SITE_URL` + `SITE_INDEXABLE=true` in production | 5 min | Nothing indexes until this is set |

---

## What this audit still did not check

- **Authenticated UI.** Every probe ran as anonymous or guest. The admin, vendor, driver and manager boards were read as source and measured at the query layer, but not driven through a signed-in browser session. My admin-orders Items column is verified by typecheck, build, and a live query returning real dish names — not by seeing it painted.
- **Live RLS policies.** Read from migrations again, not diffed against the running database. Policies can be changed in the dashboard without a migration. This remains worth one hour with the Supabase dashboard open.
- **Core Web Vitals on real hardware.** Server render times are measured; LCP, INP and CLS on a ₹8,000 Android are not. Given finding #2, INP on the home page is where I would look first.
- **Payment webhooks under live traffic**, screen-reader testing, and colour contrast.

---

## Audit log

| Date | Auditor | Scope | Overall | Critical | High | Medium | Low |
|---|---|---|---:|---:|---:|---:|---:|
| 2026-08-19 | Claude | Full repo, static + build | 69 (D+) | 0 | 3 | 8 | 6 |
| 2026-08-19 | Claude | 10 quick wins applied | — | 0 | 1 closed | 4 closed | 5 closed |
| 2026-08-19 | Claude | Admin orders: vendor column + dish names | — | — | — | 1 closed | — |
| 2026-08-19 | Claude | **Runtime audit** — app served and probed | 69 (D+) | 0 | 2 (1 fixed) | 2 new | — |
