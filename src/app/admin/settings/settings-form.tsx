"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/field";
import { cn } from "@/lib/utils/cn";
import { saveSettingsAction, type ActionResult } from "./actions";
import type { PlatformSettings } from "@/types";

/**
 * Platform configuration, as the console's settings grid: cards that group
 * related rules, each row a label, a hint and the control that changes it.
 *
 * Still one plain `<form>` with one submit. The switches are real checkboxes
 * (see `.c-switch` in globals.css) rather than client-state toggles, so nothing
 * here holds a copy of the settings that could drift from the server's, and the
 * whole screen works before hydration. The design's "persist on change" was not
 * adopted deliberately: these values bill every order on the platform, and a
 * fee that saves the instant a finger brushes it is not a setting, it is an
 * accident.
 */

const rowCls =
  "flex items-center justify-between gap-3 border-t border-[color:var(--c-divider)] py-[11px] first:border-t-0";

function Card({
  title,
  desc,
  children,
  className,
}: {
  title: string;
  desc?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "flex h-full flex-col rounded-xl border border-line bg-surface px-[17px] py-4",
        className
      )}
    >
      <h2 className="text-[14.5px] font-bold tracking-[-0.01em]">{title}</h2>
      {desc ? <p className="mt-0.5 text-xs text-muted">{desc}</p> : null}
      <div className="mt-2.5 flex-1">{children}</div>
    </section>
  );
}

/** Label + hint on the left, control on the right. */
function Row({
  label,
  hint,
  children,
  htmlFor,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  htmlFor?: string;
}) {
  return (
    <div className={rowCls}>
      <label htmlFor={htmlFor} className="min-w-0 flex-1 cursor-pointer">
        <span className="block text-[12.5px] font-semibold text-ink">{label}</span>
        {hint ? (
          <span className="mt-0.5 block text-[11.5px] leading-snug text-muted">
            {hint}
          </span>
        ) : null}
      </label>
      {children}
    </div>
  );
}

/**
 * A closing note under a card's rows. Carries the same top hairline the rows
 * use so it reads as part of the stack rather than as text floating under it,
 * which is what a bare <p> looked like next to the neighbouring cards.
 */
function Note({ children }: { children: React.ReactNode }) {
  return (
    <p className="border-t border-[color:var(--c-divider)] pt-[11px] text-[11.5px] leading-relaxed text-muted">
      {children}
    </p>
  );
}

/** A full-width field, for values a 96px box cannot hold. */
function Stacked({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block border-t border-[color:var(--c-divider)] py-[11px] first:border-t-0">
      <span className="block text-[12.5px] font-semibold text-ink">{label}</span>
      {hint ? (
        <span className="mt-0.5 block text-[11.5px] text-muted">{hint}</span>
      ) : null}
      <span className="mt-2 block">{children}</span>
    </label>
  );
}

function Num({
  name,
  defaultValue,
  min = 0,
  max,
  step,
  id,
}: {
  name: string;
  defaultValue: number;
  min?: number;
  max?: number;
  step?: number;
  id: string;
}) {
  return (
    <input
      id={id}
      type="number"
      name={name}
      defaultValue={defaultValue}
      min={min}
      max={max}
      step={step}
      // Every one of these fields is pre-filled, usually with 0. Clicking into
      // one drops the caret wherever the pointer landed — typically before the
      // existing digit — so typing "10" over a "0" produced "100". Selecting on
      // focus makes the first keystroke replace the value, which is what
      // "change the number" means on a single-value field like this.
      onFocus={(e) => e.currentTarget.select()}
      className="c-field text-data tabular-nums"
    />
  );
}

export function SettingsForm({
  settings,
  razorpayConfigured = false,
  vendorCommissionPct = 0,
  commissionCoverage = { inheriting: 0, overridden: 0, migrated: true },
}: {
  settings: PlatformSettings;
  /** Are the Razorpay keys present in this environment? */
  razorpayConfigured?: boolean;
  /**
   * Passed separately from `settings` on purpose: `PlatformSettings` is
   * client-safe and shared with the cart, and what the platform charges its
   * vendors is not storefront config. See `admin-commission.ts`.
   */
  vendorCommissionPct?: number;
  /** How many vendors track the platform rate vs hold their own. */
  commissionCoverage?: {
    inheriting: number;
    overridden: number;
    /** False until migration 0032 is applied. */
    migrated: boolean;
  };
}) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(
    saveSettingsAction,
    { ok: false }
  );

  return (
    <form action={formAction} className="space-y-4 pb-24 @3xl:pb-0">
      {state.error ? (
        <p className="rounded-xl border border-deal/30 bg-deal/10 px-3.5 py-3 text-sm font-medium text-deal">
          {state.error}
        </p>
      ) : null}
      {state.ok ? (
        <p className="rounded-xl border border-green/30 bg-green/10 px-3.5 py-3 text-sm font-medium text-green">
          Settings saved. The app now bills and behaves from these values.
        </p>
      ) : null}

      <div className="grid grid-cols-1 items-stretch gap-3.5 @3xl:grid-cols-2">
        <Card
          className="@3xl:order-1"
          title="Vendor commission"
          desc="What the platform keeps from each vendor's food subtotal. Settlements are generated from it."
        >
          <Row
            label="Commission"
            hint="Percent of the food subtotal."
            htmlFor="vendorCommissionPct"
          >
            <Num
              id="vendorCommissionPct"
              name="vendorCommissionPct"
              defaultValue={vendorCommissionPct}
              max={100}
              step={0.5}
            />
          </Row>
          <Note>
            {!commissionCoverage.migrated ? (
              <>
                Not stored yet — apply migration{" "}
                <code className="rounded bg-surface-2 px-1">
                  0032_platform_commission.sql
                </code>{" "}
                to save a platform rate. Until then each vendor keeps its own
                commission.
              </>
            ) : commissionCoverage.overridden > 0 ? (
              <>
                Applies to {commissionCoverage.inheriting} of{" "}
                {commissionCoverage.inheriting + commissionCoverage.overridden}{" "}
                vendors — the other {commissionCoverage.overridden} have a
                negotiated rate and won&apos;t change. Settlements already
                generated keep the rate they were created with.
              </>
            ) : (
              <>
                Applies to all {commissionCoverage.inheriting} vendors.
                Settlements already generated keep the rate they were created
                with. To exempt one vendor, set a commission on their own page.
              </>
            )}
          </Note>
        </Card>

        <Card
          className="@3xl:order-2"
          title="Fees and tax"
          desc="Authoritative — every order is billed from these, free delivery and minimums included."
        >
          <Row label="Delivery fee" hint="In rupees, per order." htmlFor="deliveryFee">
            <Num id="deliveryFee" name="deliveryFee" defaultValue={settings.deliveryFee} />
          </Row>
          <Row label="Tax" hint="Percent, applied to the item subtotal only." htmlFor="taxRatePct">
            <Num
              id="taxRatePct"
              name="taxRatePct"
              defaultValue={+(settings.taxRate * 100).toFixed(2)}
              max={100}
              step={0.5}
            />
          </Row>
          <Row
            label="Free delivery over"
            hint="0 means delivery is never free."
            htmlFor="freeDeliveryThreshold"
          >
            <Num
              id="freeDeliveryThreshold"
              name="freeDeliveryThreshold"
              defaultValue={settings.freeDeliveryThreshold}
            />
          </Row>
          <Row label="Minimum order" hint="0 means no minimum." htmlFor="minOrder">
            <Num id="minOrder" name="minOrder" defaultValue={settings.minOrder} />
          </Row>
        </Card>

        <Card
          className="@3xl:order-3"
          title="Availability"
          desc="Turn the whole platform — or individual verticals — on and off."
        >
          <Row
            label="Accepting orders"
            hint="Master switch. When off, customers can browse but not check out."
            htmlFor="acceptingOrders"
          >
            <Switch
              id="acceptingOrders"
              name="acceptingOrders"
              defaultChecked={settings.acceptingOrders}
            />
          </Row>
          <Row label="Grocery" hint="Show the grocery vertical." htmlFor="featureGrocery">
            <Switch
              id="featureGrocery"
              name="featureGrocery"
              defaultChecked={settings.featureGrocery}
            />
          </Row>
          <Row label="Pharmacy" hint="Show the pharmacy vertical." htmlFor="featurePharmacy">
            <Switch
              id="featurePharmacy"
              name="featurePharmacy"
              defaultChecked={settings.featurePharmacy}
            />
          </Row>
          <Row label="Pick & Drop" hint="Show the courier vertical." htmlFor="featurePickDrop">
            <Switch
              id="featurePickDrop"
              name="featurePickDrop"
              defaultChecked={settings.featurePickDrop}
            />
          </Row>
          <Stacked
            label="Maintenance message"
            hint="Shown to customers when set. Leave blank for none."
          >
            <input
              name="maintenanceMessage"
              defaultValue={settings.maintenanceMessage}
              className="c-field c-field-wide"
              placeholder="We're briefly down for maintenance — back soon."
            />
          </Stacked>
        </Card>

        <Card
          className="@3xl:order-5"
          title="Payments"
          desc="Cash on delivery is always available. Online payment is off until you turn it on here."
        >
          <Row
            label="Online payment (Razorpay)"
            hint={
              razorpayConfigured
                ? "UPI, cards, netbanking and wallets at checkout."
                : "Razorpay keys are not set in this environment — customers keep seeing “Available soon” until they are, whether or not this is on."
            }
            htmlFor="featureOnlinePayment"
          >
            <Switch
              id="featureOnlinePayment"
              name="featureOnlinePayment"
              defaultChecked={settings.featureOnlinePayment}
            />
          </Row>
          {!razorpayConfigured ? (
            <p className="mt-2 rounded-lg border border-line bg-surface-2 px-3 py-2.5 text-[11.5px] leading-relaxed text-muted">
              Set <code className="rounded bg-surface px-1">RAZORPAY_KEY_ID</code>,{" "}
              <code className="rounded bg-surface px-1">RAZORPAY_KEY_SECRET</code>{" "}
              and{" "}
              <code className="rounded bg-surface px-1">
                RAZORPAY_WEBHOOK_SECRET
              </code>{" "}
              (plus{" "}
              <code className="rounded bg-surface px-1">
                NEXT_PUBLIC_RAZORPAY_KEY_ID
              </code>{" "}
              for the browser checkout), then point a Razorpay webhook at{" "}
              <code className="rounded bg-surface px-1">
                /api/payments/razorpay/webhook
              </code>
              . Migration{" "}
              <code className="rounded bg-surface px-1">
                0025_payments_razorpay.sql
              </code>{" "}
              must be applied too.
            </p>
          ) : null}
        </Card>

        <Card
          className="@3xl:order-6"
          title="Dispatch and rider payout"
          desc="Operational defaults and the formula riders are paid by."
        >
          <Row label="Default prep time" hint="Minutes, when a shop has not set its own." htmlFor="defaultPrepMinutes">
            <Num
              id="defaultPrepMinutes"
              name="defaultPrepMinutes"
              defaultValue={settings.defaultPrepMinutes}
            />
          </Row>
          <Row label="Delivery radius" hint="Kilometres from the shop." htmlFor="deliveryRadiusKm">
            <Num
              id="deliveryRadiusKm"
              name="deliveryRadiusKm"
              defaultValue={settings.deliveryRadiusKm}
              step={0.5}
            />
          </Row>
          <Row
            label="Rider commission"
            hint="Percent of the food subtotal paid to the rider."
            htmlFor="riderCommissionPct"
          >
            <Num
              id="riderCommissionPct"
              name="riderCommissionPct"
              defaultValue={+(settings.riderCommission * 100).toFixed(2)}
              max={100}
              step={0.5}
            />
          </Row>
          <Row label="Rider minimum payout" hint="In rupees, per delivery." htmlFor="riderMinPayout">
            <Num
              id="riderMinPayout"
              name="riderMinPayout"
              defaultValue={settings.riderMinPayout}
            />
          </Row>
        </Card>

        <Card
          className="@3xl:order-4"
          title="Reviews"
          desc="How long a customer has to review an order, and to change their mind afterwards. Both are enforced by the database, not just the app."
        >
          <Row
            label="Review window"
            hint="Days after delivery that an order can still be reviewed."
            htmlFor="reviewWindowDays"
          >
            <Num
              id="reviewWindowDays"
              name="reviewWindowDays"
              defaultValue={settings.reviewWindowDays}
              min={1}
              max={365}
            />
          </Row>
          <Row
            label="Edit window"
            hint="Hours after posting that a customer can edit or withdraw their review. 0 locks it immediately."
            htmlFor="reviewEditWindowHours"
          >
            <Num
              id="reviewEditWindowHours"
              name="reviewEditWindowHours"
              defaultValue={settings.reviewEditWindowHours}
              min={0}
              max={720}
            />
          </Row>
          <Note>
            Changing these takes effect immediately, for reviews already posted as
            well as new ones — shortening the edit window can lock a review a
            customer was part-way through changing.
          </Note>
        </Card>

        <Card
          className="@3xl:order-4"
          title="Support and brand"
          desc="Shown to customers on the Help and Profile screens."
        >
          <Stacked label="Business name">
            <input
              name="businessName"
              defaultValue={settings.businessName}
              className="c-field c-field-wide"
            />
          </Stacked>
          <Stacked label="Support phone">
            <input
              name="supportPhone"
              defaultValue={settings.supportPhone}
              className="c-field c-field-wide"
              placeholder="+91 98765 43210"
            />
          </Stacked>
          <Stacked label="Support WhatsApp">
            <input
              name="supportWhatsapp"
              defaultValue={settings.supportWhatsapp}
              className="c-field c-field-wide"
              placeholder="+91 98765 43210"
            />
          </Stacked>
          <Stacked label="Support email">
            <input
              type="email"
              name="supportEmail"
              defaultValue={settings.supportEmail}
              className="c-field c-field-wide"
              placeholder="help@deligro.in"
            />
          </Stacked>
          <Stacked label="Business address">
            <textarea
              name="businessAddress"
              defaultValue={settings.businessAddress}
              rows={2}
              className="c-field c-field-wide resize-y"
            />
          </Stacked>
        </Card>
      </div>

      <div className="action-dock flex items-center gap-3 border-t border-line bg-bg/95 px-4 py-3 backdrop-blur @3xl:mt-1 @3xl:justify-end">
        <Button
          type="submit"
          disabled={pending}
          className="@3xl:hidden"
        >
          {pending ? "Saving…" : "Save settings"}
        </Button>
        <button
          type="submit"
          disabled={pending}
          className="c-btn c-btn-dark press hidden disabled:opacity-50 @3xl:inline-flex"
        >
          {pending ? "Saving…" : "Save settings"}
        </button>
        <p className="text-xs text-muted">
          Nothing is saved until you press this.
        </p>
      </div>
    </form>
  );
}
