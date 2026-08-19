# Deligro — Project Audit

**Date:** 2026-08-19
**Scope:** Full repo at `f:/deligro26/deligro` — 417 source files, ~73,400 lines TS/TSX, 58 pages, 31 API routes, 40 SQL migrations. Static analysis plus a clean production build.
**Stack:** Next.js 16.3 (App Router, Turbopack) · React 19.2 · TypeScript · Tailwind 4 · Supabase (Postgres + RLS + Auth) · Razorpay · OneSignal · Renflair SMS

---

## Status — 10 quick wins applied 2026-08-19

The ten low-effort items from the action list below have been implemented and
verified (`tsc --noEmit` clean, `next build` clean, `eslint` 0 errors). Findings
they close are marked **✅ FIXED** in place; everything else stands as written.

| # | Applied | Verified by |
|---|---|---|
| 1 | `maximumScale:1` removed; base font 15px → 16px | build |
| 2 | `src/app/manifest.ts` + generated PNG icons (192/512/512-maskable/apple-180) | `/manifest.webmanifest` emitted |
| 3 | `robots.ts`, `sitemap.ts`, restaurant `generateMetadata` + `Restaurant` JSON-LD | sitemap lists 50 shops + 4 static routes |
| 4 | `server-only` declared in package.json | `pnpm install` |
| 5 | `/build` gated behind `requireRole("admin")` + `noindex` | build |
| 6 | 10 dead files deleted, `ws` dropped, WhatsApp archive untracked | knip: 12 → 2 unused files |
| 7 | `AutoRefresh` on `/orders`, active orders only | build |
| 8 | `GmvOrdersChart` lazy-loaded | admin recharts chunk refs 3 → 0 |
| 9 | Duplicate root `.env.local` deleted (secret verified identical) | — |
| 10 | README header + "Not built yet" rewritten | — |

**Two corrections to the audit's own findings, found while applying them:**

- **`src/components/shared/rating.tsx` is NOT dead.** knip flagged it, but
  `restaurant-card.tsx:9` has a *commented-out* import and line 76 still holds a
  `<RatingPill`, labelled "temporarily hidden rating star". It is parked work,
  not dead code, and has been kept. The finding below said 11 files; 10 were
  deleted.
- **The sitemap could not have worked as first written.** `listRestaurantsResult`
  runs on the cookie-reading Supabase client, which opts a route out of static
  generation — `next build` threw `DynamicServerError` and the graceful fallback
  shipped a sitemap containing zero restaurants. Fixed by adding
  `createPublicClient()` (cookie-free, anon key, RLS unchanged) and a dedicated
  `listPublicRestaurantSlugs()` query. A sitemap should reflect what an anonymous
  crawler can see anyway, not what the requesting session can see.

**Not done, and why:** `VendorEarningsCharts` and `VendorOverviewBoard` were also
listed for lazy-loading. Both *are* their entire pages rather than a chart within
one, so deferring them buys a loading skeleton and no bundle saving on their own
routes. Extracting the chart halves out of two ~900-line files is a real
refactor, not a quick win — left as a proposal rather than done blind.

---

## Scorecard

Scores below are the **pre-fix** assessment, kept as the baseline the work was
planned against. Re-score after the remaining items land.

| Axis | Score | Grade | One-line verdict |
|---|---:|:--:|---|
| **Security** | 84 | B | Genuinely well built. No critical findings. |
| **Performance** | 66 | D+ | Efficient code, executed far more often than the data changes. |
| **SEO** | 31 | F | Login-walled, no sitemap, no per-page metadata. Invisible to Google. |
| **Code quality** | 79 | C+ | Excellent architecture; some leftovers and repo hygiene. |
| **Overall** | **69** | **D+** | |

`Overall = 84×0.35 + 66×0.25 + 31×0.20 + 79×0.20 = 69`

**Not capped.** No Critical security finding was found, so the usual "any critical caps the grade at D" rule does not apply here. The overall score is dragged down almost entirely by the SEO axis, which is a business-reach problem rather than a code-defect problem.

Two axes you specifically asked about sit outside the standard four:

| Extra axis | Score | Verdict |
|---|---:|---|
| **Realtime / sync** | 55 | Works, but nothing is actually live — it is all polling. |
| **UX fit for the target audience** | 52 | Competent design, wrong defaults for a Hindi-speaking tier-3 city. |

---

## Executive summary

Read this part even if you read nothing else.

**The good news, and it is substantial.** This is not a typical AI-generated codebase and it should not be treated as one. The security work is real: authorization is enforced at the database through Row Level Security rather than only in application code, every write endpoint is rate-limited, the Content-Security-Policy is hand-written and tight, and the code fails closed rather than open when configuration is missing. More telling than any of that, the comments explain *why* each control exists and record the bugs that motivated them — `use-live-tracking.ts` documents that discarding failed polls once left customers watching a courier that had stopped reporting, and the fix is right there. That is the mark of someone who has thought about this properly. **The audit found no critical vulnerability.**

**The three things that matter.**

1. **Nothing is actually live.** The product says "live" everywhere, but there is not a single Supabase Realtime subscription in the codebase, and no migration enables replication on any table. Every "live" board is a timer calling `router.refresh()`, which re-runs the entire server render and all its database queries. A vendor tablet open for a ten-hour service day fires roughly 4,500 full board refreshes. A new order takes up to 8 seconds to reach the kitchen. The cost scales with open browser tabs, not with orders. The CSP already permits the WebSocket — the groundwork is done, the feature was just never adopted.

2. **Google cannot see the app.** The proxy redirects every visitor without a session to `/login`, and Googlebot has no session. There is no robots.txt, no sitemap, no canonical tag, and restaurant pages carry no metadata at all — all of them inherit the root title, so they look like duplicates to a crawler. For a single-city delivery business, local search is the cheapest customer-acquisition channel there is, and it is fully closed. The same gap breaks WhatsApp link previews, which for this audience is arguably the bigger loss.

3. **The app is English-only, at 15px, with zoom disabled.** Bemetara is Hindi-speaking. Every string — including the ones riders and kitchen staff must read correctly to do their jobs — is English. Base type is set to 15px with 416 uses of 12px-or-smaller text, and `maximumScale: 1` removes pinch-zoom, which is exactly the escape hatch a user with weak near vision would reach for. You asked for a UX that is very easy to understand for tier-3 users; these three settings are the largest obstacles to that, and two of them are one-line fixes.

**What to do first.** Roughly a day of work — the viewport and font size, a manifest file, robots/sitemap/restaurant metadata, gating `/build`, declaring `server-only`, and deleting the dead files — moves the overall score from 69 to about 88 and fixes the two most visible user-facing problems. Realtime and Hindi are each a few days and are the two changes that actually change the product.

---

## Findings

Seventeen findings, sorted by severity. Locations are `path:line`.

---

### HIGH · Realtime — Nothing in the app is actually realtime

**Where:** [auto-refresh.tsx:28](src/components/shared/auto-refresh.tsx#L28) · [use-live-tracking.ts:171](src/hooks/use-live-tracking.ts#L171) · `supabase/migrations/` (all 40)

**What it is.** There is no Supabase Realtime channel anywhere in the codebase — no `.channel()`, no `postgres_changes`, no subscription. Every surface described as live is a polling loop:

| Surface | Mechanism | Interval |
|---|---|---|
| Admin orders board | `router.refresh()` | 4s |
| Manager board | `router.refresh()` | 4s |
| Driver board | `router.refresh()` | 4s |
| Vendor kitchen board | `router.refresh()` + `whenHidden` | 8s |
| Customer order tracking | `fetch('/api/orders/:id/tracking')` | 3s |
| Customer orders list | **nothing** | — |

`router.refresh()` is not a cheap call. It re-executes the whole server component tree and every query behind it, then streams a fresh RSC payload. On the admin orders page that means re-running `listAllOrders` over a 50-row window plus `listPendingRestaurants`, every four seconds, per open tab.

**Why it matters.**

- **Load.** One vendor tablet open for a ten-hour service day: ~4,500 full board renders. Ten vendors, two admins, four drivers ≈ 100,000 needless database round trips a day. Supabase bills egress.
- **Latency the kitchen feels.** A new order takes up to 8 seconds to appear. The customer waits up to 3s plus a round trip to see "accepted".
- **It scales on the wrong axis.** Cost is proportional to open tabs, not to orders. A quiet Tuesday with every tablet open costs the same as Saturday dinner rush.

No migration adds any table to the `supabase_realtime` publication, so the feature is off at the database as well as absent from the client.

**The fix.** `next.config.ts:31` already allows `wss://*.supabase.co` in `connect-src`, so no CSP change is needed.

```sql
-- supabase/migrations/0038_realtime.sql
alter publication supabase_realtime add table public.orders;
alter publication supabase_realtime add table public.deliveries;
alter table public.orders      replica identity full;
alter table public.deliveries  replica identity full;
```

RLS applies to Realtime, so each role only receives rows it may already read — the existing security model carries over unchanged.

Then replace the timer with a change trigger, keeping a slow poll as a net:

```tsx
useEffect(() => {
  const supabase = createBrowserClient();
  const ch = supabase
    .channel('orders-board')
    .on('postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => router.refresh())
    .subscribe();
  // A net, not the mechanism: catches a silently dropped socket.
  const id = setInterval(() => { if (!document.hidden) router.refresh(); }, 60_000);
  return () => { supabase.removeChannel(ch); clearInterval(id); };
}, [router]);
```

Vendor board: ~4,500 refreshes/day → roughly one per order plus 600 heartbeats. Kitchen alert latency: up to 8s → well under 1s.

**You must also:** enable Realtime for `orders` and `deliveries` in the Supabase dashboard (Database → Replication) after running the migration.

---

### HIGH · UX — English-only interface for a Hindi-speaking city

**Where:** [layout.tsx:52](src/app/layout.tsx#L52) (`lang="en"`) — no i18n library, no locale files, no translated strings anywhere in `src/`

**What it is.** Every string is English: "Craving to doorstep", "Track order", "Reorder", "Cash on delivery", "Your order is on the way".

**Why it matters.** Bemetara is a Hindi-speaking district in Chhattisgarh. A meaningful share of target customers — and very likely most delivery riders and several of the restaurant staff who have to operate the vendor board — read Devanagari far more comfortably than Latin script. This is the single largest barrier to the app being "very easy to understand" for this audience, and no amount of layout polish compensates for it.

It is not only a customer problem. A rider who misreads "Mark delivered" as "Mark picked up" creates a real support incident and a real dispute.

**The fix.** This is a UI-string problem, not a full i18n-framework problem — one city, one currency, no date-format complexity. Skip `next-intl` and ship a dictionary:

```ts
// src/lib/i18n/strings.ts
export const STRINGS = {
  en: { trackOrder: 'Track order', onTheWay: 'On the way', cod: 'Cash on delivery' },
  hi: { trackOrder: 'ऑर्डर ट्रैक करें', onTheWay: 'रास्ते में', cod: 'डिलीवरी पर नकद' },
} as const;
```

Order of work, highest value first:

1. **Customer order-status words** — the six tracking stages plus cart and checkout buttons. About 40 strings, and it covers the moments that generate support calls.
2. **Driver board** — ~15 strings. Riders are the least likely group to read English comfortably.
3. **Vendor board** — ~30 strings.
4. Admin console can stay English; you use it.

Add a language toggle in Profile and persist it the way `deligro-theme` already is at [layout.tsx:40](src/app/layout.tsx#L40), then drive `<html lang>` from it.

Worth considering: **default to Hindi with an English toggle**, rather than the reverse. The default should match the majority user, and right now it matches the developer.

**You must also:** have the Hindi reviewed by a native Chhattisgarhi Hindi speaker. Machine-translated delivery vocabulary is regional and reads worse than English when it is wrong.

---

### HIGH · SEO — The entire customer app is login-walled and invisible to Google

**Where:** [proxy.ts:91](src/proxy.ts#L91) · no `src/app/robots.ts` · no `src/app/sitemap.ts` · [restaurant/[slug]/page.tsx](src/app/(customer)/restaurant/[slug]/page.tsx) has no `generateMetadata`

**What it is.** `proxy.ts:91` redirects any visitor without a session or guest cookie to `/login`. Googlebot has neither. Every crawl of every URL returns a redirect to a sign-in page, so the site has effectively zero indexable surface.

On top of that: no robots.txt, no sitemap.xml, no canonical tags, no `metadataBase`, no JSON-LD, and no Open Graph image. Restaurant pages — the only genuinely valuable SEO asset a delivery business owns — carry no metadata at all and inherit the root title, so every one of them looks like a duplicate to a crawler.

**Why it matters.** For a single-city operator this is the difference between owning "food delivery bemetara" and "best biryani bemetara" and not existing on them. Local search is the cheapest acquisition channel available to you and it is fully closed.

It also breaks link sharing. A restaurant link pasted into WhatsApp — the dominant sharing channel for this audience — currently renders with no image, no name and no description. For this market that is probably the larger loss of the two.

**The fix.** Let crawlers and cold visitors read the menu; keep the wall only where it protects data.

**1. Open the browse routes** in `src/proxy.ts`:

```ts
const PUBLIC_BROWSE = ['/', '/search', '/restaurant', '/stores'];
// …after the PUBLIC_PATHS check, before the guest gate:
if (matches(path, PUBLIC_BROWSE)) return response;
```

`/checkout`, `/orders` and `/profile` stay gated by the existing `GATED_CUSTOMER` list, so nothing touching user data opens up. This is a change to a security-relevant file — review it against `docs/SECURITY_AUDIT.md` as AGENTS.md requires.

**2. Per-restaurant metadata and structured data:**

```tsx
export async function generateMetadata({ params }): Promise<Metadata> {
  const { slug } = await params;
  const r = await getRestaurantBySlug(slug);
  if (!r) return {};
  return {
    title: `${r.name} — order online in Bemetara | Deligro`,
    description: `Order ${r.cuisines.join(', ')} from ${r.name}. Delivered in about ${r.etaMin} minutes.`,
    alternates: { canonical: `/restaurant/${slug}` },
    openGraph: { title: r.name, images: [r.imageUrl], type: 'website' },
  };
}
```

Add `Restaurant` JSON-LD with `servesCuisine`, `aggregateRating` and `areaServed: 'Bemetara'`.

**3. Add** `src/app/robots.ts`, `src/app/sitemap.ts` (enumerating approved restaurants), and `metadataBase` in the root layout.

**You must also:** register the domain in Google Search Console and submit the sitemap once deployed. Also create a Google Business Profile for the city — for tier-3 local search it often outperforms organic results.

---

### MEDIUM · UX — 15px base type with pinch-zoom disabled

**Where:** [layout.tsx:32](src/app/layout.tsx#L32) (`maximumScale: 1`) · [globals.css:519](src/app/globals.css#L519) · 416 occurrences of `text-xs` or smaller across `src/`

**What it is.** Base font is 15px, with the comment "Slightly denser than browser default 16px". The codebase uses `text-xs` (12px) or smaller in 416 places, with a documented 11px caption size and several 11.5px operator-console sizes. Separately, `maximumScale: 1` disables pinch-zoom.

**Why it matters.** Either alone is minor. Together they are not — zoom is precisely what a user with weak near vision reaches for when text is too small, and it has been removed. This fails WCAG 1.4.4 (Resize Text).

The audience skews toward first-time smartphone users, older shopkeepers operating the vendor board, and riders reading a phone in daylight on a bike. All three need larger text and targets, not denser ones.

**The fix.** Two lines:

```diff
// src/app/layout.tsx
 export const viewport: Viewport = {
   width: 'device-width',
   initialScale: 1,
-  maximumScale: 1,
 };
```

```diff
/* src/app/globals.css */
-  font-size: 15px; /* Slightly denser than browser default 16px */
+  font-size: 16px;
```

Then raise the floor on customer-facing surfaces: nothing below 14px, and 16px for anything the customer must read to decide — prices, dish names, order status, the total.

Note that inputs below 16px also cause iOS Safari to auto-zoom on focus, which is a real annoyance in the checkout form specifically.

While you are there, audit tap targets to a 44×44px minimum. The quantity steppers and category chips are the likely offenders.

---

### MEDIUM · Functionality — No PWA manifest, so the app cannot be installed

**Where:** `public/` has no `manifest.json`; there is no `src/app/manifest.ts`

**What it is.** `layout.tsx` sets `appleWebApp: { capable: true }`, so iOS install was clearly intended — but there is no web app manifest, so Android Chrome never offers "Add to home screen" and the app cannot be installed anywhere.

**Why it matters.** More here than it would elsewhere. In a tier-3 market a home-screen icon is often the difference between a repeat customer and a one-time visitor, because the alternative is remembering and typing a URL.

Installability is also what makes web push reliable on Android. OneSignal is already wired up ([onesignal-init.tsx](src/components/notifications/onesignal-init.tsx)) and the server already fans out order events (`notifyOrderAccepted`, `notifyOnTheWay`, `notifyDelivered`) — so you are paying for push infrastructure that a missing 20-line file is limiting.

An installed vendor board is also far less likely to be closed by accident than a browser tab.

**The fix.**

```ts
// src/app/manifest.ts
import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Deligro — food delivery in Bemetara',
    short_name: 'Deligro',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#0f1215',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
```

The brand marks already exist at `Resources/deligro-icon.svg` and `Resources/deligro-mark.svg` — export to PNG at both sizes. Include the maskable variant or Android letterboxes the icon in a white circle.

---

### MEDIUM · Functionality — No offline handling outside the tracking screen

**Where:** [tracking-view.tsx:259](src/components/orders/tracking-view.tsx#L259) — the only offline affordance in the entire app

**What it is.** The live tracking screen handles weak networks genuinely well. `use-live-tracking.ts` counts failed polls, freezes the rider pin rather than animating a courier that may have stopped reporting, and shows a WifiOff banner after three misses. The reasoning is documented in the file and it is correct.

None of that care is applied anywhere else. Nothing else in the app reads `navigator.onLine`. On a dropped connection the home feed, search, restaurant menu and — most damagingly — the checkout **Place Order** button all fail silently or hang.

**Why it matters.** In a tier-3 city on patchy 4G this is a routine condition, not an edge case. The worst outcome is a customer tapping Place Order three times on a stalled request because nothing told them the network was gone.

**The fix.** Two pieces.

**1. A global connection banner**, mounted in the customer layout:

```tsx
'use client';
export function OfflineBanner() {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const on = () => setOnline(true), off = () => setOnline(false);
    setOnline(navigator.onLine);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  if (online) return null;
  return <div role="status">No internet — showing what we last loaded</div>;
}
```

**2. Make the checkout submit network-aware:** disable the button while a request is in flight (guards double-submit), give the fetch a timeout, and on failure show "Could not reach Deligro — check your connection and try again" with a retry, rather than leaving a dead button.

A service worker caching the shell and restaurant list goes further, and pairs naturally with the manifest above.

---

### MEDIUM · Performance — Polling re-runs entire server trees, including heavy queries

**Where:** [admin/orders/page.tsx:216](src/app/admin/orders/page.tsx#L216) (4s) · [manager/page.tsx:56](src/app/manager/page.tsx#L56) (4s) · [driver-board.tsx:291](src/components/driver/driver-board.tsx#L291) (4s) · [vendor-orders-board.tsx:843](src/components/vendor/vendor-orders-board.tsx#L843) (8s, `whenHidden`)

**What it is.** Beyond the realtime finding above, the vendor board polls with `whenHidden` set — deliberately, and the reasoning in the code is sound: a kitchen tablet asleep on another tab must not miss orders. But the consequence is that a forgotten open tab polls forever, at full server-render cost, with nobody watching.

`src/lib/data-access/admin-settlements.ts` is 1,829 lines of query logic. Anything on that path being polled is expensive.

This is the main reason the performance axis scores as it does. The code itself is efficient — it is simply executed far more often than the data changes.

**The fix.** Fixing the realtime finding fixes most of this. Until then, two cheap mitigations:

1. **Back off when idle.** If three consecutive refreshes return identical data, stretch the interval to 30s; reset on any change. A kitchen with no orders should not cost the same as one at dinner rush.
2. **Cap the `whenHidden` poll.** After 60 minutes with no visibility event and no new order, stop and show a "Reconnect" button on return. A tablet in a drawer should not poll overnight.

---

### MEDIUM · Functionality — The customer orders list never updates

**Where:** [orders/page.tsx:10](src/app/(customer)/orders/page.tsx#L10)

**What it is.** `/orders` is a plain server component with no AutoRefresh and no client polling. A customer who places an order and then sits on the orders list — a very natural thing to do, since it is the screen the tab bar leads to — sees a status frozen at page load. It never advances to Accepted, Ready or On the way unless they navigate away and back.

**Why it matters.** The deeper `/orders/[id]` screen updates every 3 seconds. The same order therefore shows two different statuses on two screens, which reads as a bug rather than a design choice.

**The fix.** Mount the same `AutoRefresh` the operator boards use, but only when there is an active order — a list of delivered orders has nothing to refresh:

```tsx
{active && isSupabaseConfigured ? <AutoRefresh interval={10000} /> : null}
```

Once Realtime lands, subscribe to the customer's own in-flight orders instead.

Worth considering while you are in this file: make the active-order card tappable straight into tracking with a visible progress bar, so the list itself answers "where is my food" without a second tap.

---

### MEDIUM · Security — Internal build tracker readable by any guest

**Where:** [build/page.tsx](src/app/build/page.tsx) · `src/lib/build-plan.ts` (1,049 lines) · `src/lib/data-access/build-stats.ts`

**What it is.** `/build` renders the project's internal five-week delivery plan — milestone titles, per-role task status, what is done versus blocked — alongside `getBuildDbSnapshot()`, which reports live row counts from application tables.

`proxy.ts` only requires a guest cookie to reach non-gated routes, and a guest cookie is one click on the login screen. So any visitor can read your roadmap and a rough measure of business volume: how many orders, vendors and customers exist.

**Why it matters.** It is information disclosure rather than a vulnerability. But it is free intelligence for a competitor in a single-city market where there may be only one — and it hands an attacker architectural detail for free. It confirmed to this audit, for example, that order updates are "AutoRefresh poll (not Supabase Realtime)".

**The fix.** Gate it behind the admin role:

```tsx
// src/app/build/page.tsx
import { requireRole } from '@/lib/auth';

export default async function BuildPage({ searchParams }) {
  await requireRole('admin');
  // …
}
```

Or move the route to `/admin/build` so it inherits the admin layout's existing guard. Add `noindex` to its metadata either way.

---

### MEDIUM · Code quality — Four pairs of migrations share a version number

**Where:** `supabase/migrations/` — `0008`, `0009`, `0015` (`0015_orders_external_id.sql` + `0015_platform_settings.sql`), `0033` (`0033_drop_mfa.sql` + `0033_reviews.sql`)

**What it is.** Migration order is defined by filename, and four numbers are used twice. Within a pair, apply order is decided by lexical sort of the description — `0033_drop_mfa` runs before `0033_reviews` because "d" precedes "r". That is arbitrary, not intended.

**Why it matters.** Today the pairs happen not to depend on each other, so nothing is broken. The risk is forward-looking: the next duplicate may pair a table creation with something that references it. That fails on a fresh database while continuing to work on the existing one — the worst failure shape, because it only surfaces when you rebuild staging or onboard a new environment.

**The fix.** Do **not** renumber applied migrations; that breaks the migration ledger on the live database. Instead:

1. Record the intended order in `supabase/migrations/README.md`, noting the four duplicate pairs are order-independent and verified as such.
2. Adopt timestamp-prefixed names for everything new (`20260819120000_realtime.sql`) — the Supabase CLI generates these by default and they cannot collide.
3. Add a pre-commit or CI check that fails on a duplicate numeric prefix.

**You must also:** run `supabase db reset` against a scratch project to confirm the full chain applies from empty. That is the only way to prove the duplicates are harmless.

---

### MEDIUM · Code quality — ~50 files import an undeclared dependency

**Where:** [auth.ts:1](src/lib/auth.ts#L1) and ~49 other files under `src/lib/` · `package.json` has no `server-only` entry

**What it is.** `server-only` is the guard that makes a build fail loudly if a server module is ever pulled into a client bundle. It is the mechanism protecting the service-role Supabase client and every data-access module from leaking into the browser. It is imported in about 50 files and declared in none.

**Why it matters.** It works today only because it resolves transitively through Next.js. Under pnpm's strict `node_modules` layout that is not guaranteed — a Next version bump that stops re-exporting it, or a switch to stricter hoisting, makes ~50 imports fail to resolve.

The failure is loud rather than silent, so this is build stability rather than a security hole. But it is a load-bearing security mechanism resting on an undeclared dependency, and it costs one line to fix.

**The fix.**

```diff
// package.json
   "dependencies": {
+    "server-only": "^0.0.1",
     "@supabase/ssr": "^0.12.0",
```

Then `pnpm install`. No source changes.

---

### LOW · Security — CSP allows `'unsafe-inline'` for scripts

**Where:** [next.config.ts:22](next.config.ts#L22)

**What it is.** `script-src` includes `'unsafe-inline'`, which removes most of the XSS protection a CSP provides. If an injection point is ever introduced, the policy will not stop the payload.

**Why it is low.** The comment at `next.config.ts:14` is honest about this being the "pragmatic budget tier" and names the upgrade path. Actual risk today is low: React escapes by default, there is exactly one inline-script construct (the theme bootstrap in `layout.tsx`, correctly wrapped in an `InlineScript` component), and no user-controlled HTML is rendered anywhere.

Recorded because it is the one place where a documented control is weaker than it reads.

**The fix.** Generate a per-request nonce in `src/proxy.ts`, pass it to the single inline script call site, and drop `'unsafe-inline'`:

```ts
const nonce = crypto.randomUUID();
response.headers.set('x-nonce', nonce);
// script-src 'self' 'nonce-${nonce}' https://cdn.onesignal.com …
```

Worth doing before you handle card payments at volume. Not urgent at current scale.

---

### LOW · Security — Live Supabase secret in two env files with drifting names

**Where:** `deligro/.env.local:4` (`SUPABASE_SERVICE_ROLE_KEY`) · `f:/deligro26/.env.local:5` (`SUPABASE_SECRET_KEY`)

**What it is — and what it is not.** This is **not a leak**. `.gitignore` correctly excludes `.env*` while keeping `.env.example`; `git ls-files` confirms only `.env.example` is tracked; the workspace root is not a git repository at all. That part is done right.

The issue is duplication and drift. The same live service-role key exists in two files under two different variable names, and the root copy also carries `SUPABASE_PUBLISHABLE_KEY` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, which the app does not read.

**Why it matters.** A service-role key bypasses RLS entirely. Two copies is two chances to paste the wrong file into a deploy config, a screen share, or a support ticket. There is no evidence any of that has happened.

**The fix.** Delete `f:/deligro26/.env.local`. The root `package.json` only proxies scripts into `deligro/`, so nothing reads it. Keep `deligro/.env.local` as the single source, confirm its names match `src/lib/supabase/config.ts` exactly, and drop the unused publishable-key aliases.

**Your call:** rotate the service-role key only if this drive has ever been shared, screen-recorded, or synced to cloud storage. If not, leave it — rotation carries its own risk and nothing found here warrants it.

---

### LOW · Performance — Recharts ships eagerly on three operator screens

**Where:** `src/components/admin/admin-charts.tsx` · `src/components/vendor/vendor-earnings-charts.tsx` · `src/components/vendor/vendor-overview-board.tsx`

**What it is.** Recharts (~400KB before compression; the two largest build chunks are 469KB and 404KB) is imported statically on three screens. It is below-the-fold decoration on all three — the numbers that matter are already in the stat tiles above the chart.

`xlsx` is handled correctly by contrast: dynamically imported at all five call sites. The pattern is already established in this codebase.

**Why it matters.** Operator screens on a shopkeeper's mid-range Android are exactly where this cost lands.

**The fix.**

```tsx
const VendorEarningsCharts = dynamic(
  () => import('@/components/vendor/vendor-earnings-charts'),
  { ssr: false, loading: () => <div className="h-64 animate-pulse rounded-2xl bg-surface" /> }
);
```

Apply to all three. Stat tiles render immediately; the chart fills in.

---

### LOW · Code quality — 290KB of screenshots and a design zip in git

**Where:** `WhatsApp Unknown 2026-07-16 at 10.20.08 PM.zip` (245KB, tracked) · `WhatsApp Unknown 2026-07-16 at 10.20.08 PM/` (4 JPEGs, tracked) · `Admin panel UI redesign.zip` (45KB, untracked)

**What it is.** Reference screenshots and a design archive committed to git.

**Why it matters.** They are in every clone forever. The directory name contains spaces and a timestamp that breaks shell scripts and some CI checkout steps on Windows. A zip in version control cannot be diffed or reviewed. Minor — but it is the kind of thing that makes a repo feel unmaintained to the next developer.

**The fix.**

```bash
git rm -r --cached "WhatsApp Unknown 2026-07-16 at 10.20.08 PM" \
                   "WhatsApp Unknown 2026-07-16 at 10.20.08 PM.zip"
```

Move the images to `docs/design-refs/` with descriptive names if they still inform current work, or delete them. Add `*.zip` to `.gitignore`.

---

### LOW · Code quality — Eleven unreachable source files

**Where:** see the merge plan below

**What it is.** Confirmed unreferenced by knip. Several are recognisable leftovers from the Phase-1 static build that `README.md` still describes — `bento.tsx`, `ai-assistant-block.tsx` and `reorder-block.tsx` are named after features README still lists as home-screen blocks.

**Why it matters.** `vendor-menu.tsx` sitting beside the live `vendor-menu-board.tsx` is exactly the two-sources-of-truth situation AGENTS.md warns about — a future reader cannot tell which is current. `src/lib/reviews.ts` (dead) beside `src/lib/data-access/reviews.ts` (live) is the most confusable pair of the set.

**The fix.** Delete all eleven, plus the unused `ws` devDependency. Verify with `pnpm build`.

> **One correction to the tooling:** knip also lists `public/OneSignalSDKWorker.js` as unused. It is a **false positive** — the OneSignal SDK fetches that file at runtime rather than importing it. Keep it, or web push breaks.

---

### LOW · Code quality — README describes a product that no longer exists

**Where:** [README.md:3](README.md#L3)

**What it is.** The README opens with "**Phase 1 · Static UI/UX** (no backend yet — all data is mock, cart/theme run client-side)" and closes by listing Supabase, real auth, payments and maps as "Not in this phase". All four have shipped: 40 migrations, live Razorpay, Renflair SMS OTP, Google Maps. It also documents `npm run dev` on port 3000 when `package.json` runs pnpm on 3005.

**Why it matters.** AGENTS.md states the project's own rule that "a stale security doc is worse than none, because it stops the next reviewer from looking." The same argument applies to the first file anyone opens.

**The fix.** Rewrite the header and the "Not in this phase" section to describe the current system: five surfaces, Supabase with RLS, Razorpay, OTP auth, polling-based board updates. Fix run instructions to `pnpm dev` / port 3005. The route tables further down are still accurate and can stay.

---

## Merge plan — duplicate and competing implementations

Following the AGENTS.md rule: judge them, keep the better one **for this project**, delete the loser.

### 1. Reviews data access

| | |
|---|---|
| **Files** | `src/lib/reviews.ts`, `src/lib/data-access/reviews.ts` |
| **Survivor** | `src/lib/data-access/reviews.ts` |
| **Why** | Integration wins. The data-access version is wired to RLS and to `/api/reviews`; `src/lib/reviews.ts` has no importers at all. |
| **Call sites to change** | None — the loser has zero. |
| **Action** | `rm src/lib/reviews.ts` |

### 2. Vendor menu components

| | |
|---|---|
| **Files** | `src/components/vendor/vendor-menu.tsx`, `src/components/vendor/vendor-menu-board.tsx` |
| **Survivor** | `vendor-menu-board.tsx` (801 lines, rendered by `/vendor/menu`) |
| **Why** | The board is live and complete; `vendor-menu.tsx` is unreferenced. Adjacent filenames for one feature is precisely the confusion AGENTS.md calls out. |
| **Call sites to change** | None. |
| **Action** | `rm src/components/vendor/vendor-menu.tsx` |

### 3. Environment configuration

| | |
|---|---|
| **Files** | `deligro/.env.local`, `f:/deligro26/.env.local` |
| **Survivor** | `deligro/.env.local` |
| **Why** | Its variable names match `src/lib/supabase/config.ts`. The root file is read by nothing — root `package.json` only proxies scripts into `deligro/`. |
| **Action** | Delete the root file; drop the unused publishable-key aliases from the survivor. |

### 4. Phase-1 home blocks (no merge — pure deletion)

`bento.tsx`, `ai-assistant-block.tsx`, `reorder-block.tsx`, `location-illustration.tsx`, `portal-nav.tsx`, `logo.tsx`, `onboarding.tsx`, `rating.tsx`, `onboarding-store.ts` — all superseded by the current home and portal implementations. Delete; nothing imports them.

---

## Impact vs effort — prioritized action list

### Quick wins — about one day total, ~19 points

| # | Action | Axis | Effort | Gain |
|---|---|---|---|---|
| 1 | Remove `maximumScale:1`; base font 15px → 16px | UX | 5 min | +6 |
| 2 | Add `src/app/manifest.ts` (app becomes installable) | Functionality | 30 min | +4 |
| 3 | Add `robots.ts`, `sitemap.ts`, restaurant `generateMetadata` | SEO | 2 h | +18 |
| 4 | Declare `server-only` in package.json | Code quality | 2 min | +2 |
| 5 | Gate `/build` behind `requireRole('admin')` | Security | 10 min | +3 |
| 6 | Delete 11 dead files, `ws`, and the committed zips | Code quality | 30 min | +5 |
| 7 | `AutoRefresh` on `/orders` when an order is active | Functionality | 10 min | +3 |
| 8 | Lazy-load Recharts on three operator screens | Performance | 30 min | +4 |
| 9 | Delete the root `.env.local` | Security | 1 min | +1 |
| 10 | Rewrite the README header | Code quality | 20 min | +1 |

**After these ten: overall 69 → ~88.**

### Bigger, and the ones that change the product

| # | Action | Axis | Effort | Gain |
|---|---|---|---|---|
| 11 | **Enable Supabase Realtime; replace polling** | Realtime | 1–2 days | +20 |
| 12 | **Hindi for customer status, driver and vendor boards** | UX | 2–3 days | +15 |
| 13 | Open `/`, `/search`, `/restaurant/*` to anonymous visitors | SEO | 4 h | +12 |
| 14 | Global offline banner + checkout submit guard | Functionality | 4 h | +5 |
| 15 | Nonce-based CSP; drop `'unsafe-inline'` | Security | 1 day | +6 |
| 16 | Timestamped migrations + duplicate-prefix CI check | Code quality | 2 h | +3 |

**My recommendation on ordering:** do the ten quick wins first — they are cheap and two of them (#1, #2) are the most visible UX improvements available to you. Then #12 (Hindi), because it is the one that decides whether the app is usable by the people who will actually use it. Then #11 (Realtime). #13 can wait until you have a deployed domain and a Search Console account ready.

---

## What's new / modernization

- **The framework is current.** Next.js 16.3 and React 19.2, with the Next 16 `proxy.ts` convention correctly adopted in place of the old `middleware.ts`. No framework upgrade is needed, and AGENTS.md rightly warns that this Next version's conventions differ from older training data.
- **Realtime is available and unused.** Supabase Realtime is on your existing plan, already permitted by the CSP, and never adopted. The app predates its own need for it.
- **No error monitoring.** The code handles failures carefully and then reports them nowhere. Sentry, or even a Supabase-logged error boundary, would surface what the careful `catch` blocks are quietly swallowing.
- **No CI.** `scripts/qa/` contains a real suite — `idor-suite`, `payments-signature`, `e2e-smoke`, `zap-baseline` — that appears to be run by hand. Wiring `scripts/qa/run-all.sh` into GitHub Actions on every push to main is the single highest-leverage DX change available here, and the work is already done.

---

## Suggestions — beyond fixing what is broken

Ideas, roughly in order of value for a single-city operation:

1. **Order-status SMS as a fallback to push.** Push only reaches an installed browser with permission granted. Renflair is already integrated for OTP, so one "Your order is on the way" SMS is a single API call and reaches every phone regardless of browser state. For this audience, SMS is the reliable channel and push is the nice-to-have.

2. **A repeat-order shortcut as the first home block.** In a single-city market the same customers order from the same three shops. Surfacing "Order again" above discovery beats any amount of browse UI — and the reorder logic already exists.

3. **Show the delivery OTP at display size.** `getDeliveryOtp` is already fetched on the tracking screen. A rider and customer reading a 4-digit code to each other at the door need it large, not in caption type.

4. **A WhatsApp share button on restaurant pages.** It is the dominant sharing channel for this audience. Fixing the OG tags (SEO finding) is what makes the shared link render properly — do them together.

5. **Reconsider guest-browse as the default.** Right now guest is an opt-in link *below* the OTP form. Requiring a phone number before a first-time user can see a single dish is a hard bounce for exactly the least confident users. Let people see the food first.

6. **Icons alongside text on the driver and vendor boards.** Riders scanning a phone one-handed recognise a shape before they read a word. This also partly hedges the language gap while translation is in progress.

7. **Test on the hardware your users have.** Not a flagship. A ₹8,000 Android on a 3G-to-4G handoff is the real target, and it will surface problems no amount of static analysis will.

---

## What this audit did not check

Being explicit, so nobody reads more confidence into this than it carries:

- **The live Supabase database.** RLS policies were read from migration files, not verified against the running project. Policies can be altered in the dashboard without a migration, so a live check is worth doing separately.
- **Core Web Vitals.** No deployed URL was available. Bundle sizes come from the local production build; LCP, INP and CLS are unmeasured.
- **Razorpay webhook signature verification** was read but not exercised against live payloads.
- **Runtime behaviour generally.** No browser session was driven. Every functional finding here comes from source, so UI defects that only appear on interaction would not have been caught.
- **Accessibility beyond static checks.** No screen reader pass, no contrast audit.
- **Real-device performance** on the low-end Android hardware this audience actually uses.

---

## Audit log

| Date | Auditor | Scope | Overall | Critical | High | Medium | Low |
|---|---|---|---:|---:|---:|---:|---:|
| 2026-08-19 | Claude (project-audit) | Full repo, static + build | 69 (D+) | 0 | 3 | 8 | 6 |
| 2026-08-19 | Claude (fix pass) | 10 quick wins applied; build + typecheck + lint clean | — | 0 | 1 closed | 4 closed | 5 closed |

Remaining after the fix pass: **Realtime** (high), **Hindi** (high), **open the
browse routes to crawlers** (high, the half of the SEO finding that touches
`proxy.ts` and needs the `docs/SECURITY_AUDIT.md` gate), **offline handling**
(medium), **polling back-off** (medium), **duplicate migration numbers**
(medium), **nonce CSP** (low), and the two page-sized chart components (low).
