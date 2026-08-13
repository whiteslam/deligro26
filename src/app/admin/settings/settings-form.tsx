"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/field";
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
}: {
  title: string;
  desc?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-line bg-surface px-[17px] py-4">
      <h2 className="text-[14.5px] font-bold tracking-[-0.01em]">{title}</h2>
      {desc ? <p className="mt-0.5 text-xs text-muted">{desc}</p> : null}
      <div className="mt-2.5">{children}</div>
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
      className="c-field text-data tabular-nums"
    />
  );
}

export function SettingsForm({
  settings,
  razorpayConfigured = false,
}: {
  settings: PlatformSettings;
  /** Are the Razorpay keys present in this environment? */
  razorpayConfigured?: boolean;
}) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(
    saveSettingsAction,
    { ok: false }
  );

  return (
    <form action={formAction} className="space-y-4 pb-24">
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

      <div className="grid grid-cols-[repeat(auto-fill,minmax(340px,1fr))] items-start gap-3.5">
        <Card
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

      <div className="action-dock flex items-center gap-3 border-t border-line bg-bg/95 px-4 py-3 backdrop-blur">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save settings"}
        </Button>
        <p className="text-xs text-muted">
          Nothing is saved until you press this.
        </p>
      </div>
    </form>
  );
}
