# Security audit — standing checklist

Run this before every release, and whenever a migration touches a policy, a
grant, or a table that anon/authenticated can read. It exists because the worst
finding in this codebase's first audit (0022) was not a bug anyone wrote — it
was a correct policy from 0001 that a later migration quietly outgrew.

Record the date, the reviewer and the outcome at the bottom.

---

## 0. The rule that produced the worst finding

> **RLS filters rows. It does not filter columns.**

`restaurants — read` allowed any row where `approved` is true — correct in 0001,
when the table held eight display fields. Migration 0017 added bank account,
IFSC, PAN and GST to that same table; 0020 added the vendor's plaintext login
password. Nobody changed the policy, because nobody had to: the policy was
already permissive, and each `add column` silently widened what it exposed.

**So:** adding a column to a publicly-readable table is a security change.
Treat it like one.

Migration 0022 makes the failure direction safe — `restaurants` now grants
SELECT on an explicit column list, so a newly added column is invisible until
someone grants it on purpose. If a new field doesn't show up in the app, that is
the guard working. Grant it deliberately, and only if it is genuinely public.

---

## 1. Database

- [ ] Every new table has `enable row level security` **and** at least one policy.
      RLS with no policies = deny-all, which is safe but usually a mistake.
- [ ] No policy is `for all` unless INSERT, UPDATE **and** DELETE are all
      genuinely intended for that role. (C-3 was a `for all` that meant
      "owners may edit", and accidentally meant "anyone may create".)
- [ ] Any `with check` that should also constrain the **old** row has a
      companion trigger — `WITH CHECK` cannot see `OLD`. See
      `lock_restaurant_privileged_fields` and `guard_order_update`.
- [ ] Every UPDATE policy names which **columns** the role may move, via trigger.
      A row-scoped UPDATE grant is a whole-row grant.
- [ ] No new column on `restaurants`, `profiles`, `platform_settings` or any
      other `using (true)` / publicly-readable table holds PII, money-routing
      data, credentials or statutory identifiers.
- [ ] `security definer` functions: `set search_path = public` is present, and
      `execute` is granted to the narrowest role that needs it — not `anon` by
      reflex. (M-4: `bump_banner_stat` was an anonymous write API.)
- [ ] Policy expressions state their rule directly rather than relying on
      nested RLS of a referenced table (L-1).

Verification queries:

```sql
-- Tables with RLS off, or on with no policies at all.
select c.relname,
       c.relrowsecurity as rls_on,
       count(p.polname)  as policies
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  left join pg_policy p on p.polrelid = c.oid
 where n.nspname = 'public' and c.relkind = 'r'
 group by 1, 2
 order by rls_on, policies;

-- Anything sensitive that anon/authenticated can still SELECT.
select table_name, column_name, grantee
  from information_schema.column_privileges
 where table_schema = 'public'
   and grantee in ('anon', 'authenticated')
   and privilege_type = 'SELECT'
   and (column_name ~* 'bank|ifsc|pan_|gst|upi|password|secret|token|api_key'
        or column_name ~* 'owner_email|owner_mobile');

-- SECURITY DEFINER functions executable by anon.
select p.proname
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public' and p.prosecdef
   and has_function_privilege('anon', p.oid, 'execute');
```

---

## 2. Authorization in app code

- [ ] Every exported `"use server"` function begins with `requireRole` /
      `requireUser` / an explicit role check. No exceptions for "internal"
      helpers — a Server Action is a public HTTP endpoint.
- [ ] Every route handler calls `supabase.auth.getUser()` (never `getSession()`)
      before touching data.
- [ ] No config check can *widen* access when it fails. `isSupabaseConfigured`
      returning false must never grant a role (H-1).
- [ ] Anything using `createAdminClient()` has an authorization check above it
      in the same call path — the service role bypasses RLS entirely.
- [ ] A "not yours" result answers **404**, identical to "doesn't exist".

```bash
# Server actions whose first statement isn't a gate — eyeball each hit.
grep -rn -A3 '^export async function' src/app --include='*actions.ts' \
  | grep -B1 -v 'requireRole\|requireUser\|getProfile\|guard()\|mutate('
```

---

## 3. Secrets and identity

- [ ] No credential is stored in a table in reproducible form. Hash it, or
      show it once and drop it (C-2).
- [ ] `NEXT_PUBLIC_` prefixes only on values that are safe in a browser bundle.
- [ ] `git log --all -p -- '.env*'` shows no real keys, and no `.env.local`
      exists outside the gitignored project directory.
- [ ] Any field that determines **which account you log into** — today
      `profiles.phone` — cannot be changed without proving control of the new
      value (H-5).
- [ ] Password/OTP comparisons use `timingSafeEqual`, and OTP hashing uses a
      slow KDF, not bare SHA-256 (M-6).

---

## 4. Endpoints

- [ ] Every write endpoint has a `rateLimit()` call. Unauthenticated ones key on
      `clientIp(request)`; authenticated ones on `user.id`.
- [ ] Endpoints that send SMS or otherwise cost money per call are limited by
      **caller**, not only by target (L-4 — per-phone caps don't stop someone
      walking a list of numbers).
- [ ] Request bodies are validated, not cast. `as CreateOrderInput` is a
      compile-time fiction.
- [ ] Uploads verify **magic bytes**, not `file.type` (`assertRealType`).
- [ ] No client-supplied value shapes a storage path.
- [ ] Money is always recomputed server-side from database prices.

---

## 5. Dependencies

- [ ] `npm audit` is clean at `--audit-level=high`.
- [ ] `xlsx` still resolves to the SheetJS CDN tarball, not npm — the npm
      channel is abandoned at 0.18.5 and permanently vulnerable (H-3). If a
      lockfile refresh silently moves it back to `^0.18.5`, that is a
      regression.

---

## 6. Output

- [ ] No `dangerouslySetInnerHTML` with a value that isn't a literal or
      `JSON.stringify` of server-owned data.
- [ ] Any user- or admin-authored string used as an `href` passes a scheme
      allowlist (`safeExternalHref`) — "trusted author" is not one (M-1).

---

## Known accepted risks

Re-confirm each release that these are still deliberate:

| # | Risk | Why accepted | Revisit when |
|---|---|---|---|
| M-5 | CSP allows `'unsafe-inline'` in `script-src` | A nonce forces **every page dynamic** — no static rendering, no ISR, no CDN caching, PPR incompatible (Next 16 CSP guide). Real cost for a storefront. | Traffic justifies the spend, or experimental SRI stabilises |
| M-7 | Coupons validated but never applied at order creation | Feature is half-wired; the endpoint is now authenticated + rate limited | Payments branch lands |
| L-8 | Renflair API key + OTP travel in a GET query string | Provider's only documented interface | Renflair offers a POST endpoint |
| — | `MFA_EXEMPT_EMAILS` / demo accounts skip admin MFA | Needed for `npm run test:*` | Must be **unset in production** — check every deploy |

---

## Log

| Date | Reviewer | Scope | Outcome |
|---|---|---|---|
| 2026-08-06 | Security review | Full codebase + migrations 0001–0021 | 3 Critical, 5 High, 10 Medium, 9 Low. Remediated in migration 0022 + app changes. CSP nonce deferred (see above). **Action outstanding: rotate all vendor passwords and the Supabase keys.** |
