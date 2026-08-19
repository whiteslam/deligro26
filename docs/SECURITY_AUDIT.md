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
      show it once and drop it (C-2). **One documented exception:**
      `vendor_login_credentials` (migration 0039) holds vendors' hand-off
      passwords in clear so the admin desk can read them back. If you are
      reviewing it, check the containment rather than the value — RLS enabled
      with no policies, all privileges revoked from `anon`/`authenticated`,
      `service_role` only, reached solely through the `server-only`
      `vendor-credentials.ts` behind `requireRole("admin")`. Any new plaintext
      credential outside that table is a finding.
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
| **N-1** | `delivery_fee` and `tax_amount` are accepted as submitted at order INSERT | At `BEFORE INSERT` there are no `order_items` yet, so a trigger has no subtotal to derive them from. Closing it means recomputing fees in SQL from `platform_settings` — a second implementation of `src/lib/pricing.ts`, which is a design decision, not a drive-by. `total` itself is pinned (0030), so the exposure is the fee and tax only, on a direct PostgREST call. | Order creation moves behind a single `place_order()` RPC, which closes it for free |
| L-8 | Renflair API key + OTP travel in a GET query string | Provider's only documented interface | Renflair offers a POST endpoint |
| **P-1** | Admin sign-in is a password alone — MFA was removed entirely (migration 0033) | Product decision: the enrolment + challenge flow was being worked around rather than used, and every portal now sits behind its own door with a server-side role check. | Any admin credential is shared, phished, or reused — or the console starts exposing payout changes to more than one operator |

---

## Log

| Date | Reviewer | Scope | Outcome |
|---|---|---|---|
| 2026-08-06 | Security review | Full codebase + migrations 0001–0021 | 3 Critical, 5 High, 10 Medium, 9 Low. Remediated in migration 0022 + app changes. CSP nonce deferred (see above). **Action outstanding: rotate all vendor passwords and the Supabase keys.** |
| 2026-08-13 | **Incident** | `guard_order_update()` vs `recompute_order_total()` | **Checkout was broken in production and nobody had noticed.** 0024 locked `total` and asserted, in a comment, that the recompute was exempt for being SECURITY DEFINER. It is not: SECURITY DEFINER changes privileges, not `auth.uid()`/`auth.jwt()`, so `is_admin()` was still false inside it and the guard raised on its UPDATE. `createOrder()` throws on that error, so every checkout returned 500 *after* writing the order and its items — an orphan at `total = 0`. Undetected because the last app order predates 0024 (2026-07-13); every older row came from the legacy import, which runs as the service role and is exempt. Fixed in **0030**: the guard is now SECURITY INVOKER and tests `current_user`, the only signal that distinguishes a trusted definer (`postgres`) from a PostgREST caller (`authenticated`) — verified by measurement, after a first attempt that kept the guard as DEFINER and silently exempted everyone. Same migration pins `total` at INSERT (see N-1 for what is still open). Regression-tested on a throwaway Postgres with all migrations replayed: customer recompute succeeds, customer/manager writes to locked columns still raise. |
| 2026-08-13 | Change review | Migration 0031 — coupon redemption | §1 walked. New table `coupon_redemptions`: RLS on, SELECT-only policy scoped to the subject customer plus admin, write privileges revoked from anon/authenticated — the sole writer is a SECURITY DEFINER function owned by postgres. Discount is derived from `order_items`, never accepted from a caller; `discount` and `coupon_code` added to the locked-column list and to the INSERT pin. One redemption per order enforced by a UNIQUE constraint rather than by application logic, so the concurrent case cannot double-discount. `max_per_customer` defaults to 1, which tightens the two pre-existing codes from unlimited — the safe direction. `apply_coupon_to_order` is `security definer` + `set search_path = public`, with EXECUTE revoked from public/anon. Cross-customer application returns `order_not_found` rather than a distinct error, so the queue does not confirm which order ids exist. |
| 2026-08-13 | Change review | Migration 0029 + manager phone-order desk | §1 walked. No new table, no new policy, and **no manager INSERT on `orders`** — the write is a single service-role function with the role re-checked in the same scope as `createAdminClient()`. Two columns added to `orders` (`channel`, `placed_by`); `orders` is row-scoped by RLS rather than publicly readable, and neither column carries PII, money-routing data or a credential — `placed_by` is an opaque staff uuid visible only to that order's own customer. Both were added to `guard_order_update()`'s locked list in the same migration, so the UPDATE grant a manager holds still moves `status` alone. `security definer` + `set search_path = public` preserved on the re-declared guard; trigger ordering vs `zz_orders_stamp_lifecycle` re-asserted. Order totals stay server-computed (`recompute_order_total`); the action carries no amount. Payment untouched — the desk is COD-only and cannot reach `payment_status`. All three actions rate-limited on the operator's id. The desk **fails closed on an un-migrated database** rather than writing an unattributable order. |
| 2026-08-16 | Change review | MFA removal + per-portal sign-in (migration 0033) | §1 walked. **Controls removed:** all of MFA — `requireOperatorMfa()`, `MFA_REQUIRED_ROLES`, `MFA_EXEMPT_EMAILS`, the `/mfa` challenge + `/mfa/setup` screens, recovery codes, and tables `user_mfa` / `mfa_recovery_codes` (dropped in 0033). `auth.mfa_factors` is Supabase's and is left alone; enrolled factors are simply never asked for. Logged as accepted risk **P-1** — admin is now single-factor, and because every door also offers phone OTP (the owner's admin account is a phone account), control of a registered mobile is control of that portal. **Controls unchanged:** every portal layout still calls `requireRole()` / `requireVendorAccess()` server-side, RLS is untouched, no policy or grant was altered, and the two dropped tables were read by nothing but the deleted MFA code. **Controls added:** each portal has its own sign-in page and the proxy bounces to *that* one, so a failed role check returns to the door it failed at instead of a shared login; `requireRole` now redirects on the role it *wanted*, not the caller's. `/auth/signout?next=` was added and is filtered through `safeNextPath()` (relative, non-protocol-relative only) — checked as an open-redirect candidate, closed. Post-login routing no longer reads `profiles.role` at all: the customer shell's `redirect(roleHome(...))` is gone, which is what made an admin-role account unable to open the customer app. That widens nothing — the customer app was already reachable by any authenticated user, and `orders — customer insert` (0001) still requires `current_role() = 'customer'`, so a non-customer role browsing the shop cannot place an order. |
| 2026-08-17 | Change review | Bulk folder upload for the food photo library | §4 walked; no migration, no policy, no grant, no new column. **No new endpoint** — the folder upload sends one POST per photo to the existing `POST /api/admin/food-images`, so `requireRole("admin")`, `assertRealType()` (magic bytes), the 2 MB cap and the duplicate-title constraint are all unchanged and unbypassed. **No client-supplied value shapes a storage path**: `addFoodImage` still names the object `randomUUID()`.`ext`, and the filename reaches the server only as the `title` string, which was already an operator-supplied field and is rendered as text. **One control loosened:** the per-admin rate limit on that route went 60 → 240 per minute, because three concurrent uploads drained the old window in twenty seconds and killed the rest of a folder. Still keyed on `admin.id`, still an authenticated-admin-only route; the worst case it widens is an admin filling the bucket faster, which is not a boundary an admin was on the far side of. The client honours `Retry-After` on a 429 and requeues instead of failing, so the limiter now throttles a batch rather than breaking it. Client-side shrinking (`src/lib/images/shrink.ts`) is convenience only — it re-encodes before sending, and every one of its failure paths hands the original file to the server to rule on. |
| 2026-08-20 | Change review | Migration 0040 — an operator may place its own order | §1 walked. **One policy changed, one role added:** `orders — customer insert` now admits `current_role() in ('customer','admin')` instead of `'customer'` alone. The `customer_id = auth.uid()` half is untouched, which is what bounds it — an admin may insert an order **as themselves** and still cannot attribute one to another person; writing an order in someone else's name remains `placePhoneOrder()` on the service role with `placed_by` stamped (0029, unchanged, including its "no manager INSERT policy" reasoning for every role below admin). Not widened to `restaurant`, `driver` or `manager`; those still get the 403. **Nothing else about an admin's order is special:** `force_order_total_pending` and `guard_order_update` (0030) already exempted admin, and `createOrder()` sends `total = 0` and calls `recompute_order_total()`, so the money is derived from `order_items` exactly as for a customer — an admin gains no ability to state a price they did not already have. No new table, no new column, no grant. **Supersedes the last sentence of the 2026-08-16 row**, which cited this policy as the reason a non-customer role browsing the shop could not order; that now holds for every role except admin. **One read tightened in the app:** the customer order screens moved from `listVisibleOrders()` to a new `listMyOrders()` (`customer_id = me`). `orders — read` grants an admin every row, so the owner shopping through the customer app was shown the whole platform's order book on `/orders` with a stranger's delivery in the Active card. RLS is unchanged — this is the customer app declining to use headroom it should never have been using; for a customer the two queries return the same rows. |
| 2026-08-20 | Change review | Migration 0041 — vendor-scoped coupons, funding, derived offer badge | §1 walked. **One control tightened, and it is the point of the migration.** `coupons — read active` (0006) was `for select using (active and not expired)` with Supabase's default table grants behind it, so **`anon` could enumerate every live promo code on the platform** — the exact thing `/api/coupons/validate`'s session requirement and 20/minute limit exist to prevent. SELECT is now revoked from `anon` outright; the policies admit admins (all rows) and vendors (rows for shops they own) and nobody else. A shopper reaches a code only through the new `preview_coupon()` SECURITY DEFINER function, which answers about one code they already named. **New writers, bounded at the database:** vendors gain INSERT/UPDATE/DELETE on `coupons` through policies that require both `restaurant_id in (owned shops)` and `funded_by = 'vendor'` in the `WITH CHECK` — verified on a throwaway Postgres that a vendor inserting for another shop, or billing the platform, is refused by RLS rather than by the form. The vendor server actions pin both fields from the session regardless of what the form posts; that is the second lock, not the only one. **Money:** `orders.discount_funded_by` added and appended to `guard_order_update()`'s locked list and to `force_order_total_pending()`'s INSERT pin, alongside `discount`/`coupon_code` from 0031. It closes a real accounting hole rather than a security one, and a bigger one than the earnings screen: `foodGrossFromOrder()` — the arithmetic behind every actual payout, the order-payout list and the finance reports — derived the shop's food value as `total - fee - tax - tip`, and `orders.total` is net of the discount. So the shop funded every platform promotion **and** paid commission on the reduced value while the platform kept the customer's goodwill. `foodGross` now adds a platform-funded discount back, and the COD branch remits it, since on cash orders the shop collected that much less at the door — which is the branch that matters, online payment being off by default. A discount with no recorded funder reads as vendor-absorbed, so no settled backlog is silently re-priced by the migration; making those vendors whole is a deliberate `update orders set discount_funded_by = 'platform' where discount > 0 and discount_funded_by is null`, for an operator to run or not. Pricing consolidated into one `price_coupon()` used by both preview and redemption; the TypeScript copy it replaces never checked `max_redemptions` and could not check the restaurant. Scope is enforced against the order's own `restaurant_id`, never a value the client sent. **`restaurants.offer` stops being an input.** Written only by `refresh_restaurant_offer()`; a `BEFORE INSERT OR UPDATE` guard reverts it for every caller except the definer — service role and admin included, deliberately, since a hand-set badge would be overwritten by the next coupon write. `offer_expires_at` added and granted to anon/authenticated by explicit column grant (AGENTS.md §1 / migration 0024), because the customer app cannot decide whether to draw the badge without it; it carries no PII. All four new functions are `set search_path = public` with EXECUTE revoked from `public`/`anon` except `preview_coupon`, which is granted to `authenticated`. Replayed twice on a throwaway Postgres for idempotency. |
| 2026-08-20 | Change review | Migration 0042 — rider dispatch, exclusivity window, arrival notification | §1 walked. **No policy changed, no grant changed, no function added.** Three columns on `deliveries` (`offered_driver_id`, `offered_at`, `arrival_notified_at`) plus a partial index. `deliveries` is not publicly readable — `anon` has no policy on it at all, and "deliveries — read" (0001) admits the assigned `driver_id`, the owning vendor, and admins — so the AGENTS.md §1 question ("who can now see a column they could not see before?") answers to those three, none of whom gains PII, money-routing data or a credential: `offered_driver_id` is an opaque staff uuid for a rider the vendor already sees named once they accept, and the other two are timestamps. **The RLS clause that was deliberately NOT added** is `or offered_driver_id = auth.uid()`, which would be the natural way to let a rider read their own offer: once the exclusivity window lapses and a *different* rider accepts, the row still carries the first rider's id while `driver_lat`/`driver_lng` now track the second, so that clause would hand rider A a live feed of rider B's position. The driver board reads this table service-role behind `requireRole("driver")` (AGENTS.md §5) and needs no widened policy; the migration header records the reasoning so it is not "simplified" back in. **`driver_id` still means what it meant.** An offer leaves an `unassigned` row with `driver_id` null, so the two screens that answer "who is carrying this order?" off that column — the customer's tracker (`order-tracking.ts`) and the admin live board (`admin-dispatch.ts`) — keep saying "nobody" until somebody accepts, and a customer is never shown a courier's name and phone number before that rider has agreed to come. **Fails closed twice.** `acceptDelivery` refuses an order inside another rider's window, and an offer row it cannot read is treated as somebody else's rather than as open. **No new endpoint and no new input.** Dispatch is triggered by the existing vendor kitchen transition and by the existing `POST /api/driver/location`, both already authenticated, role-checked and rate-limited; nothing here accepts a delivery id, a rider id or a radius from a caller. The 500 m arrival push is derived entirely from the rider's own already-validated fix and the order's own stored pin, and is latched on `arrival_notified_at` so a compromised or looping client cannot turn a location ping into a notification flood. **One pre-existing unbounded read fixed in passing:** the driver board selected every `assigned`/`picked_up`/`delivered` delivery ever written to decide which of a handful of ready orders were taken; it is now scoped to those orders' ids, same result. |
