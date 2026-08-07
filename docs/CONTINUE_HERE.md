# Continue here — order lifecycle build

**Paused:** 2026-08-07 · **Resumed and slices E + F completed:** 2026-08-07 ·
**Branch:** `office` (merged to `master`)

All six slices are now written. What remains is **verification, not
construction**: none of A–F has been reviewed or run against a real database,
and migrations 0025/0026 still have to be applied. Read §3.3 and §7 before
trusting any of it.

---

## 1. What this branch contains

Two bodies of work, both starting from
[`docs/ORDER_FLOW_AUDIT`](#5-the-audit-this-came-from) findings.

### A. Razorpay integration — complete, ships switched OFF

Online payment is wired end to end and **disabled by default**: the customer
sees "Available soon" at checkout and COD is the only selectable method.

Two conditions are required before it appears — an admin toggle
(**Settings → Platform → Online payment**) *and* the Razorpay keys. Missing keys
must reduce what is offered, never be ignored; `onlinePaymentsEnabled()` is the
single gate and both the checkout page and `/api/orders` read it.

| Piece | Where |
|---|---|
| Migration | `supabase/migrations/0025_payments_razorpay.sql` |
| Gateway client | `src/lib/payments/razorpay.ts` |
| Signature crypto (pure, tested) | `src/lib/payments/signatures.ts` |
| The on/off gate | `src/lib/payments/availability.ts` |
| Order / verify / webhook routes | `src/app/api/payments/razorpay/*` |
| Browser checkout handoff | `src/lib/payments/razorpay-checkout.ts` |
| Tests (offline, no keys needed) | `npm run test:payments` — 15 cases |

Security notes are in `SECURITY.md` → **Payments**. The short version: a valid
signature proves *a* payment happened, not *which of our orders* it paid, so
`/verify` also checks the signed provider order belongs to the order being
settled. The webhook is the authority, is idempotent, and signs over the **raw
body** — never a re-serialised object.

### B. Order lifecycle repairs — 4 of 6 slices landed

Fixes for the audit findings, built as six file-disjoint slices.

---

## 2. Slice status

| Slice | Area | Status |
|---|---|---|
| **Spine** | migration 0026, `OrderStatus.READY`, notification contract | ✅ done |
| **A** | Vendor: accept gate, cash/prepaid badge, transition notifications | ✅ landed |
| **B** | Refunds: creation, Razorpay refund, enum fix, customer request | ✅ landed |
| **C** | Customer tracking: READY stage, honest stepper, real ETA, delay | ✅ landed |
| **D** | Rider: real GPS reporting, cash-vs-prepaid, pickup OTP | ✅ landed |
| **E** | Manager portal | ✅ landed (2026-08-07) |
| **F** | Admin order/customer detail | ✅ landed (2026-08-07) |

**None of A–F has been reviewed or manually tested.** They compile and the app
builds; that is all that is currently known about them. The adversarial review
pass for A–D was cancelled along with the original run, and E/F have not had one
either.

---

## 3. Pick up here

### 3.1 Slice F — admin order/customer detail (landed)

The two half-written data-access files turned out to be **complete and
consistent** — `getAdminOrderDetail()` and `getCustomerDetail()` were both fully
written, and nothing referenced a field that does not exist. Only the screens
were missing. They are now:

| File | What it is |
|---|---|
| `src/app/admin/orders/[id]/page.tsx` | Order detail: line items, charge breakdown, address, payment, rider, 0026 timeline |
| `src/app/admin/orders/actions.ts` | `overrideOrderStatus()` and `cancelOrderAsAdmin()`, both `requireRole("admin")` |
| `src/components/admin/order-intervention.tsx` | The client controls for the above |
| `src/app/admin/customers/[id]/page.tsx` | Customer detail: stats + order history, each row opening the order |

Both list screens now drill down. `/admin/orders` links only rows that carry an
`id`, because the `ADMIN_ORDERS` demo seed has none and a link to
`/admin/orders/undefined` would 404 on tap.

Three decisions worth knowing:

- **Cancel queues the refund before it cancels.** If the status write then
  fails, an open refund on a live order is recoverable by a human in
  `/admin/refunds`; a cancelled order with no refund attached is not. The error
  copy says so explicitly when it happens.
- **`cancelled` is not in the override list.** Cancelling has to queue a refund
  and tell the restaurant, so it is its own action. Routing it through the
  status dropdown would silently skip both.
- **Both writes are conditional on the status that was read** (`.eq("status",
  current.status)`), so an intervention decided against a stale screen cannot
  clobber a move the kitchen made a second earlier.

Neither action writes `accepted_at` / `ready_at` / `cancelled_at`. Admins are
*exempt* from `guard_order_update()`, so those writes would succeed — and would
produce a lifecycle the trigger did not author. Status only, every time.

### 3.2 Slice E — manager portal (landed)

`src/app/manager/page.tsx` is now the live cross-vendor board.

| File | What it is |
|---|---|
| `src/lib/data-access/manager-orders.ts` | `listActiveOrders()` (every in-flight order, all vendors) and `listRiders()` |
| `src/app/manager/actions.ts` | `advanceOrder()` and `assignRider()` |
| `src/components/manager/manager-order-board.tsx` | The board |

Built to exactly what 0023 grants:

- **Every read and write goes through the RLS client** (`createClient()`), never
  `createAdminClient()`. The service role would have worked and would have
  turned every limit 0023 imposes on purpose into no limit at all.
- **`advanceOrder` sends only `status`** — `guard_order_update()` rejects the
  whole update if a non-admin touches any other column — and is conditional on
  the stage the manager was looking at, so two managers on the same board cannot
  push one order two stages with one tap each.
- **Forward-only, one step at a time.** Moving an order backwards or skipping
  stages is an admin override and stays on the admin screen.
- **`assignRider` copies the double-claim handling from `acceptDelivery()`** —
  pre-check, then catch `23505` on the unique `order_id`. It seeds
  `driver_location_source: 'none'` and no coordinates, because inventing a
  position is the exact bug slice D removed.
- Riders are offered **least-loaded first**, with their active job count, so
  dispatch does not pile four jobs on one courier.

⚠️ **One deviation from the original plan.** The actions are gated
`requireRole(["manager", "admin"])`, not `requireRole("manager")`. The
`/manager` layout already admits both roles; gating the page and actions on
`manager` alone rendered a working board for an admin whose every button then
redirected to `/login?denied=1`. This grants an admin nothing new — `is_admin()`
already passes the RLS policies — it only stops the portal contradicting its own
layout.

### 3.3 Verify what landed

**A–F were never reviewed.** Verified at the E/F completion: `tsc` clean,
`next build` compiles (both new dynamic routes registered), `npm run lint` 0
errors (3 pre-existing `<img>` warnings in vendor components), and
`npm run test:payments` 15/15. Nothing has been run against a real database.

Before building on any of it:

```bash
npm run test:payments      # offline, no keys
npx tsc --noEmit
npx next build
npm run test:qa            # needs QA_PASSWORD + a reachable BASE_URL
```

Then read the diffs of A–F against §5. The highest-value manual checks:

- Place an order as a "stay both" owner (a `customer` who owns a restaurant) and
  **accept it from `/vendor`** — that path returned 403 before slice A and is the
  single most important fix on this branch.
- Cancel a **paid** order and confirm a refund row appears in `/admin/refunds`.
  Nothing had ever written to that table before slice B.
- Watch an order through `placed → kitchen → ready → on_the_way → delivered` and
  confirm the customer stepper reads true at every step.

New with E and F, and **all of it unrun**:

- **Sign in as a real manager** and load `/manager`. This is the one that most
  needs a live database: every query there goes through the manager's own JWT,
  so it is the first time 0023's policies have been exercised by anything. If
  the board shows the "could not load" notice, 0023 is not applied.
- **Advance an order from `/manager`** and confirm the database accepted it —
  this is the path `guard_order_update()` will reject outright if anything but
  `status` ever reaches the row.
- **Dispatch a rider from `/manager`** while that same order is visible in
  `/driver`, and confirm the loser gets "already taken" rather than a crash.
- **Open `/admin/orders/[id]` for an order with a rider** and confirm the
  timeline and the "position was estimated / reported" line match reality.
- **Cancel a paid order from `/admin/orders/[id]`** and confirm both that the
  refund appears in `/admin/refunds` and that the restaurant is notified.
- **Open an order on a database without 0025/0026 applied** and confirm the
  payment and timeline panels say the columns are missing rather than rendering
  a row of confident blanks.

---

## 4. Contracts the slices share

Anything you add should use these rather than reinventing them.

**Notifications** — `src/lib/notifications/order-events.ts`. All fire-and-forget,
never throw; call with `void fn(...)` where a push must not block a transition.

```
notifyOrderPlaced(orderId)                 notifyOrderCancelled(orderId, { byVendor?, refundQueued? })
notifyOrderAccepted(orderId, restaurant?)  notifyPaymentFailed(orderId)
notifyOrderReady(orderId)                  notifyRefundDecided(orderId, approved)
notifyOnTheWay(orderId)                    notifyVendorNewOrder(orderId, itemCount?)
notifyDelivered(orderId)                   notifyVendorOrderCancelled(orderId, { byAdmin? })
```

`byAdmin` was added by slice F — it only changes the title the kitchen sees
("cancelled by support" vs "cancelled by customer"), because a support
cancellation usually means something the restaurant is about to be asked about.
The default is unchanged, so the customer-path callers in slice B were untouched.

**Refunds** — `src/lib/data-access/refunds.ts`:

```ts
queueRefundForOrder(orderId, { origin, reason?, requestedBy? })
  : Promise<{ queued: boolean; amount: number }>
```

Idempotent (one open refund per order, enforced by a unique partial index) and
returns `queued: false` when the order was never paid.

**Schema probing** — any column from 0025/0026 may not exist in a given
environment. `src/lib/data-access/schema-probe.ts` is the pattern; see
`vendor-orders.ts` for a two-group example. Degrade honestly, never blank a
feature.

---

## 5. Migrations — apply in order, before running against a real database

| | |
|---|---|
| `0025_payments_razorpay.sql` | payment enums, `orders.payment_method` / `payment_status`, `payments` table |
| `0026_order_lifecycle.sql` | `orders.accepted_at` / `ready_at` / `cancelled_at`, refund provenance, `deliveries.driver_location_source` |

**0026 must run after 0025** — it re-declares `guard_order_update()` and extends
the locked-column list 0025 set.

Both are idempotent. Apply via the Supabase SQL editor or `supabase db push`.
Until they are applied the app degrades on purpose (schema-probe), but the admin
screens assume 0026.

Two things 0026 changes that are easy to trip over:

- `accepted_at` / `ready_at` / `cancelled_at` are stamped by a **trigger** on the
  status transition. The app must never write them — they are in the locked list.
- The trigger is named `zz_orders_stamp_lifecycle` so it sorts **after**
  `orders_guard_update`. Same-timing triggers fire alphabetically, and the guard
  has to compare the row as the caller submitted it. Renaming it breaks vendor
  status updates.

---

## 6. The audit this came from

Full findings are in the session that produced this branch. The ones **still
open** after this checkpoint:

| # | Finding | Status |
|---|---|---|
| 1 | "Stay both" vendors got 403 on accept/reject | fixed (slice A) — untested |
| 2 | Refunds never created; deny wrote `'rejected'` vs enum `'denied'` | fixed (slice B) — untested |
| 3 | Manager role has DB permissions and no UI | fixed (slice E) — untested |
| 4 | Tracking stepper ran one step ahead of reality | fixed (slice C) — untested |
| 5 | `ready` invisible; cancel button offered then refused | fixed (slice C) — untested |
| 6 | ETA a constant; no delay detection anywhere | fixed (slice C) — untested |
| 7 | `defaultPrepMinutes` a dead setting | fixed (slice C) — untested |
| 8 | Rider map position fabricated at accept | fixed (slice D) — untested |
| 9 | Only 2 of 6 transitions notified the customer | fixed (spine + A/B/D) |
| 10 | Vendor never alerted to a new order | fixed (spine) |
| 11 | Rider/vendor could not see COD vs prepaid | fixed (A + D) — untested |
| 12 | No admin order detail view | fixed (slice F) — untested |
| 13 | Admin cannot intervene on an order | fixed (slice F) — untested |
| 14 | `/admin/customers` has no drill-down | fixed (slice F) — untested |

Also still open, unrelated to the slices:

- **Coupons** validate but no discount is applied at order creation
  (audit M-7 in `docs/SECURITY_AUDIT.md`).
- **Vendor payouts / settlement** — collection exists, nothing settles out.
- **Rotate vendor passwords and Supabase keys** — outstanding action from the
  first security audit.
- `docs/DEPLOYMENT_AUDIT.md` credits migration **0022** for dropping
  `restaurants.temp_password`; it was **0024**. (Already corrected in
  `SECURITY.md`.)

---

## 7. Before this goes anywhere near production

- [x] Finish slices E and F. *(2026-08-07)*
- [ ] Review slices A–F — none has had a second pair of eyes.
- [ ] Run the manager portal against a database with 0023 applied. Slice E has
      never touched a live RLS policy.
- [ ] Apply 0025 + 0026 to the target database, in that order.
- [ ] **Do not enable online payment until the rider's cash-vs-prepaid badge is
      confirmed working.** With it on and that broken, riders will ask prepaid
      customers to pay a second time.
- [ ] Register the Razorpay webhook at `/api/payments/razorpay/webhook` and
      subscribe to `payment.captured`, `payment.failed`, `refund.processed`.
- [ ] Work `docs/DEPLOYMENT_AUDIT.md` and `docs/SECURITY_AUDIT.md`, and fill in
      their sign-off tables.
