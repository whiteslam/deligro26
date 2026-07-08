# Deligro — Developer Handoff

_One Next.js app, four role surfaces. How to run it, sign in to every portal, and pick up where the build is._

**Stack:** Next.js 16 (App Router) · React 19 · Supabase (Postgres + RLS) · Zustand · Tailwind v4 · runs on **port 3003**

---

## Overview — one codebase, four surfaces

Customer, Restaurant, Driver, and Admin all live in the **same** Next.js app — one login system, one API layer, one deploy. They're separated by _route_ and gated by _role_, not by separate servers. The customer app is fully open to browse; only the operator portals require a signed-in user.

The real security boundary is **server-side** and, above all, **Row Level Security** in Postgres — role-based routing is only a UI convenience. See [`SECURITY.md`](../SECURITY.md).

---

## Run it locally

### 1. Prerequisites

**Node 22+ recommended.** `supabase-js` wants a native `WebSocket`, which only exists on Node 22+. On Node 20 the seed scripts polyfill it via the `ws` package, so they still run — but the app itself is happiest on 22.

### 2. Install & configure

```bash
npm install
cp .env.example .env.local   # then fill in Supabase keys
```

> **Use the new Supabase key format.** This project uses `sb_publishable_…` and `sb_secret_…` keys (Supabase → Settings → API). The **legacy JWT** anon / service_role keys are **disabled** on this project — pasting them causes `401 Invalid API key`. The secret key is required for the seed scripts and admin operations.

### 3. Start the dev server

```bash
npm run dev   # → http://localhost:3003
```

Without Supabase keys the app still boots as a **static demo** (enforcement off) — handy for a quick UI look. With keys, auth + RLS are live.

---

## The four surfaces

| Surface | Route | What it does |
|---|---|---|
| **Customer** | `/` | Browse, cart, checkout, live tracking — no login to explore |
| **Restaurant** | `/vendor` | Live order board, menu availability, earnings |
| **Driver** | `/driver` | Online toggle, accept → pickup → delivered, earnings |
| **Admin** | `/admin` | KPIs, all-orders table, refund queue, approvals |
| Launcher | `/portals` | Links to all four — handy for demo / QA |
| Build tracker | `/build` | Live delivery plan & progress (see below) |
| Login | `/login` | Email + password today; phone OTP is on the roadmap |

---

## Database & seeding

Run the migrations once in the Supabase **SQL Editor**, in order — they create the tables, the signup trigger, RLS policies, and the service-role bypass the seed scripts rely on:

| File | Purpose |
|---|---|
| `supabase/migrations/0001_init.sql` | Tables, roles, signup trigger, RLS policies |
| `supabase/migrations/0002_catalog_display.sql` | Catalog display columns |
| `supabase/migrations/0003_lock_role_service_bypass.sql` | Lets service-role scripts assign roles |

Then seed accounts and the catalog:

```bash
npm run db:seed-users   # creates vendor + driver + admin, sets roles
npm run db:seed         # loads restaurants, links them to the vendor
```

Both are idempotent — safe to re-run. `db:seed` makes `vendor@deligro.demo` the owner of the six seeded restaurants, so its `/vendor` board is populated.

---

## Test accounts

Created by `npm run db:seed-users`. All three share one password. Each is locked to its own portal — a driver hitting `/admin` is bounced to `/login?denied=1`, enforced server-side **and** by RLS.

| Role | Email | Password | Portal |
|---|---|---|---|
| Restaurant | `vendor@deligro.demo` | `DeligroDemo1!` | `/vendor` |
| Driver | `driver@deligro.demo` | `DeligroDemo1!` | `/driver` |
| Admin | `admin@deligro.demo` | `DeligroDemo1!` | `/admin` |

> **Local demo credentials only.** The password is defined in `scripts/seed-users.ts`. These are throwaway local accounts for testing the operator portals — never reuse them anywhere real.

---

## How access works — three checks, every request

1. **Authenticated** — session refreshed + coarse gate in `src/proxy.ts`; re-checked in route handlers via `supabase.auth.getUser()`.
2. **Authorized role** — enforced server-side in each portal layout with `requireRole()` — and again in RLS. The client's claimed role is never trusted.
3. **Resource ownership** — RLS policies in Postgres. A row you may not see simply doesn't come back, so the app returns a consistent **404** — existence never leaks.

---

## The customer flow (product intent)

The whole point: let people **explore before committing**. No landing/OTP wall on open — the app boots straight into browsing.

1. **Install & open → splash** — cold-start splash, then straight into the home feed.
2. **Browse freely** — foods & restaurants, no account required. First-timers see a 3-slide intro once.
3. **Tap "Order" → sign in** _(phone OTP · planned)_ — login is demanded only at checkout. Today it's email/password; phone OTP is next up.
4. **Address → place → success** — choose a delivery address, place the COD order, land on live tracking.

> **Already shipped:** signed-in users **skip the 3-slide onboarding** — it's gated on auth (server-side), not just device storage. Returning, logged-in users never see the intro again.

---

## Roadmap — build tracker at `/build`

A live plan lives at `/build`, rendered straight from `src/lib/build-plan.ts` — flip a task's `status` and the board updates. Every task carries a running **build number** (`#1`–`#26`) so it can be referenced directly ("build 7"). The 4-week (~30 day) plan to v1:

| Week | Builds | Focus | Status |
|---|---|---|---|
| Week 0 | — | Foundation — UI, portals, Supabase auth + RLS, live catalog & orders API | ✅ Done |
| Week 1 | #6–#10 | Guest browse + phone-OTP order gate (skip-onboarding ✓, OTP login, order triggers auth) | 🟠 In progress |
| Week 2 | #11–#15 | Real ordering flow — saved addresses, checkout on live data, success screen, tracking | To do |
| Week 3 | #16–#20 | Operators on live data — restaurant board, menu toggles, driver flow, admin orders/refunds | To do |
| Week 4 | #21–#26 | Payments, hardening & launch — payments, distributed rate-limit, nonce CSP, MFA, QA, deploy | To do |

---

## Gotchas we already hit (so you don't repeat them)

- **Legacy Supabase keys are disabled.** The old JWT `anon` / `service_role` keys return `401` on this project and will _shadow_ the working `sb_*` keys if present in `.env.local` (they're resolved first). They've been commented out — a backup sits at `.env.local.bak`. Use only the `sb_publishable_` / `sb_secret_` keys.
- **Node 20 + supabase-js.** `supabase-js` throws "native WebSocket not found" on Node 20. The seed scripts polyfill it with `ws`; for the app, run **Node 22+**.
- **Secret key must be real to seed.** `db:seed` / `db:seed-users` use the service-role (secret) key to bypass RLS. A placeholder value stops them with a clear error before any writes.

---

_Repo: `deligro26/` · start with [`README.md`](../README.md) and [`SECURITY.md`](../SECURITY.md). Secrets stay in `.env.local` (gitignored) — never commit keys._
