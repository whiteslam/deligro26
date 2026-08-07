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
upload checks, and rate limits on every write endpoint.

Migration **0025** adds online payment (Razorpay), shipped switched off — see
**Payments** below.

**Still to wire when you go live:** applying coupon discounts at order creation
(the endpoint validates but nothing consumes the result yet), vendor payout
settlement, and swapping any remaining portal mocks for the RLS-backed data
layer.

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

**MFA:** Supabase TOTP. Layouts call `requireOperatorMfa()`.

- **Admin — mandatory** (`MFA_REQUIRED_ROLES` in `src/lib/auth/mfa.ts`). Not
  enrolled → forced to `/mfa/setup`; enrolled but `aal1` → challenged at `/mfa`.
  Cannot be switched off from settings.
- **Restaurant / driver / manager — optional.** Opt in from settings; once
  enrolled they are challenged like a required role.

Enable TOTP in the Supabase dashboard (**Authentication → Providers /
Multi-Factor → TOTP**).

*Exemption:* the seeded QA logins (`admin`/`vendor`/`driver@deligro.demo`) skip
the mandatory gate outside production, so `npm run test:*` can reach the admin
portal. In production nothing is exempt unless named in `MFA_EXEMPT_EMAILS`,
which must be left unset on the live environment.

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
