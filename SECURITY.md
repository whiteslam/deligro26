# Deligro — security & setup

This app enforces authorization the way the project checklist demands: **on the
server, every time**, and — most importantly — **at the database** via Supabase
Row Level Security (RLS). RLS is the real boundary. Even if an API route forgets
a check, Postgres refuses to return rows that aren't yours, which closes the
IDOR / broken-access-control class (OWASP API #1).

## The three checks (authenticated → role → ownership)

Every request that touches a record passes:

1. **Authenticated** — verified in `src/proxy.ts` (session refresh + coarse gate)
   and re-checked in route handlers via `supabase.auth.getUser()`.
2. **Authorized role** — enforced server-side in each portal layout with
   `requireRole()` (`src/lib/auth.ts`) **and** in RLS policies. The client's
   claimed role is never trusted.
3. **Resource ownership** — enforced by RLS policies in
   `supabase/migrations/0001_init.sql`. A row you may not see doesn't come back,
   so the app returns **404** (identical to "doesn't exist") — existence never
   leaks.

Reference endpoint: [`src/app/api/orders/[id]/route.ts`](src/app/api/orders/[id]/route.ts).
Reference data layer: [`src/lib/data-access/orders.ts`](src/lib/data-access/orders.ts).

## Role matrix → RLS policies

| Can access… | Customer | Restaurant | Driver | Admin | Enforced by |
|---|---|---|---|---|---|
| Own orders | ✅ | – | – | ✅ | `orders — read` |
| Others' orders | ❌ | ❌ | assigned & active only | ✅ | `is_active_driver_for()` |
| Own menu/listing | – | ✅ | – | ✅ | `owns_restaurant()` |
| Others' menus (write) | – | ❌ | – | ✅ | `menu — owner manage` |
| Issue refunds | request only | ❌ | ❌ | ✅ | `refunds — *` |
| User management / role change | ❌ | ❌ | ❌ | ✅ | `lock_role()` trigger |

Driver access auto-revokes when the delivery status leaves `assigned`/`picked_up`
(delivered or reassigned) — the "assigned only, while active" rule, in SQL.

### Manager — an operations role, not a small admin

`manager` (migrations **0022**/**0023**) reads every order, advances its status,
and manages `deliveries` to dispatch riders. It has no write on
`platform_settings`, no refund decision, and no vendor management. It is not
`is_admin()`, so `guard_order_update()` holds it to `status` and nothing else,
exactly as it holds a vendor or a driver.

**Phone orders are the one exception, and it is a code path rather than a
privilege.** A manager has no INSERT policy on `orders` — deliberately, and
0023 says so in its header. An INSERT policy would travel with the role into any
raw PostgREST call, with any `customer_id`, any `total` and no attribution.
Instead, `placePhoneOrder()` (`src/lib/data-access/manager-phone-orders.ts`) is
the only way to create one:

- It re-checks the acting role in the same scope as `createAdminClient()`, so a
  future caller that forgets `requireRole` still fails.
- The bill is computed from `menu_items` prices and live platform settings. The
  request carries dish ids and quantities and no amount at all.
- Every row it writes stamps `channel = 'phone'` and `placed_by = <the
  operator>` (migration **0029**). Both join the locked-column list in
  `guard_order_update()`, so nobody below admin can rewrite the attribution
  afterwards — including the manager who created it.
- On a database without 0029 it **refuses to place the order**. The audit trail
  is what makes writing an order in someone else's name defensible, so producing
  one without it is not an acceptable degradation.
- Payment is always COD. There is no path by which this role can mark money
  received; `payment_status` still only leaves `pending` through the service
  role after a verified signature.

Placing a phone order can create a customer account for a number that has none.
It goes through `resolveAccountByPhone()` — the same resolver OTP login uses, so
there is one account per mobile — and the action is rate-limited on the
operator's id.

## What's covered vs. still to wire

**Covered now:** server-side role gating, DB-level ownership (RLS), role can't be
self-assigned (signup trigger defaults to `customer`; `lock_role` blocks
escalation), authoritative order totals (`recompute_order_total`), consistent
404s, secrets kept server-side (`.env.local` gitignored; service-role key never
`NEXT_PUBLIC`), **security headers** (CSP, HSTS, X-Frame-Options, nosniff,
Referrer-Policy, Permissions-Policy — `next.config.ts`), and **app-level rate
limiting** (`src/lib/rate-limit.ts` via Upstash/Vercel KV, applied to the orders
API; in-memory fallback when KV env vars are unset).

Migration **0024** additionally closes the findings from the first full audit:
column-level SELECT on `restaurants` (RLS filters rows, not columns — and 0017
/ 0020 had added payout, KYC and plaintext-credential columns to a publicly
readable table), admin-only vendor creation and approval, a column guard so a
vendor cannot rewrite an order's `total`, explicit `order_items` visibility, and
`bump_banner_stat` off the anon grant. Application-side: fail-closed config,
mandatory admin MFA, OTP-verified phone changes, scrypt OTP hashing, magic-byte
upload checks, and rate limits on every write endpoint. (Admin MFA was later
removed — see **MFA** below.)

Migration **0025** adds online payment (Razorpay), shipped switched off — see
**Payments** below.

Migration **0030** fixes a control that had been asserted here and was not
true. 0024 locked `total` against every role below admin and stated that
`recompute_order_total()` was exempt "because it is SECURITY DEFINER owned by
postgres". SECURITY DEFINER changes a function's *privileges*; it does not
change `auth.uid()` or `auth.jwt()`, which still describe the requesting
customer. So the guard fired on the recompute and **no customer could place an
order** — checkout 500'd after writing an orphan order at `total = 0`. The
guard is now SECURITY INVOKER and tests `current_user`, which really is
`postgres` inside a trusted definer and `authenticated` under PostgREST. 0030
also pins `total` at INSERT: `orders — customer insert` only ever checked row
ownership, so a direct PostgREST call could post its own total.

**Still to wire when you go live:** vendor payout settlement, and swapping any
remaining portal mocks for the RLS-backed data layer.

Coupon discounts are applied as of migration **0031** — see below.

## Coupons

A discount is money, so none of it is the client's to state:

- **The amount is derived, never accepted.** `apply_coupon_to_order()` reads the
  order's own `order_items` for the subtotal and prices the coupon itself.
  `/api/coupons/validate` still exists, but only as the checkout's preview —
  the same split `computeChargesWith` already makes for fees.
- **`orders.discount` and `orders.coupon_code` cannot be written from a
  client.** Both are on the locked list in `guard_order_update()`, and the
  INSERT trigger from 0030 pins them alongside `total`. The sole writer is the
  SECURITY DEFINER function, which passes the guard because of 0030's
  `current_user` test.
- **One redemption per order, enforced by a unique constraint** — not by the
  code remembering to check. Two concurrent calls cannot both discount the same
  order; the loser catches `unique_violation` and reports the discount as
  already applied, which it is.
- **Codes are limited per customer.** `max_per_customer` defaults to **1**.
  Before 0031 the table had no limit column at all, so both live codes were
  usable by the same person on every order they ever placed — a promo that is
  really a permanent price cut. NULL means unlimited, so "no limit" is now
  something an admin chose.
- **The order must still be `placed`.** A coupon cannot be applied to an order
  the kitchen has already accepted, which would change a bill someone agreed to.
- `coupon_redemptions` has no INSERT/UPDATE/DELETE policy for anyone; reads are
  RLS-scoped to the customer the row is about, plus admins.

The delivery fee is not discountable — the discount is capped at the food
subtotal, because somebody still rides the order to the door. The discount comes
off the grand total *after* tax rather than reducing the taxable base; that
keeps one implementation of the fee-and-tax arithmetic (`src/lib/pricing.ts`)
instead of forking it into SQL. Revisit if GST-correct invoicing is needed.

## Payments

Online payment is **off by default**. The customer sees "Available soon" at
checkout and COD is the only method until *both* an admin enables it in
**Settings → Platform → Online payment** *and* the Razorpay keys are present.
`onlinePaymentsEnabled()` is the single gate; a missing key reduces what is
offered rather than being ignored.

What holds the money boundary:

- **`orders.payment_status` is the only truth about payment**, and nothing
  holding a user JWT can set it. A `before insert` trigger pins it to `pending`
  for customers, and it joins the locked-column list in `guard_order_update()`
  so a vendor, driver or manager can still only move `status`. It leaves
  `pending` exclusively through the service role, after a verified signature.
- **Two signatures, two secrets.** The browser callback is signed over
  `${order_id}|${payment_id}` with `RAZORPAY_KEY_SECRET`; the webhook is signed
  over its **raw body** with `RAZORPAY_WEBHOOK_SECRET`. Both are compared in
  constant time. The webhook must read `request.text()` before any JSON parse —
  re-serialising reorders keys and the digest stops matching.
- **A valid signature does not say *which* of our orders was paid.** It covers
  Razorpay's own ids only, so `/api/payments/razorpay/verify` also checks that
  the signed provider order belongs to the Deligro order being settled —
  otherwise a genuine signature from a ₹50 order could be replayed onto a ₹5,000
  one.
- **The webhook is the authority.** It is idempotent (unique
  `provider_order_id`), never walks a settled payment backwards, and answers 2xx
  for anything applied or duplicate so Razorpay stops retrying. It does *not*
  check whether payments are currently switched on: money already in flight when
  an admin flips the toggle off is still real.
- **No secret is configured → the endpoint 503s.** It does not process an
  unverified body.
- **The vendor never sees an unpaid online order.** The kitchen board filters to
  `payment_method = 'cod' OR payment_status = 'paid'`, so an abandoned checkout
  does not put a kitchen to work.
- `payments` has no INSERT/UPDATE/DELETE policy at all — reads are RLS-scoped to
  the customer and admins (not the vendor, driver or manager), and every write
  goes through the service role behind a signature check.

Verify the crypto with `npm run test:payments` (offline — no keys, no network).
Point the Razorpay dashboard webhook at `/api/payments/razorpay/webhook` and
subscribe to `payment.captured`, `payment.failed` and `refund.processed`.

**Deliberately not done — a nonce-based CSP.** Dropping `'unsafe-inline'` from
`script-src` requires a per-request nonce, and per the Next 16 CSP guide that
forces *every* page to render dynamically: no static generation, no ISR, no CDN
caching, and PPR becomes incompatible. That is a real cost for a storefront, so
it is a product decision rather than a default. The exploitable vector it would
have covered (a `javascript:` banner target) is closed directly instead, at both
the write and read ends. Tracked in `docs/SECURITY_AUDIT.md` under accepted risks.

**MFA: removed** (migration 0033). There is no TOTP enrollment, no challenge
screen, and no assurance-level check anywhere in the app. `MFA_EXEMPT_EMAILS` is
no longer read — drop it from every environment. Factors a user enrolled while
MFA existed remain in `auth.mfa_factors` and are simply never asked for; clear
them from the Supabase dashboard if you want them gone.

What guards an operator portal now is the sign-in page it is behind, plus the
role check in its layout:

| Portal | Door | Layout gate |
| --- | --- | --- |
| `/admin` | `/admin/login` — email + password, or phone OTP | `requireRole("admin")` |
| `/vendor` | `/vendor/login` — email + password, or phone OTP | `requireVendorAccess()` (role **or** restaurant ownership) |
| `/manager` | `/manager/login` — email + password, or phone OTP | `requireRole(["manager","admin"])` |
| `/driver` | `/driver/login` — email + password, or phone OTP | `requireRole("driver")` |
| customer app | `/login` — phone OTP, or guest | none — the app is public to any account |
| `/switch` | none — it is *behind* a door | `requireUser()`; lists only the caller's own surfaces |

**No global login.** A single `/login` used to authenticate everyone and then
route on `profiles.role`, which meant one account's role decided which app you
got: the owner's phone is an admin, so signing in to *shop* landed on the admin
console. Each door now leads to exactly one place. A door never inspects your
role to redirect you elsewhere — the portal's own layout decides whether to
admit you, and bounces back to that same door with `?denied=1` if not.

**Switching surfaces (`/switch`).** One person is often two things — the owner's
phone is an admin account *and* the account they shop with — so after a customer
sign-in `/login` lands on `/switch`, which asks which app to open. It reads
`profiles.role` (plus restaurant ownership) for **the caller's own account** and
renders links; `src/lib/auth/surfaces.ts` computes the list. An account with only
the customer app is redirected straight through and never sees the screen. The
same list drives the "Switch app" rows on the customer profile tab and the
"Customer app" link in the admin console's chrome.

This is navigation, not authorization. Every link lands on a layout that still
runs `requireRole()` / `requireVendorAccess()`, with RLS underneath. Getting the
list wrong can only offer a door the account cannot open — never open one. The
old failure mode (routing *on* role) is not back: nothing here redirects an
operator away from the customer app, and the choice is the person's, per sign-in,
with no stored preference to poison.

Every door offers phone OTP as well as a password, because operator accounts are
not all email accounts — the owner's admin account is a phone account seeded by
`scripts/seed-developer.ts`, and an email-only admin door would lock it out. That
is not new exposure (the old global `/login` already handed that account admin on
an OTP), but it does mean **possession of an admin's phone number is possession
of the admin console**. With MFA gone and no second factor behind it, the
operator-account hygiene items in `docs/SECURITY_AUDIT.md` — unique addresses, no
shared logins, rotation on offboarding, and now control of the registered mobile
— are the whole of the account-security story.

### CSP note
The CSP in `next.config.ts` allows `'unsafe-inline'` for scripts because of the
inline pre-paint theme bootstrap. To fully harden against XSS, generate a
per-request nonce in `src/proxy.ts`, attach it to the bootstrap `<script>`, and
replace `'unsafe-inline'` with `'nonce-…'` in `script-src`.

## Setup

1. Create a project at [supabase.com](https://supabase.com) (free tier).
2. `cp .env.example .env.local` and fill in the URL + anon key + service-role key
   from **Settings → API**.
3. Run the migration: paste `supabase/migrations/0001_init.sql` into the Supabase
   **SQL editor** and run it (or `supabase db push` with the CLI).
4. Create users in **Authentication → Users**. Each gets a `customer` profile by
   default. To make someone an admin/restaurant/driver, run in SQL:
   ```sql
   update public.profiles set role = 'admin' where id = '<user-uuid>';
   ```
5. Restart `npm run dev`. Auth + enforcement are now live; without keys the app
   runs as a static demo (enforcement off).
6. Run `0002_catalog_display.sql`, then `npm run db:seed` to load restaurants.

## Test it yourself (do this before launch)

### Automated suite (preferred)

```bash
# Password for QA + demo accounts (never commit). Creates qa-customer-a/b@deligro.qa.
QA_PASSWORD='…' npm run test:idor     # RLS + HTTP cross-account IDOR
BASE_URL=http://localhost:3003 npm run test:e2e   # guest gates, headers, auth walls
ZAP_TARGET_URL=https://your-staging.example npm run test:zap   # OWASP ZAP baseline

# All three (ZAP only if ZAP_TARGET_URL / STAGING_URL is set):
QA_PASSWORD='…' BASE_URL=http://localhost:3003 npm run test:qa
```

Scripts live in `scripts/qa/`. The IDOR suite provisions two customers, plants an
order + address for A, then asserts B gets **null / 404** (never a data leak),
vendors/drivers cannot see unowned orders, and `lock_role` blocks escalation.

### Manual spot-checks

- Create two customers, A and B. Sign in as A, note an order id from the Network
  tab, then `GET /api/orders/<A's id>` while signed in as **B** → must be **404**.
- Sign in as a customer and open `/admin` → must redirect to `/login?denied=1`.
- Try to `update public.profiles set role='admin'` as a normal user via the API →
  blocked by `lock_role`.
- Run OWASP ZAP against a **staging** copy, never production data
  (`npm run test:zap`).
