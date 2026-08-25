# Deligro — Third Audit (functional correctness, live-order sync, settlement accuracy, UI/UX collisions)

**Date:** 2026-08-24
**Scope:** Four targeted, independent passes over the authenticated app — order lifecycle state machine and cross-role sync, settlement/payout arithmetic and vendor↔admin reconciliation, general feature correctness (checkout, coupons, refunds, notifications, payments), and UI collision analysis across all five portals (customer, vendor, admin, driver, manager). This is a follow-up to [AUDIT_REPORT.md](AUDIT_REPORT.md) and [AUDIT_REPORT_2.md](AUDIT_REPORT_2.md), which covered security/SEO/performance/realtime-polling/Hindi-UX and explicitly flagged "authenticated UI" and financial-calculation correctness as unchecked — this pass closes that gap.
**Method:** Static analysis (full read of the relevant modules, not just grep), `tsc --noEmit`, `eslint`. No browser was driven — UI collision findings are reasoned from the actual CSS/layout code, not screenshots; flagged as such where relevant.

---

## Executive summary

Read this part even if you read nothing else.

**The good news first.** This is a well-built codebase. Checkout, order placement, coupons, refunds, payments and notifications all re-price server-side, use real idempotency (unique constraints, not just application checks), and were not found to have a single broken handler, silent-catch bug, or half-wired feature across a deep pass. Settlement math has one true source of truth (`src/lib/settlements/math.ts`) shared identically by the vendor earnings screen and the admin settlement builder — the drift risk you'd expect in duplicated financial code was specifically checked for and is not present. `tsc` and `eslint` are clean.

**Two things are broken badly enough to cost real money, and both are about what happens *after* the happy path.**

1. **A cancelled order can be resurrected to "delivered" and paid out to the vendor.** The driver-side status update (`advanceDelivery`) never checks whether the order it's advancing is still valid — it writes `on_the_way` → `delivered` unconditionally. Cancellation only unwinds a driver assignment in one of four cancel paths (vendor-reject). If a vendor cancels a `ready` order that a driver has already accepted, the driver's board doesn't know, the driver completes the delivery normally, and the order flips back to `delivered` — landing in vendor settlement despite being cancelled and refunded to the customer.

2. **Refunds approved after a settlement is finalized are never clawed back.** There is no code path anywhere that revisits a paid or draft settlement when a later refund is approved. A vendor can be paid in full for an order, then the customer gets refunded days later, and nothing flags the gap, reduces the next payout, or warns anyone. `voidSettlement` explicitly refuses to reverse a paid settlement and says "record a correction instead" — but no correction mechanism exists.

Both are silent — no error, no red flag in any dashboard. They would only surface as a slow, hard-to-trace mismatch between "orders delivered" and "money in the bank," which is exactly the kind of bug that erodes trust in the numbers once someone notices it.

**Everything else is real but smaller** — a UI overlap in the admin desktop preview, three more state-machine gaps in the same family as #1, a stale-ETA/false-"running late" bug, and some UI polish items. None of them move money on their own.

---

## Scorecard for this pass

| Area | Verdict |
|---|---|
| **Feature correctness** (checkout/orders/coupons/refunds/notifications/payments) | Strong. One ETA/lateness bug found; everything else checked out clean. |
| **Order lifecycle state machine** | Weak. Enforced almost entirely in application code, inconsistently, across four independent write paths — one of which (`advanceDelivery`) enforces nothing at all. |
| **Live sync mechanism** | Confirmed (from prior audits) to be polling, not realtime — 3–10s intervals depending on role. Within each interval, propagation itself works correctly; the bugs below are state-machine bugs, not sync-latency bugs. |
| **Settlement arithmetic** | Correct and centralized — single formula, consistent rounding, correct IST period boundaries, DB-enforced idempotency against double-payment. |
| **Vendor↔admin settlement sync** | Correct while nothing changes after settlement. Breaks the moment a refund is approved post-settlement — no reconciliation exists. |
| **UI/UX collisions** | Mostly clean, deliberate, well-coordinated stacking (checked z-index/portal/sticky layering across all five portals). One real desktop-only collision found. |

---

## Findings

Sorted by severity.

---

### CRITICAL · Order sync — a vendor-cancelled order can be resurrected to "delivered" and paid out

**Where:** [driver-orders.ts:1032-1096](src/lib/data-access/driver-orders.ts#L1032) (`advanceDelivery`) · [rider-dispatch.ts:505-517](src/lib/dispatch/rider-dispatch.ts#L505) (`clearOffer`) · [vendor-orders.ts:522-524](src/lib/data-access/vendor-orders.ts#L522) · [admin-settlements.ts:594,666,931,1594](src/lib/data-access/admin-settlements.ts#L594) · [vendor-earnings.ts:434-445](src/lib/data-access/vendor-earnings.ts#L434)

**What it is.** `advanceDelivery` writes `orders.status = "on_the_way"` and then `"delivered"` unconditionally — it never re-checks the order's current status before either write, and doesn't even check the returned error from either update. The only place any cancel path unwinds a driver's `deliveries` row is `clearOffer`, which only deletes rows still `status = "unassigned"` — and it's called from exactly one place: the vendor-reject branch. The customer-cancel API route and the admin cancel action never touch `deliveries` at all.

**The concrete sequence:**
1. Vendor's kitchen board legitimately allows cancelling a `ready` order.
2. A driver has already accepted that order (`deliveries.status = "assigned"`) — this is a normal, expected overlap window.
3. Vendor cancels → `orders.status = "cancelled"`, refund queued, customer notified.
4. The driver's board never filters on `orders.status`, so it still shows the job as active. The driver, with no way to know it was cancelled, taps "picked up" then "delivered".
5. `advanceDelivery` overwrites `orders.status` back through `on_the_way` to `delivered` — un-cancelling a cancelled, refunded order.
6. Both `admin-settlements.ts` and `vendor-earnings.ts` select purely on `orders.status = "delivered"` for payout/revenue math, so this order is now counted as revenue and swept into the vendor's next settlement, despite the customer already having their money back.

**Fix.**
- Make both writes in `advanceDelivery` conditional, the same way `updateKitchenOrderStatus` already does it: `.eq("status", <expected prior status>)`, and check the returned row/error instead of assuming success.
- Every cancel path (customer route, admin `cancelOrderAsAdmin`) needs to also void/cancel any non-terminal `deliveries` row for that order — not just the `unassigned` case `clearOffer` currently handles.

---

### CRITICAL · Settlement — refunds approved after a settlement is finalized are never clawed back

**Where:** [refunds.ts:653](src/lib/data-access/refunds.ts#L653) (`decideRefund`) · [admin-settlements.ts:411](src/lib/data-access/admin-settlements.ts#L411) (`loadApprovedRefunds`) · [admin-settlements.ts:1373](src/lib/data-access/admin-settlements.ts#L1373) (`voidSettlement`)

**What it is.** A refund only reduces a settlement's numbers if it's already `approved` at the moment the settlement is *built*. Once written, the settlement's figures are frozen. `decideRefund` approves refunds via Razorpay and writes to `refunds`/`payments` — it never checks whether the order is already in a settlement, and there is no reconciliation job anywhere that revisits a settled order when a later refund lands.

**Concrete scenario.** Order O (₹500) is delivered, settled and paid Monday — vendor receives their payout. Wednesday, the customer requests a refund (allowed post-delivery), admin approves it, Razorpay returns the full ₹500. The platform is now out ₹500 to the customer **and** has already paid the vendor for that same order, with nothing anywhere flagging it. For a `paid` settlement, `voidSettlement` explicitly refuses to reverse it ("Voiding it would not un-send the money — record a correction instead") — but that correction mechanism doesn't exist. Even a still-`draft` settlement silently keeps the stale total; the admin refund-decision screen shows no indicator that the order is already sitting in a draft settlement.

**Fix.** On refund approval, look up whether the order is already in a `vendor_settlement_orders` row. If it is: for a draft settlement, surface a clear prompt to void and rebuild; for a paid settlement, write a negative adjustment line (or flag it for manual clawback against the vendor's next payout) rather than letting it disappear silently. Surface this on both the refund-decision UI and the settlement detail page.

---

### HIGH · Order sync — customer self-cancel has a TOCTOU race, no optimistic lock

**Where:** [cancel/route.ts:46-60](src/app/api/orders/[id]/cancel/route.ts#L46)

Status is read, checked against the cancellable set, then written with no `.eq("status", order.status)` guard — every other status-write path in the codebase has this guard, this one doesn't. If the vendor advances the order in the window between the read and the write, the cancel still lands and silently overwrites the newer status — and per the CRITICAL finding above, doesn't unwind any driver assignment either.

**Fix:** add the optimistic-lock condition to the update, matching `admin-orders.ts:112-117`, and treat a zero-row result as "too late to cancel."

---

### HIGH · Order sync — `acceptDelivery` never validates the order's own status server-side

**Where:** [driver-orders.ts:665-739](src/lib/data-access/driver-orders.ts#L665) · [driver/actions.ts:14-25](src/app/driver/actions.ts#L14)

The double-claim race (two drivers accepting the same delivery) is handled correctly via a unique-constraint catch. But nothing checks that the order is actually `ready` before creating the `deliveries` row — only the UI withholds the Accept button for non-ready orders, which isn't a server-side guarantee. Combined with the first CRITICAL finding, this is a second route to pushing an order through `on_the_way`/`delivered` while skipping earlier stages.

**Fix:** verify `orders.status = 'ready'` inside the insert path before creating the delivery assignment.

---

### HIGH · Order sync — driver-side status writes ignore Supabase errors

**Where:** [driver-orders.ts:1057-1066, 1080-1085](src/lib/data-access/driver-orders.ts#L1057)

Both completion branches discard the `{error}` from the `deliveries` and `orders` updates and unconditionally return `{ok: true}`. If the `deliveries` write succeeds but the `orders` write fails, the driver is told it worked, their own "today's trips" counter (keyed off `deliveries`) already counts it done — but the customer tracker, vendor board and admin board (all reading `orders.status`) stay stuck at the prior stage indefinitely.

**Fix:** check both `{error}` results; on failure of the `orders` write specifically, surface a retry instead of returning success.

---

### HIGH · UI/UX — admin desktop preview: shell-switcher button covers the upload-progress dock

**Where:** [admin-shell.tsx:82-91](src/components/admin/admin-shell.tsx#L82) · [food-upload-dock.tsx:70](src/components/admin/food-upload-dock.tsx#L70) · [desktop-shell-switcher.tsx:74](src/components/shared/desktop-shell-switcher.tsx#L74)

Every other overlay in the admin/vendor console that must render inside the phone-frame preview is routed through `PortalToShell`, specifically because the shell's `transform` changes what `position: fixed` resolves against. `FoodUploadDock` was never wired through that portal — it and `DesktopShellSwitcher` both render as plain siblings and both resolve `fixed` against the real browser viewport. On any screen ≥480px wide, with the console in "App preview" mode and a photo-upload batch active, `DesktopShellSwitcher` (`z-[100]`, bottom-right) sits directly on top of the dock's collapse/dismiss controls (`z-50`, same corner).

**Fix:** wrap `FoodUploadDock` in the same `PortalToShell` used everywhere else in the admin/vendor console.

---

### MEDIUM · Settlement — same refund-clawback gap applies to open draft settlements with no warning

**Where:** [admin-settlements.ts:411](src/lib/data-access/admin-settlements.ts#L411) · [admin/refunds/page.tsx](src/app/admin/refunds/page.tsx)

Before a settlement is even marked paid, a refund approved after the draft was built is silently absent from its totals — the only remedy (`voidSettlement`) exists, but nothing tells the admin they need it. The refund-decision screen shows no indicator that an order is already sitting in a draft settlement.

**Fix:** surface it inline at refund-approval time ("this order is in draft settlement #X — void and rebuild after approving").

---

### MEDIUM · Order sync — kitchen "busy" bump never reaches ETA/lateness calculations

**Where:** [order-tracking.ts:121,345-355,432-441](src/lib/data-access/order-tracking.ts#L121) · [admin-orders.ts:331,475-481,657,848-854](src/lib/data-access/admin-orders.ts#L331) · contrast with [restaurants.ts:184-206](src/lib/data-access/restaurants.ts#L184) · feature source: [vendor-restaurant.ts:138-194](src/lib/data-access/vendor-restaurant.ts#L138)

When a vendor taps "we're slammed, +15 min," the storefront correctly shows the bumped ETA band before ordering (via `kitchenPace()`). But the customer's own order-tracking screen and the admin live-orders board both read the *raw* `eta_min`/`eta_max` straight off the restaurant join, never applying the busy bump. Result: an order running exactly on the schedule the customer was actually promised gets a false "running late" badge, and the admin board flags it as needing operator attention over a kitchen that's on time.

**Fix:** fetch `busy_until`/`busy_extra_minutes` in both queries and run them through `kitchenPace()` before computing ETA/lateness, matching what `restaurants.ts` already does.

---

### MEDIUM · Order sync — admin's status-override skips the driver record entirely

**Where:** [admin/orders/actions.ts:78-136](src/app/admin/orders/actions.ts#L78) (`overrideOrderStatus`)

By design, this lets an operator jump an order straight to `on_the_way`/`delivered` ("the kitchen phoned to say it went out"). It's correctly guarded and fires the right customer notification — but it never creates or touches a `deliveries` row. The customer sees "your rider is on the way" with no rider card, and the order won't appear in any driver's trip history or dispatch reporting. Likely intentional, but worth confirming operators know the driver-side bookkeeping goes silently empty when they use it.

**Fix (optional):** note in the admin UI that this path doesn't create a delivery/driver record.

---

### MEDIUM · UI/UX — "order placed" toast briefly covers the sticky page header

**Where:** [tracking-view.tsx:226](src/components/orders/tracking-view.tsx#L226) vs [page-header.tsx:28](src/components/layout/page-header.tsx#L28)

The confirmation toast (`z-50`, fixed near the top) renders directly over the sticky header (`z-20`) that carries the back button and order code, for the few seconds right after placing an order.

**Fix:** confirm it auto-dismisses fast enough not to block a real tap, or offset it below the header height instead of a fixed top position.

---

### LOW · Order sync — orphaned dispatch offers not cleaned up on customer/admin cancel

Follows from the first CRITICAL finding's root cause: `clearOffer` is only called from the vendor-reject path. A customer cancelling an order with a standing (`unassigned`) driver offer leaves that row in place — harmless on its own since the joined order is already cancelled, but it becomes materially harmful the moment a driver has actually claimed rather than merely been offered it (see CRITICAL #1).

**Fix:** call the delivery-cancel cleanup from every cancel path, not just the vendor one.

---

### LOW · Settlement — two independent IST calendar implementations

**Where:** [cycle.ts](src/lib/settlements/cycle.ts) vs [ist-time.ts](src/lib/utils/ist-time.ts)

Both hand-compute IST day/week/month boundaries and currently agree, but a future fix to one (e.g. a month-boundary edge case) wouldn't automatically propagate to the other.

**Fix:** have one delegate to the other instead of maintaining two implementations of the same calendar math.

---

### LOW · Settlement — vendor's gross "revenue" figure includes in-flight (not-yet-delivered) orders

**Where:** [vendor-earnings.ts:84](src/lib/data-access/vendor-earnings.ts#L84) (`REVENUE_STATUSES`)

The top-line "revenue" dashboard counts `kitchen`/`ready`/`on_the_way` orders as revenue, while the correct, clearly-separated "Your payout (est.)" panel filters to `delivered` only. Intentional and labeled — flagged only because a vendor skimming just the top number could over-read in-flight orders as already-earned money.

---

### LOW · UI/UX — admin live-orders board requires horizontal scroll below 660px

**Where:** [live-board.tsx:27-28](src/components/admin/live-board.tsx#L27)

A deliberate design choice per the code's own comment (truncating a rider's name to one letter isn't a smaller version of the information) — flagged since this audience is majority low-end Android at 360–412px widths, where this table always needs a sideways swipe.

---

## Areas checked and confirmed solid

Reporting these explicitly, not just omitting them, per your "check if functions/features are working perfectly" ask:

- **Checkout & order placement** — price/fee/tax always re-derived server-side from live settings and `menu_items`, never trusted from the client; the phone-order (manager) channel reuses the exact same pricing function as the customer app, no parallel implementation.
- **Coupons/promotions** — pricing lives in one place (`preview_coupon`/`apply_coupon_to_order` SQL RPCs); vendor/admin promotion actions force ownership/funding fields server-side regardless of what the form sends.
- **Refunds** — idempotent via a real unique constraint, not just an application check; Razorpay settlement only recorded after a successful gateway call; decisions are `UPDATE ... WHERE status='pending'`, so a lost race is detected rather than silently overwritten.
- **Notifications** — every order-status transition has exactly one call site firing it; no missing or duplicated triggers found.
- **Payments** — `settlePayment` is idempotent and non-regressive (status never walks backward); webhook signature verified over raw bytes before parsing; the verify route cross-checks the Razorpay order actually belongs to the Deligro order being settled.
- **Settlement arithmetic itself** — single formula (`breakdownOrder`) used identically by admin settlement build, the vendor payout estimate, and reporting; consistent rounding (once, in whole rupees, at derivation); correct IST period boundaries with half-open ranges; double-payment blocked by a DB unique constraint, not just application logic.
- **Dispatch double-claim race** — correctly handled with both a DB unique-constraint catch and an application-level optimistic lock; no gap found here.
- **Vendor, driver, manager UI stacking** — sheets/dialogs/FABs correctly portaled, sticky bars correctly account for the elements around them, long text correctly truncated/clamped throughout (the driver board deliberately does *not* truncate addresses, by design, per an existing code comment about a prior bug).
- **`tsc --noEmit`** — 0 errors. **`eslint`** — 0 errors, 3 pre-existing `no-img-element` warnings on vendor image-preview components (cosmetic, already in prior audits' scope).

---

## What this pass did not check

- No live browser session was driven — UI collision findings are reasoned from layout/CSS code, not observed. The one HIGH UI finding (admin dock) is a logical read of two components both resolving `position: fixed` against the viewport in the same corner; worth a two-minute visual confirmation before fixing.
- Did not re-verify the already-documented realtime/polling gap from AUDIT_REPORT.md — assumed accurate (no Supabase Realtime channel exists anywhere; every "live" board is a timed poll, 3–10s depending on role). The bugs above are state-machine correctness bugs independent of that latency question — fixing polling→realtime would not fix any of them.
- Live RLS policy diffing against the running database, and screen-reader/contrast testing, remain unchecked (also called out in AUDIT_REPORT_2.md).

---

## Suggested order of work

| # | Fix | Why first |
|---|---|---|
| 1 | Guard `advanceDelivery`'s two writes with optimistic locks + unwind `deliveries` on every cancel path | Directly causes incorrect vendor payouts today |
| 2 | Add refund→settlement clawback/flagging | Same class of harm — money paid out that shouldn't have been |
| 3 | Add optimistic lock to customer self-cancel route | Closes the same family of race as #1 |
| 4 | Validate order status inside `acceptDelivery` | Closes the last unguarded write path in the lifecycle |
| 5 | Check errors on driver completion writes | Prevents boards silently going stale after a partial failure |
| 6 | Portal `FoodUploadDock` into the shell | Small, isolated, visible fix |
| 7 | Feed `busy_until`/`busy_extra_minutes` into ETA/lateness math | Removes false "running late" flags |
| 8 | Everything else in this report | Lower urgency, no money/state-machine risk |

---

## Audit log

| Date | Auditor | Scope | Critical | High | Medium | Low |
|---|---|---|---:|---:|---:|---:|
| 2026-08-24 | Claude | Order sync, settlement accuracy, feature correctness, UI collisions (authenticated app, 4 parallel passes) | 2 | 4 | 4 | 4 |
