# Deployment audit — pre-flight checklist

Work top to bottom before promoting to production. Several guards added in the
0022 hardening pass **fail closed on purpose**: a missing variable now stops the
app rather than quietly disabling a security control. That is the intended
behaviour, but it means a deploy with an incomplete environment will break
loudly. Better here than silently in front of customers.

---

## 1. Environment variables

### Required — the app refuses to run without these

| Variable | Failure if missing | Why it's fatal |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Throws at boot | Demo mode makes `requireRole()` return a synthetic admin — `/admin` would be public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Throws at boot | as above |
| `SUPABASE_SERVICE_ROLE_KEY` | Throws on first admin/OTP operation | OTP, vendor admin and push all need it |
| `OTP_PEPPER` | Throws on first OTP request | OTP hashes are worthless without it. Generate per environment: `openssl rand -hex 32` |
| `RENFLAIR_API_KEY` | OTP request returns 503 | Without it no customer can sign in |

### Optional

| Variable | Notes |
|---|---|
| `UPSTASH_REDIS_REST_URL` + `_TOKEN` (or `KV_REST_API_*`) | Not required. Rate limits default to Supabase Postgres (`0027_rate_limits.sql`). Redis is only an optional faster backend if you add it later. |

### Must be ABSENT (or empty) in production

| Variable | Why |
|---|---|
| `MFA_EXEMPT_EMAILS` | Dead since migration 0033 removed MFA — nothing reads it. Delete it wherever it is still set, so it is never mistaken for a live control |

- [ ] Every required variable is set on the **Production** environment
      specifically — not just Preview, not just Development.
- [ ] `MFA_EXEMPT_EMAILS` is unset everywhere (MFA is gone; the variable is dead).
- [ ] Each portal's sign-in page loads for a signed-out visitor and admits only
      its own role: `/admin/login`, `/vendor/login`, `/manager/login`,
      `/driver/login`, and `/login` for customers.
- [ ] No `NEXT_PUBLIC_` prefix on anything secret. Check with
      `grep -rn 'NEXT_PUBLIC_' src/ | grep -i 'secret\|service\|password'`.
- [ ] Preview deployments do **not** carry production keys. Preview URLs are
      guessable and unauthenticated.

---

## 2. Database migrations

- [ ] Every file in `supabase/migrations/` has been applied, in order, to the
      target project. Compare against the live schema — do not assume.
- [ ] **0022 specifically:** re-run its two verification queries (bottom of the
      file). The column-privilege one must return zero rows.
- [ ] The demo/QA accounts still exist and still have their roles:

```sql
select p.id, u.email, p.role
  from public.profiles p
  join auth.users u on u.id = p.id
 where u.email in ('admin@deligro.demo','vendor@deligro.demo','driver@deligro.demo');
-- Expect exactly three rows: admin, restaurant, driver.
-- If a role is wrong: update public.profiles set role='admin' where id='<uuid>';
```

- [ ] Storage buckets exist with the right visibility:
      `avatars` (public), `menu-images` (public), `vendor-logos` (public),
      `vendor-docs` (**private**).

---

## 3. One-time actions after the 0022 hardening

These are not recurring — tick them once, on the first deploy that includes 0022.

- [ ] **Rotate every vendor login password.** They were stored in plaintext in a
      world-readable column. Admin → Vendors → Edit → *Generate new password*.
- [ ] **Rotate the Supabase service-role key and publishable key.**
- [ ] **Rotate `OTP_PEPPER`.** In-flight codes are invalidated; users just
      request a new one.
- [ ] **Notify vendors** that payout details (bank account, IFSC, PAN, GST) may
      have been exposed, so they can watch their accounts.
- [ ] Delete any stray `.env.local` outside the project directory.
- [ ] Existing OTP hashes are SHA-256 and will no longer verify against the new
      scrypt scheme. Codes are 5-minute-lived, so this self-clears; optionally
      `delete from public.otp_codes where consumed = false;` at cutover.

---

## 4. Build and dependencies

- [ ] `npm ci` succeeds (not just `npm install` — the lockfile must be honest).
- [ ] `npx tsc --noEmit` clean.
- [ ] `npx eslint src` — no **errors**.
- [ ] `npm run build` succeeds.
- [ ] `npm audit --audit-level=high` clean.
- [ ] `xlsx` resolves to the SheetJS CDN tarball, not npm:
      `node -p "require('./node_modules/xlsx/package.json').version"` → `0.20.3`
      or later. `0.18.5` means the lockfile regressed to the abandoned,
      permanently-vulnerable npm build.
- [ ] Node version matches `.nvmrc` (24.x) on the deploy target.

---

## 5. Post-deploy smoke tests

Run against the deployed URL.

- [ ] **The three demo logins work:** `admin@deligro.demo`,
      `vendor@deligro.demo`, `driver@deligro.demo` each reach their portal.
- [ ] Customer phone-OTP login completes and an SMS actually arrives.
- [ ] Place a test order end to end; confirm the total matches the menu prices.
- [ ] Vendor kitchen board can advance a status but the order total is unchanged.
- [ ] Security headers present:
      `curl -sI https://<host>/ | grep -i 'content-security\|strict-transport\|x-frame\|x-content-type'`
- [ ] API responses are uncacheable:
      `curl -sI https://<host>/api/me | grep -i cache-control` → `no-store`
- [ ] **The C-1 regression check** — this must NOT return payout data:

```bash
curl -s "https://<project>.supabase.co/rest/v1/restaurants?approved=eq.true&select=name,bank_account_number,pan_number,owner_email" \
  -H "apikey: <publishable key>"
# Expect: 42501 "permission denied for column". Anything else means 0022
# did not apply, or a later migration re-granted the columns.
```

- [ ] Automated suites:

```bash
QA_PASSWORD='…' npm run test:idor
BASE_URL=https://<host> npm run test:e2e
```

---

## 6. Rollback

- [ ] The previous deployment is still promotable in Vercel.
- [ ] Note that 0022 **drops** `restaurants.temp_password`. Rolling the *app*
      back is safe; rolling the *migration* back is not, and should not be
      attempted — the column held plaintext credentials and its absence is the
      fix. Older app builds that read it will error on that one admin screen.

---

## Sign-off

| Date | Deployer | Version / commit | Notes |
|---|---|---|---|
| | | | |
