"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { saveSettingsAction, type ActionResult } from "./actions";
import type { PlatformSettings } from "@/types";

const field =
  "w-full rounded-xl bg-surface-2 px-3.5 py-3 text-[15px] outline-none focus:ring-2 focus:ring-accent/30";
const labelCls = "text-xs font-semibold text-muted";

function Labeled({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className={labelCls}>{label}</span>
      {children}
      {hint ? <span className="block text-[11px] text-muted">{hint}</span> : null}
    </label>
  );
}

function Section({
  title,
  desc,
  children,
}: {
  title: string;
  desc?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card space-y-4 p-5">
      <div>
        <h2 className="text-heading text-[15px]">{title}</h2>
        {desc ? <p className="mt-0.5 text-xs text-muted">{desc}</p> : null}
      </div>
      {children}
    </section>
  );
}

function Toggle({
  name,
  label,
  desc,
  defaultChecked,
}: {
  name: string;
  label: string;
  desc?: string;
  defaultChecked: boolean;
}) {
  return (
    <label className="flex items-start gap-3 rounded-xl bg-surface-2 px-3.5 py-3">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="mt-0.5 size-4 shrink-0 accent-accent"
      />
      <span className="min-w-0">
        <span className="block text-sm font-semibold">{label}</span>
        {desc ? <span className="block text-xs text-muted">{desc}</span> : null}
      </span>
    </label>
  );
}

export function SettingsForm({ settings }: { settings: PlatformSettings }) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(
    saveSettingsAction,
    { ok: false }
  );

  return (
    <form action={formAction} className="space-y-6">
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

      <Section
        title="Fees & tax"
        desc="These are authoritative — every order is billed from them, free-delivery and minimums included."
      >
        <div className="grid grid-cols-2 gap-3">
          <Labeled label="Delivery fee (₹)">
            <input
              type="number"
              name="deliveryFee"
              defaultValue={settings.deliveryFee}
              min={0}
              className={field}
            />
          </Labeled>
          <Labeled label="Tax (%)" hint="Applied to the item subtotal only.">
            <input
              type="number"
              name="taxRatePct"
              defaultValue={+(settings.taxRate * 100).toFixed(2)}
              min={0}
              max={100}
              step={0.5}
              className={field}
            />
          </Labeled>
          <Labeled
            label="Free delivery over (₹)"
            hint="0 = delivery is never free."
          >
            <input
              type="number"
              name="freeDeliveryThreshold"
              defaultValue={settings.freeDeliveryThreshold}
              min={0}
              className={field}
            />
          </Labeled>
          <Labeled label="Minimum order (₹)" hint="0 = no minimum.">
            <input
              type="number"
              name="minOrder"
              defaultValue={settings.minOrder}
              min={0}
              className={field}
            />
          </Labeled>
        </div>
      </Section>

      <Section
        title="Support & brand"
        desc="Shown to customers on the Help and Profile screens."
      >
        <Labeled label="Business name">
          <input
            name="businessName"
            defaultValue={settings.businessName}
            className={field}
          />
        </Labeled>
        <div className="grid grid-cols-2 gap-3">
          <Labeled label="Support phone">
            <input
              name="supportPhone"
              defaultValue={settings.supportPhone}
              className={field}
              placeholder="+91 98765 43210"
            />
          </Labeled>
          <Labeled label="Support WhatsApp">
            <input
              name="supportWhatsapp"
              defaultValue={settings.supportWhatsapp}
              className={field}
              placeholder="+91 98765 43210"
            />
          </Labeled>
        </div>
        <Labeled label="Support email">
          <input
            type="email"
            name="supportEmail"
            defaultValue={settings.supportEmail}
            className={field}
            placeholder="help@deligro.in"
          />
        </Labeled>
        <Labeled label="Business address">
          <textarea
            name="businessAddress"
            defaultValue={settings.businessAddress}
            rows={2}
            className={field}
          />
        </Labeled>
      </Section>

      <Section
        title="Availability"
        desc="Turn the whole platform — or individual verticals — on and off."
      >
        <Toggle
          name="acceptingOrders"
          label="Accepting orders"
          desc="Master switch. When off, customers can browse but not check out."
          defaultChecked={settings.acceptingOrders}
        />
        <Labeled
          label="Maintenance message"
          hint="Shown to customers when set. Leave blank for none."
        >
          <input
            name="maintenanceMessage"
            defaultValue={settings.maintenanceMessage}
            className={field}
            placeholder="We're briefly down for maintenance — back soon."
          />
        </Labeled>
        <div className="grid gap-2 sm:grid-cols-3">
          <Toggle
            name="featureGrocery"
            label="Grocery"
            defaultChecked={settings.featureGrocery}
          />
          <Toggle
            name="featurePharmacy"
            label="Pharmacy"
            defaultChecked={settings.featurePharmacy}
          />
          <Toggle
            name="featurePickDrop"
            label="Pick & Drop"
            defaultChecked={settings.featurePickDrop}
          />
        </div>
      </Section>

      <Section
        title="Ops defaults"
        desc="Operational defaults and the rider payout formula."
      >
        <div className="grid grid-cols-2 gap-3">
          <Labeled label="Default prep time (min)">
            <input
              type="number"
              name="defaultPrepMinutes"
              defaultValue={settings.defaultPrepMinutes}
              min={0}
              className={field}
            />
          </Labeled>
          <Labeled label="Delivery radius (km)">
            <input
              type="number"
              name="deliveryRadiusKm"
              defaultValue={settings.deliveryRadiusKm}
              min={0}
              step={0.5}
              className={field}
            />
          </Labeled>
          <Labeled
            label="Rider commission (%)"
            hint="Share of the food subtotal paid to the rider."
          >
            <input
              type="number"
              name="riderCommissionPct"
              defaultValue={+(settings.riderCommission * 100).toFixed(2)}
              min={0}
              max={100}
              step={0.5}
              className={field}
            />
          </Labeled>
          <Labeled label="Rider minimum payout (₹)">
            <input
              type="number"
              name="riderMinPayout"
              defaultValue={settings.riderMinPayout}
              min={0}
              className={field}
            />
          </Labeled>
        </div>
      </Section>

      <div className="sticky bottom-0 flex items-center gap-3 bg-bg/80 py-3 backdrop-blur">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save settings"}
        </Button>
      </div>
    </form>
  );
}
