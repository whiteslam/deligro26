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

**Still to wire when you go live:** payment webhook signature verification, a
nonce-based CSP to drop `'unsafe-inline'` from `script-src`, and swapping any
remaining portal mocks for the RLS-backed data layer.

**MFA (admin / restaurant):** Supabase TOTP. Layouts call `requireOperatorMfa()`
so sessions must be `aal2`. First visit enrolls at `/mfa/setup`; later sign-ins
challenge at `/mfa`. Enable MFA in the Supabase dashboard
(**Authentication → Providers / Multi-Factor → TOTP**).

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
