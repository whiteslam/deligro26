# Continue here — order lifecycle build (paused mid-flight)

**Paused:** 2026-08-07 · **Branch:** `office`

This branch is a **deliberate mid-build checkpoint**, pushed so the work can be
picked up on another machine. It compiles, builds and passes the offline test
suite — but **two of eight work areas are unfinished**, and one of them was
stopped part-way through. Read §3 before writing any code.

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
| **E** | **Manager portal** | ❌ **not started** |
| **F** | **Admin order/customer detail** | ⚠️ **partial — stopped mid-write** |

**None of A–D has been reviewed or manually tested.** They compile and the app
builds; that is all that is currently known about them. Their adversarial review
pass was cancelled along with the run.

---

## 3. Pick up here

### 3.1 Slice F is half-done — check this first

`src/lib/data-access/admin-orders.ts` and `admin-customers.ts` **were modified**,
but the screens that consume them were never written. Diff those two files before
trusting them; they may reference fields nothing renders yet.

Still missing:

- `src/app/admin/orders/[id]/page.tsx` — order detail. Today `/admin/orders` is a
  flat list with no drill-down at all: when a customer calls to complain the
  operator cannot see what they ordered. Needs line items, the charge breakdown
  (subtotal / delivery_fee / tax_amount / tip / total), address, payment method
  and status, assigned rider, and the 0026 lifecycle timestamps as a timeline.
- `src/app/admin/orders/actions.ts` — admin intervention. `requireRole("admin")`
  gated actions to cancel an order and override its status. RLS permits it
  (`is_admin()`), and `guard_order_update()` exempts admins. **Cancelling a paid
  order must call `queueRefundForOrder(orderId, { origin: "admin", requestedBy })`**
  — that helper exists in `src/lib/data-access/refunds.ts` and slices A and B
  already use it.
- `src/app/admin/customers/[id]/page.tsx` — customer detail. The list shows an
  order *count* and no way to open one.

I hand-fixed one thing slice F never reached: the `STATUS` record in
`src/app/admin/orders/page.tsx` was missing the new `READY` key, which is a
`Record` — so `STATUS[o.status].cls` **threw and took the whole orders screen
down** for any order in that state. That is the only edit not made by the
original slice agents.

### 3.2 Slice E — manager portal, nothing written

`src/app/manager/page.tsx` is still three static cards saying "coming next".

Migration `0023_manager_rls.sql` already grants a manager: read all orders,
UPDATE order status, read profiles and order_items, and **full management of
`deliveries`**. Admins can already create manager logins from
**Admin → Settings → Team**. So the role is fully provisioned and can do nothing.

Build to exactly what 0023 grants and no further — a manager is deliberately
scoped **out** of finance, platform config and vendor management. Where RLS
already allows the manager's own JWT to do the work, use the normal RLS client;
do **not** reach for `createAdminClient()` to route around a limit 0023 imposed
on purpose.

Three things it needs:

1. A live cross-vendor order board (every active order, all restaurants).
2. Status advance — write a server action in `src/app/manager/actions.ts` gated
   with `requireRole("manager")`. **Do not** reuse `/api/orders/[id]/status`;
   that route is restaurant-only by design.
   ⚠️ `guard_order_update()` restricts a non-admin to changing **only `status`**
   on an order. Write anything else on that row and the database rejects the
   whole update.
3. Rider dispatch — assign a ready order to a specific rider. Copy the
   double-claim race handling from `acceptDelivery()` in
   `src/lib/data-access/driver-orders.ts` (unique `order_id`, catch `23505`).

Fire the matching notification from the contract in §4 when a manager advances
an order.

### 3.3 Verify what landed

A–D were never reviewed. Before building on them:

```bash
npm run test:payments      # offline, no keys
npx tsc --noEmit
npx next build
npm run test:qa            # needs QA_PASSWORD + a reachable BASE_URL
```

Then read the diffs of A–D against §5. The highest-value manual checks:

- Place an order as a "stay both" owner (a `customer` who owns a restaurant) and
  **accept it from `/vendor`** — that path returned 403 before slice A and is the
  single most important fix on this branch.
- Cancel a **paid** order and confirm a refund row appears in `/admin/refunds`.
  Nothing had ever written to that table before slice B.
- Watch an order through `placed → kitchen → ready → on_the_way → delivered` and
  confirm the customer stepper reads true at every step.

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
notifyDelivered(orderId)                   notifyVendorOrderCancelled(orderId)
```

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
| 3 | Manager role has DB permissions and no UI | **open — slice E** |
| 4 | Tracking stepper ran one step ahead of reality | fixed (slice C) — untested |
| 5 | `ready` invisible; cancel button offered then refused | fixed (slice C) — untested |
| 6 | ETA a constant; no delay detection anywhere | fixed (slice C) — untested |
| 7 | `defaultPrepMinutes` a dead setting | fixed (slice C) — untested |
| 8 | Rider map position fabricated at accept | fixed (slice D) — untested |
| 9 | Only 2 of 6 transitions notified the customer | fixed (spine + A/B/D) |
| 10 | Vendor never alerted to a new order | fixed (spine) |
| 11 | Rider/vendor could not see COD vs prepaid | fixed (A + D) — untested |
| 12 | No admin order detail view | **open — slice F** |
| 13 | Admin cannot intervene on an order | **open — slice F** |
| 14 | `/admin/customers` has no drill-down | **open — slice F** |

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

- [ ] Finish slices E and F.
- [ ] Review slices A–D — none has had a second pair of eyes.
- [ ] Apply 0025 + 0026 to the target database, in that order.
- [ ] **Do not enable online payment until the rider's cash-vs-prepaid badge is
      confirmed working.** With it on and that broken, riders will ask prepaid
      customers to pay a second time.
- [ ] Register the Razorpay webhook at `/api/payments/razorpay/webhook` and
      subscribe to `payment.captured`, `payment.failed`, `refund.processed`.
- [ ] Work `docs/DEPLOYMENT_AUDIT.md` and `docs/SECURITY_AUDIT.md`, and fill in
      their sign-off tables.
