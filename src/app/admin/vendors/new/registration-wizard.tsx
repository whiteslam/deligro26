"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Copy,
  Loader2,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Toggle, fieldCls, labelCls } from "@/components/ui/field";
import { Modal } from "@/components/ui/confirm-dialog";
import { MapPicker } from "@/components/location/map-picker";
import { isMapsConfigured } from "@/lib/maps/config";
import type {
  VendorDraftData,
  DraftMenuItem,
} from "@/lib/data-access/vendor-registration";
import {
  saveDraftAction,
  createVendorAccountAction,
  createCategoryInlineAction,
} from "../actions";

export const TC_VERSION = "2026-07-v1";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const STEPS = [
  "Basic info",
  "Business",
  "Location",
  "Payment",
  "Legal",
  "Menu",
  "Terms",
  "Review",
];

type WizardData = VendorDraftData & { confirmPassword?: string };

function validateStep(idx: number, d: WizardData): string | null {
  switch (idx) {
    case 0:
      if (!d.shopName?.trim()) return "Shop name is required.";
      if (!d.ownerName?.trim()) return "Owner name is required.";
      if (!d.mobile?.trim()) return "Mobile number is required.";
      if (!d.email?.trim() || !EMAIL.test(d.email))
        return "A valid email address is required.";
      if (d.password || d.confirmPassword) {
        if ((d.password ?? "").length < 8)
          return "Password must be at least 8 characters.";
        if (d.password !== d.confirmPassword) return "Passwords don't match.";
      }
      return null;
    case 1:
      if (!d.category?.trim()) return "Select a vendor category.";
      return null;
    case 2:
      if (!d.address?.trim()) return "Shop address is required.";
      return null;
    case 3: {
      const hasUpi = Boolean(d.upiId?.trim());
      const hasBank = Boolean(d.bankAccountNumber?.trim() && d.bankIfsc?.trim());
      if (!hasUpi && !hasBank)
        return "Add a UPI ID or bank account (number + IFSC).";
      return null;
    }
    case 5:
      for (const m of d.menuItems ?? []) {
        if (m.name?.trim() && (m.price == null || m.price < 0))
          return "Every named menu item needs a valid price.";
      }
      return null;
    case 6:
      if (!d.tcAccepted) return "Accept the terms & conditions to continue.";
      return null;
    default:
      return null;
  }
}

export function RegistrationWizard({
  initialData,
  initialStep,
  draftId: initialDraftId,
  categories,
}: {
  initialData: WizardData;
  initialStep: number;
  draftId?: string;
  categories: string[];
}) {
  const router = useRouter();
  const [data, setData] = useState<WizardData>(initialData);
  const [step, setStep] = useState(Math.min(initialStep, STEPS.length - 1));
  const [draftId, setDraftId] = useState<string | undefined>(initialDraftId);
  const [cats, setCats] = useState<string[]>(categories);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ vendorId: string; password: string } | null>(
    null
  );
  const [copied, setCopied] = useState(false);

  const update = (patch: Partial<WizardData>) =>
    setData((d) => ({ ...d, ...patch }));

  async function persist(targetStep: number) {
    setSaving(true);
    setSavedAt(false);
    // Strip secrets before they leave the browser; the server strips again.
    const { password: _pw, confirmPassword: _cpw, ...safe } = data;
    void _pw;
    void _cpw;
    const res = await saveDraftAction(draftId ?? null, safe, targetStep);
    setSaving(false);
    if (res.ok && res.id) {
      setSavedAt(true);
      if (!draftId) {
        setDraftId(res.id);
        router.replace(`/admin/vendors/new?draft=${res.id}`, { scroll: false });
      }
    }
    return res.ok;
  }

  async function goNext() {
    const problem = validateStep(step, data);
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    const target = Math.min(step + 1, STEPS.length - 1);
    await persist(target);
    setStep(target);
  }

  function goPrev() {
    setError(null);
    setStep((s) => Math.max(0, s - 1));
  }

  async function saveDraftNow() {
    setError(null);
    await persist(step);
  }

  async function submit() {
    for (let i = 0; i <= 6; i++) {
      const problem = validateStep(i, data);
      if (problem) {
        setStep(i);
        setError(problem);
        return;
      }
    }
    setError(null);
    setSubmitting(true);
    const { confirmPassword: _cpw, ...payload } = data;
    void _cpw;
    const res = await createVendorAccountAction(payload, draftId);
    setSubmitting(false);
    if (!res.ok || !res.vendorId || !res.password) {
      setError(res.error ?? "Couldn't create the vendor.");
      return;
    }
    setResult({ vendorId: res.vendorId, password: res.password });
  }

  async function addCategory(name: string) {
    const res = await createCategoryInlineAction(name);
    if (!res.ok || !res.name) {
      setError(res.error ?? "Couldn't add the category.");
      return;
    }
    setCats((c) => (c.includes(res.name!) ? c : [...c, res.name!]));
    update({ category: res.name });
  }

  const onReview = step === STEPS.length - 1;

  return (
    <div className="space-y-4">
      {/* Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold">
            Step {step + 1} of {STEPS.length} · {STEPS[step]}
          </p>
          <span className="text-[11px] text-muted">
            {saving ? "Saving…" : savedAt ? "Draft saved" : ""}
          </span>
        </div>
        <div className="flex gap-1">
          {STEPS.map((s, i) => (
            <span
              key={s}
              className={
                "h-1.5 flex-1 rounded-full " +
                (i <= step ? "bg-accent" : "bg-surface-2")
              }
            />
          ))}
        </div>
      </div>

      {error ? (
        <p className="rounded-xl border border-deal/30 bg-deal/10 px-3.5 py-3 text-sm font-medium text-deal">
          {error}
        </p>
      ) : null}

      {step === 0 ? <BasicStep data={data} update={update} /> : null}
      {step === 1 ? (
        <BusinessStep data={data} update={update} cats={cats} onAddCategory={addCategory} />
      ) : null}
      {step === 2 ? <LocationStep data={data} update={update} /> : null}
      {step === 3 ? <PaymentStep data={data} update={update} /> : null}
      {step === 4 ? <LegalStep data={data} update={update} /> : null}
      {step === 5 ? <MenuStep data={data} update={update} cats={cats} /> : null}
      {step === 6 ? <TermsStep data={data} update={update} /> : null}
      {step === 7 ? <ReviewStep data={data} goTo={setStep} /> : null}

      {/* Action footer */}
      <div className="sticky bottom-[84px] z-20 -mx-4 flex items-center gap-2 border-t border-line bg-bg/95 px-4 py-3 backdrop-blur">
        {step > 0 ? (
          <Button type="button" variant="secondary" size="sm" onClick={goPrev}>
            <ArrowLeft className="size-4" /> Back
          </Button>
        ) : (
          <Link href="/admin/vendors">
            <Button type="button" variant="secondary" size="sm">
              Cancel
            </Button>
          </Link>
        )}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={saveDraftNow}
          disabled={saving}
          title="Save draft"
        >
          <Save className="size-4" /> Draft
        </Button>
        <div className="flex-1" />
        {onReview ? (
          <Button type="button" size="sm" onClick={submit} disabled={submitting}>
            {submitting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Check className="size-4" />
            )}
            Create vendor
          </Button>
        ) : (
          <Button type="button" size="sm" onClick={goNext} disabled={saving}>
            Next <ArrowRight className="size-4" />
          </Button>
        )}
      </div>

      {/* Completion */}
      <Modal
        open={result !== null}
        onClose={() => result && router.push(`/admin/vendors/${result.vendorId}`)}
        title="Vendor created"
      >
        <p className="text-sm text-muted">
          The account is live with status <b className="text-ink">pending</b>.
          Share this one-time login password now — it won&apos;t be shown again.
        </p>
        <div className="mt-3 flex items-center gap-2 rounded-xl bg-surface-2 p-2.5">
          <code className="text-data flex-1 truncate px-1 text-[15px] font-semibold text-ink">
            {result?.password}
          </code>
          <button
            type="button"
            onClick={async () => {
              if (!result) return;
              try {
                await navigator.clipboard.writeText(result.password);
                setCopied(true);
              } catch {
                /* clipboard blocked */
              }
            }}
            className="press grid size-9 shrink-0 place-items-center rounded-lg bg-surface text-muted hover:text-ink"
            aria-label="Copy password"
          >
            {copied ? <Check className="size-4 text-green" /> : <Copy className="size-4" />}
          </button>
        </div>
        <div className="mt-4 flex justify-end">
          <Button
            size="sm"
            onClick={() => result && router.push(`/admin/vendors/${result.vendorId}`)}
          >
            Open vendor
          </Button>
        </div>
      </Modal>
    </div>
  );
}

// ---------- steps ----------

type StepProps = {
  data: WizardData;
  update: (patch: Partial<WizardData>) => void;
};

function Card({ children }: { children: React.ReactNode }) {
  return <div className="card space-y-4 p-4">{children}</div>;
}

function BasicStep({ data, update }: StepProps) {
  return (
    <Card>
      <Field label="Shop name" required>
        <input
          className={fieldCls}
          value={data.shopName ?? ""}
          onChange={(e) => update({ shopName: e.target.value })}
        />
      </Field>
      <Field label="Owner name" required>
        <input
          className={fieldCls}
          value={data.ownerName ?? ""}
          onChange={(e) => update({ ownerName: e.target.value })}
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Mobile" required>
          <input
            className={fieldCls}
            inputMode="tel"
            value={data.mobile ?? ""}
            onChange={(e) => update({ mobile: e.target.value })}
          />
        </Field>
        <Field label="Alt. mobile">
          <input
            className={fieldCls}
            inputMode="tel"
            value={data.altMobile ?? ""}
            onChange={(e) => update({ altMobile: e.target.value })}
          />
        </Field>
      </div>
      <Field label="Email" required>
        <input
          className={fieldCls}
          type="email"
          value={data.email ?? ""}
          onChange={(e) => update({ email: e.target.value })}
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Password" hint="Blank = auto-generate">
          <input
            className={fieldCls}
            type="password"
            value={data.password ?? ""}
            onChange={(e) => update({ password: e.target.value })}
          />
        </Field>
        <Field label="Confirm password">
          <input
            className={fieldCls}
            type="password"
            value={data.confirmPassword ?? ""}
            onChange={(e) => update({ confirmPassword: e.target.value })}
          />
        </Field>
      </div>
      <Field label="Logo image URL">
        <input
          className={fieldCls}
          placeholder="https://…"
          value={data.logoUrl ?? ""}
          onChange={(e) => update({ logoUrl: e.target.value })}
        />
      </Field>
      <p className="text-xs text-muted">
        The password isn&apos;t stored in the draft — re-enter it (or leave blank
        to auto-generate) before creating the vendor.
      </p>
    </Card>
  );
}

function BusinessStep({
  data,
  update,
  cats,
  onAddCategory,
}: StepProps & { cats: string[]; onAddCategory: (name: string) => void }) {
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");

  return (
    <Card>
      <Field label="Vendor category" required>
        <select
          className={fieldCls}
          value={data.category ?? ""}
          onChange={(e) => {
            if (e.target.value === "__add") {
              setAdding(true);
              return;
            }
            update({ category: e.target.value });
          }}
        >
          <option value="">Select a category…</option>
          {cats.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
          <option value="__add">+ Add new category…</option>
        </select>
      </Field>
      {adding ? (
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Field label="New category name">
              <input
                className={fieldCls}
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                autoFocus
              />
            </Field>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={() => {
              if (newName.trim()) {
                onAddCategory(newName.trim());
                setNewName("");
                setAdding(false);
              }
            }}
          >
            Add
          </Button>
        </div>
      ) : null}
      <Field label="Shop description">
        <textarea
          className={fieldCls}
          rows={2}
          value={data.description ?? ""}
          onChange={(e) => update({ description: e.target.value })}
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Opening time">
          <input
            className={fieldCls}
            type="time"
            value={data.openingTime ?? ""}
            onChange={(e) => update({ openingTime: e.target.value })}
          />
        </Field>
        <Field label="Closing time">
          <input
            className={fieldCls}
            type="time"
            value={data.closingTime ?? ""}
            onChange={(e) => update({ closingTime: e.target.value })}
          />
        </Field>
      </div>
      <div className="space-y-1.5">
        <span className={labelCls}>Weekly off</span>
        <div className="flex flex-wrap gap-1.5">
          {DAYS.map((d) => {
            const on = (data.weeklyOff ?? []).includes(d);
            return (
              <button
                key={d}
                type="button"
                onClick={() =>
                  update({
                    weeklyOff: on
                      ? (data.weeklyOff ?? []).filter((x) => x !== d)
                      : [...(data.weeklyOff ?? []), d],
                  })
                }
                className={
                  "press rounded-full px-3 py-1.5 text-sm font-semibold " +
                  (on ? "bg-accent text-white" : "bg-surface-2 text-muted")
                }
              >
                {d}
              </button>
            );
          })}
        </div>
      </div>
      <Field label="Minimum order (₹)">
        <input
          className={fieldCls}
          type="number"
          min={0}
          value={data.minOrder ?? 0}
          onChange={(e) => update({ minOrder: Number(e.target.value) })}
        />
      </Field>
      <Toggle
        label="Delivery available"
        checked={data.deliveryAvailable ?? true}
        onChange={(v) => update({ deliveryAvailable: v })}
      />
      <Toggle
        label="Self pickup available"
        checked={data.selfPickup ?? false}
        onChange={(v) => update({ selfPickup: v })}
      />
    </Card>
  );
}

function LocationStep({ data, update }: StepProps) {
  const initial =
    typeof data.lat === "number" && typeof data.lng === "number"
      ? { lat: data.lat, lng: data.lng }
      : null;
  return (
    <Card>
      {isMapsConfigured ? (
        <MapPicker
          initial={initial}
          onPick={(loc) =>
            update({ lat: loc.lat, lng: loc.lng, address: loc.address || data.address })
          }
        />
      ) : (
        <p className="rounded-xl bg-surface-2 px-3.5 py-3 text-xs text-muted">
          Map picker needs NEXT_PUBLIC_GOOGLE_MAPS_API_KEY. Enter the address
          manually below — the pin can be set later.
        </p>
      )}
      <Field label="Shop address" required>
        <textarea
          className={fieldCls}
          rows={2}
          value={data.address ?? ""}
          onChange={(e) => update({ address: e.target.value })}
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Landmark">
          <input
            className={fieldCls}
            value={data.landmark ?? ""}
            onChange={(e) => update({ landmark: e.target.value })}
          />
        </Field>
        <Field label="Pincode">
          <input
            className={fieldCls}
            inputMode="numeric"
            value={data.pincode ?? ""}
            onChange={(e) => update({ pincode: e.target.value })}
          />
        </Field>
      </div>
      {initial ? (
        <p className="text-xs text-muted">
          Pin: {data.lat?.toFixed(5)}, {data.lng?.toFixed(5)}
        </p>
      ) : null}
    </Card>
  );
}

function PaymentStep({ data, update }: StepProps) {
  return (
    <Card>
      <p className="text-xs text-muted">
        Add a UPI ID or bank account (at least one is required).
      </p>
      <Field label="UPI ID">
        <input
          className={fieldCls}
          placeholder="name@bank"
          value={data.upiId ?? ""}
          onChange={(e) => update({ upiId: e.target.value })}
        />
      </Field>
      <div className="border-t border-line pt-3">
        <span className={labelCls}>Bank account</span>
      </div>
      <Field label="Account holder name">
        <input
          className={fieldCls}
          value={data.bankAccountName ?? ""}
          onChange={(e) => update({ bankAccountName: e.target.value })}
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Bank name">
          <input
            className={fieldCls}
            value={data.bankName ?? ""}
            onChange={(e) => update({ bankName: e.target.value })}
          />
        </Field>
        <Field label="IFSC">
          <input
            className={fieldCls}
            value={data.bankIfsc ?? ""}
            onChange={(e) => update({ bankIfsc: e.target.value })}
          />
        </Field>
      </div>
      <Field label="Account number">
        <input
          className={fieldCls}
          inputMode="numeric"
          value={data.bankAccountNumber ?? ""}
          onChange={(e) => update({ bankAccountNumber: e.target.value })}
        />
      </Field>
      <Field label="Admin commission (%)">
        <input
          className={fieldCls}
          type="number"
          min={0}
          max={100}
          step={0.5}
          value={data.commissionPct ?? 0}
          onChange={(e) => update({ commissionPct: Number(e.target.value) })}
        />
      </Field>
    </Card>
  );
}

function LegalStep({ data, update }: StepProps) {
  return (
    <Card>
      <Field label="FSSAI number">
        <input
          className={fieldCls}
          value={data.fssaiNumber ?? ""}
          onChange={(e) => update({ fssaiNumber: e.target.value })}
        />
      </Field>
      <Field label="GST number">
        <input
          className={fieldCls}
          value={data.gstNumber ?? ""}
          onChange={(e) => update({ gstNumber: e.target.value })}
        />
      </Field>
      <Field label="PAN number">
        <input
          className={fieldCls}
          value={data.panNumber ?? ""}
          onChange={(e) => update({ panNumber: e.target.value })}
        />
      </Field>
      <p className="text-xs text-muted">
        Certificate &amp; document uploads arrive in Phase 3.
      </p>
    </Card>
  );
}

function MenuStep({
  data,
  update,
  cats,
}: StepProps & { cats: string[] }) {
  const items = data.menuItems ?? [];
  const setItem = (i: number, patch: Partial<DraftMenuItem>) =>
    update({ menuItems: items.map((m, idx) => (idx === i ? { ...m, ...patch } : m)) });
  const addItem = () =>
    update({
      menuItems: [
        ...items,
        { name: "", price: 0, veg: true, available: true, category: cats[0] ?? null },
      ],
    });
  const removeItem = (i: number) =>
    update({ menuItems: items.filter((_, idx) => idx !== i) });

  return (
    <Card>
      <p className="text-xs text-muted">
        Add a few dishes now, or skip and manage the full menu later.
      </p>
      {items.length === 0 ? (
        <p className="rounded-xl bg-surface-2 px-3.5 py-4 text-center text-sm text-muted">
          No items yet.
        </p>
      ) : (
        <div className="space-y-3">
          {items.map((m, i) => (
            <div key={i} className="rounded-xl border border-line p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-muted">Item {i + 1}</span>
                <button
                  type="button"
                  onClick={() => removeItem(i)}
                  className="press grid size-7 place-items-center rounded-full text-muted hover:text-deal"
                  aria-label="Remove item"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
              <div className="mt-2 space-y-2">
                <input
                  className={fieldCls}
                  placeholder="Item name"
                  value={m.name}
                  onChange={(e) => setItem(i, { name: e.target.value })}
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    className={fieldCls}
                    type="number"
                    min={0}
                    placeholder="Price ₹"
                    value={m.price}
                    onChange={(e) => setItem(i, { price: Number(e.target.value) })}
                  />
                  <select
                    className={fieldCls}
                    value={m.category ?? ""}
                    onChange={(e) => setItem(i, { category: e.target.value || null })}
                  >
                    <option value="">No category</option>
                    {cats.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setItem(i, { veg: !m.veg })}
                    className={
                      "press flex-1 rounded-xl px-3 py-2 text-sm font-semibold " +
                      (m.veg ? "bg-green-soft text-green" : "bg-surface-2 text-muted")
                    }
                  >
                    {m.veg ? "Veg" : "Non-veg"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setItem(i, { available: !m.available })}
                    className={
                      "press flex-1 rounded-xl px-3 py-2 text-sm font-semibold " +
                      (m.available ? "bg-accent-soft text-accent" : "bg-surface-2 text-muted")
                    }
                  >
                    {m.available ? "Available" : "Sold out"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <Button type="button" variant="secondary" size="sm" onClick={addItem}>
        <Plus className="size-4" /> Add item
      </Button>
    </Card>
  );
}

function TermsStep({ data, update }: StepProps) {
  return (
    <Card>
      <h2 className="text-heading text-[15px]">Vendor agreement</h2>
      <div className="max-h-48 overflow-y-auto rounded-xl bg-surface-2 p-3 text-xs leading-relaxed text-muted">
        <p>
          By onboarding to the platform, the vendor agrees to: honour listed
          prices and availability; prepare orders promptly and hygienically;
          accept the stated admin commission on each order; keep licences (FSSAI,
          GST as applicable) valid; and comply with platform policies on refunds,
          cancellations and customer conduct. The platform may suspend or remove a
          vendor for repeated violations. Payouts are settled to the payment
          details provided, net of commission and applicable charges.
        </p>
        <p className="mt-2">Agreement version {TC_VERSION}.</p>
      </div>
      <label className="flex items-start gap-2.5 rounded-xl bg-surface-2 px-3.5 py-3">
        <input
          type="checkbox"
          checked={data.tcAccepted ?? false}
          onChange={(e) =>
            update({
              tcAccepted: e.target.checked,
              tcVersion: e.target.checked ? TC_VERSION : undefined,
            })
          }
          className="mt-0.5 size-5 shrink-0 accent-accent"
        />
        <span className="text-sm font-medium text-ink">
          The vendor has read and accepted the terms &amp; conditions above.
        </span>
      </label>
    </Card>
  );
}

function ReviewStep({
  data,
  goTo,
}: {
  data: WizardData;
  goTo: (step: number) => void;
}) {
  const rows: { label: string; value: string; step: number }[] = [
    { label: "Shop", value: data.shopName ?? "—", step: 0 },
    { label: "Owner", value: data.ownerName ?? "—", step: 0 },
    { label: "Mobile", value: data.mobile ?? "—", step: 0 },
    { label: "Email", value: data.email ?? "—", step: 0 },
    { label: "Category", value: data.category ?? "—", step: 1 },
    { label: "Min order", value: `₹${data.minOrder ?? 0}`, step: 1 },
    { label: "Address", value: data.address ?? "—", step: 2 },
    {
      label: "Payment",
      value: data.upiId?.trim()
        ? `UPI ${data.upiId}`
        : data.bankAccountNumber
          ? `A/C ${data.bankAccountNumber}`
          : "—",
      step: 3,
    },
    { label: "Commission", value: `${data.commissionPct ?? 0}%`, step: 3 },
    { label: "FSSAI", value: data.fssaiNumber ?? "—", step: 4 },
    { label: "Menu items", value: String((data.menuItems ?? []).filter((m) => m.name?.trim()).length), step: 5 },
    { label: "Terms", value: data.tcAccepted ? "Accepted" : "Not accepted", step: 6 },
  ];
  return (
    <div className="space-y-2.5">
      <div className="rounded-2xl border border-line bg-surface p-3.5">
        <dl className="space-y-2">
          {rows.map((r) => (
            <div key={r.label} className="flex items-start justify-between gap-3">
              <dt className="text-sm text-muted">{r.label}</dt>
              <dd className="flex items-center gap-2 text-right text-sm font-medium text-ink">
                <span className="max-w-[180px] truncate">{r.value}</span>
                <button
                  type="button"
                  onClick={() => goTo(r.step)}
                  className="press text-xs font-semibold text-accent"
                >
                  Edit
                </button>
              </dd>
            </div>
          ))}
        </dl>
      </div>
      <p className="px-1 text-xs text-muted">
        Creating the vendor generates a login account (status pending) and shows a
        one-time password to hand off.
      </p>
    </div>
  );
}
