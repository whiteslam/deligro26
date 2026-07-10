"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Home,
  Briefcase,
  Check,
  Bike,
  PersonStanding,
  CalendarClock,
  Wallet,
  ChevronRight,
  Loader2,
  ShoppingBag,
  Tag,
  Plus,
  MapPin,
  Info,
} from "lucide-react";
import { useCart } from "@/stores/cart-store";
import { ADDRESSES, ACTIVE_ORDER } from "@/lib/data";
import type { Address } from "@/types";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { MapPicker } from "@/components/location/map-picker";
import { Button } from "@/components/ui/button";
import { VegMark } from "@/components/shared/veg-mark";
import { formatINR } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

type Fulfilment = "delivery" | "pickup" | "schedule";
type CheckoutStatus = "ready" | "processing" | "placed";

// Tip presets — static for now; wired to payment later.
const TIPS = [0, 20, 30, 50];

export function CheckoutView() {
  const router = useRouter();
  const lines = useCart((s) => s.lines);
  const restaurantSlug = useCart((s) => s.restaurantSlug);
  const restaurantName = useCart((s) => s.restaurantName);
  const subtotal = useCart((s) => s.subtotal());
  const deliveryFee = useCart((s) => s.deliveryFee());
  const taxes = useCart((s) => s.taxes());
  const total = useCart((s) => s.total());
  const clear = useCart((s) => s.clear);

  // Addresses: live from the DB when signed in, mock in demo mode.
  const [addresses, setAddresses] = useState<Address[]>(
    isSupabaseConfigured ? [] : ADDRESSES
  );
  const [addrLoading, setAddrLoading] = useState(isSupabaseConfigured);
  const [addressId, setAddressId] = useState<string>(
    isSupabaseConfigured ? "" : ADDRESSES.find((a) => a.isDefault)?.id ?? ADDRESSES[0].id
  );
  const [showAdd, setShowAdd] = useState(false);
  const [newLabel, setNewLabel] = useState("Home");
  const [newLine, setNewLine] = useState("");
  const [newCoords, setNewCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [addBusy, setAddBusy] = useState(false);

  const [fulfilment, setFulfilment] = useState<Fulfilment>("delivery");
  const [tip, setTip] = useState(0);
  const [status, setStatus] = useState<CheckoutStatus>("ready");
  const [error, setError] = useState<string | null>(null);

  const eta = ACTIVE_ORDER.etaMinutes ?? 25;
  const payTotal = total + tip;

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/addresses");
        const data = await res.json();
        if (cancelled) return;
        const list: Address[] = data.addresses ?? [];
        setAddresses(list);
        setAddressId(list.find((a) => a.isDefault)?.id ?? list[0]?.id ?? "");
        if (list.length === 0) setShowAdd(true);
      } catch {
        /* keep empty; user can add */
      } finally {
        if (!cancelled) setAddrLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function addAddress() {
    if (newLine.trim().length < 6) return;
    setAddBusy(true);
    try {
      const res = await fetch("/api/addresses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: newLabel,
          line: newLine.trim(),
          lat: newCoords?.lat ?? null,
          lng: newCoords?.lng ?? null,
        }),
      });
      const data = await res.json();
      if (res.ok && data.address) {
        setAddresses((prev) => [...prev, data.address]);
        setAddressId(data.address.id);
        setShowAdd(false);
        setNewLine("");
        setNewCoords(null);
      }
    } finally {
      setAddBusy(false);
    }
  }

  if (lines.length === 0 && status !== "placed") {
    return (
      <>
        <PageHeader title="Checkout" />
        <EmptyState
          className="mt-10"
          icon={<ShoppingBag className="size-7" />}
          title="Your cart is empty"
          description="Add a few dishes and they'll show up here, ready to check out."
          action={
            <Link href="/">
              <Button>Browse restaurants</Button>
            </Link>
          }
        />
      </>
    );
  }

  const selectedAddress =
    addresses.find((a) => a.id === addressId) ?? addresses[0];

  const placeOrder = async () => {
    setError(null);

    if (!selectedAddress) {
      setError("Add a delivery address to continue.");
      setShowAdd(true);
      return;
    }
    setStatus("processing");

    if (isSupabaseConfigured) {
      if (!restaurantSlug) {
        setError("Missing restaurant — go back and add items again.");
        setStatus("ready");
        return;
      }

      try {
        const res = await fetch("/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            restaurantSlug,
            lines: lines.map((l) => ({ itemId: l.itemId, qty: l.qty })),
            address: {
              label: selectedAddress.label,
              line: selectedAddress.line,
            },
          }),
        });

        if (res.status === 401) {
          router.push("/signin?next=/checkout");
          setStatus("ready");
          return;
        }

        const data = (await res.json()) as { order?: { id: string }; error?: string };
        if (!res.ok || !data.order?.id) {
          setError(
            data.error === "invalid_items"
              ? "Something in your cart is no longer available."
              : "Could not place the order. Try again."
          );
          setStatus("ready");
          return;
        }

        setStatus("placed");
        clear();
        router.push(`/orders/${data.order.id}?placed=1`);
        return;
      } catch {
        setError("Network error — check your connection and try again.");
        setStatus("ready");
        return;
      }
    }

    // Demo mode — simulated placement.
    window.setTimeout(() => {
      setStatus("placed");
      clear();
      router.push(`/orders/${ACTIVE_ORDER.id}?placed=1`);
    }, 1400);
  };

  return (
    <>
      <PageHeader title="Checkout" subtitle={restaurantName ?? undefined} />

      <div className="space-y-3 px-4 pt-3">
        {/* Delivery or pickup? */}
        <section className="card overflow-hidden">
          <h2 className="px-4 pb-1 pt-4 text-[17px] font-extrabold tracking-tight">
            Delivery or pickup?
          </h2>
          <div className="divide-y divide-line">
            <FulfilmentRow
              on={fulfilment === "delivery"}
              onClick={() => setFulfilment("delivery")}
              icon={<Bike className="size-5" />}
              title="Delivery"
              sub={`${eta}–${eta + 8} min`}
              trailing={
                <span className="text-sm font-bold">
                  {deliveryFee === 0 ? "Free" : formatINR(deliveryFee)}
                </span>
              }
            />
            <FulfilmentRow
              on={fulfilment === "pickup"}
              onClick={() => setFulfilment("pickup")}
              icon={<PersonStanding className="size-5" />}
              title="Pickup"
              sub={`${Math.max(eta - 10, 5)}–${eta} min`}
              trailing={<span className="text-sm font-bold">Free</span>}
            />
            <FulfilmentRow
              on={fulfilment === "schedule"}
              onClick={() => setFulfilment("schedule")}
              icon={<CalendarClock className="size-5" />}
              title="Schedule"
              sub="Pick a time"
            />
          </div>
        </section>

        {/* Promo */}
        <button className="press card flex w-full items-center gap-3 p-4 text-left">
          <Tag className="size-5 text-accent-ink" />
          <span className="flex-1 text-[15px] font-semibold">
            Apply a coupon
          </span>
          <ChevronRight className="size-5 text-muted" />
        </button>

        {/* Order summary */}
        <section className="card p-4">
          <h2 className="mb-3 text-[17px] font-extrabold tracking-tight">
            Order summary
          </h2>
          <ul className="space-y-2.5">
            {lines.map((l) => (
              <li key={l.itemId} className="flex items-center gap-2.5 text-sm">
                <VegMark veg={l.veg} />
                <span className="text-muted">{l.qty}×</span>
                <span className="min-w-0 flex-1 truncate font-medium">
                  {l.name}
                </span>
                <span className="text-data">{formatINR(l.price * l.qty)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 space-y-2 border-t border-line pt-3 text-[15px]">
            <Row label="Subtotal" value={formatINR(subtotal)} muted />
            <Row label="Delivery fee" value={formatINR(deliveryFee)} muted />
            <Row label="Taxes & charges" value={formatINR(taxes)} muted />
            <Row label="Tips" value={formatINR(tip)} muted />
            <div className="border-t border-line pt-2">
              <Row label="To pay (Cash)" value={formatINR(payTotal)} bold />
            </div>
          </div>
        </section>

        {/* Delivery address */}
        <section className="card p-4">
          <h2 className="mb-3 text-[17px] font-extrabold tracking-tight">
            Delivery address
          </h2>

          {addrLoading ? (
            <p className="flex items-center gap-2 py-2 text-sm text-muted">
              <Loader2 className="size-4 animate-spin" /> Loading your addresses…
            </p>
          ) : (
            <div className="space-y-2">
              {addresses.map((a) => {
                const on = a.id === addressId;
                return (
                  <button
                    key={a.id}
                    onClick={() => setAddressId(a.id)}
                    className={cn(
                      "press flex w-full items-start gap-3 rounded-xl border p-3 text-left",
                      on ? "border-accent bg-accent-soft" : "border-line"
                    )}
                  >
                    <span
                      className={cn(
                        "grid size-9 shrink-0 place-items-center rounded-lg",
                        on ? "bg-accent text-white" : "bg-surface-2 text-muted"
                      )}
                    >
                      {a.label === "Work" ? (
                        <Briefcase className="size-[18px]" />
                      ) : (
                        <Home className="size-[18px]" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2 text-[15px] font-semibold">
                        {a.label}
                        {a.isDefault ? (
                          <span className="rounded-full bg-surface-2 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted">
                            Default
                          </span>
                        ) : null}
                      </span>
                      <span className="mt-0.5 block text-sm leading-snug text-muted">
                        {a.line}
                      </span>
                    </span>
                    {on ? <Check className="size-5 shrink-0 text-accent" /> : null}
                  </button>
                );
              })}

              {showAdd ? (
                <div className="space-y-2 rounded-xl border border-line p-3">
                  {/* Drop-a-pin location (Google Maps). Fills the line below and
                      captures precise lat/lng; renders nothing without a key. */}
                  <MapPicker
                    initial={newCoords}
                    onPick={({ lat, lng, address }) => {
                      setNewCoords({ lat, lng });
                      if (address) setNewLine(address);
                    }}
                  />
                  <div className="flex gap-2">
                    {["Home", "Work", "Other"].map((l) => (
                      <button
                        key={l}
                        onClick={() => setNewLabel(l)}
                        className={cn(
                          "press rounded-full border px-3 py-1 text-xs font-semibold",
                          newLabel === l ? "border-accent bg-accent-soft text-accent-ink" : "border-line text-muted"
                        )}
                      >
                        {l}
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={newLine}
                    onChange={(e) => setNewLine(e.target.value)}
                    rows={2}
                    placeholder="Flat / house no, area, city, pincode"
                    className="w-full resize-none rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" disabled={addBusy || newLine.trim().length < 6} onClick={addAddress}>
                      {addBusy ? <Loader2 className="size-4 animate-spin" /> : "Save address"}
                    </Button>
                    {addresses.length > 0 ? (
                      <button className="text-sm font-semibold text-muted" onClick={() => setShowAdd(false)}>
                        Cancel
                      </button>
                    ) : null}
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowAdd(true)}
                  className="press flex w-full items-center gap-2 rounded-xl border border-dashed border-line p-3 text-sm font-semibold text-accent-ink"
                >
                  <Plus className="size-4" /> Add a new address
                </button>
              )}

              {addresses.length === 0 && !showAdd ? (
                <p className="flex items-center gap-2 text-xs text-muted">
                  <MapPin className="size-3.5" /> Add where we should deliver.
                </p>
              ) : null}
            </div>
          )}
        </section>

        {/* Tip the courier — static for now */}
        <section className="card p-4">
          <h2 className="text-[17px] font-extrabold tracking-tight">
            Tip the courier?
          </h2>
          <p className="mt-1 text-sm text-muted">
            The courier will get 100% of your tip.
          </p>
          <div className="mt-3 flex gap-2">
            {TIPS.map((t) => (
              <button
                key={t}
                onClick={() => setTip(t)}
                className={cn(
                  "press flex-1 rounded-full border py-2.5 text-sm font-bold",
                  tip === t
                    ? "border-accent bg-accent text-white"
                    : "border-line bg-surface text-ink"
                )}
              >
                {t === 0 ? "No tip" : formatINR(t)}
              </button>
            ))}
          </div>
        </section>

        {/* Payment — COD only in Phase 1 */}
        <section className="card p-4">
          <h2 className="mb-3 text-[17px] font-extrabold tracking-tight">
            Payment
          </h2>
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-lg bg-surface-2 text-ink">
              <Wallet className="size-[18px]" />
            </span>
            <span className="flex-1">
              <span className="block text-[15px] font-semibold">
                Cash on Delivery
              </span>
              <span className="block text-xs text-muted">
                Pay the rider when your food arrives
              </span>
            </span>
            <Check className="size-5 text-accent" />
          </div>
          <p className="mt-2 flex items-center gap-1.5 text-xs text-muted">
            <Info className="size-3.5" />
            Online payments (UPI · cards · wallets) arrive in a later phase.
          </p>
        </section>

        <p className="pb-2 text-center text-xs text-muted">
          By placing this order you agree to pay {formatINR(payTotal)} in cash on
          delivery.
        </p>
        {error ? (
          <p className="pb-2 text-center text-sm text-deal">{error}</p>
        ) : null}
      </div>

      {/* Sticky place-order CTA */}
      <div className="glass sticky bottom-0 z-20 border-t border-line p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <button
          onClick={placeOrder}
          disabled={status !== "ready"}
          className="press flex h-14 w-full items-center justify-between rounded-full bg-accent px-6 text-[17px] font-bold text-white shadow-[var(--glow-accent)] disabled:opacity-70"
        >
          {status === "processing" ? (
            <span className="mx-auto flex items-center gap-2">
              <Loader2 className="size-5 animate-spin" /> Placing order…
            </span>
          ) : (
            <>
              <span>Place order</span>
              <span>{formatINR(payTotal)}</span>
            </>
          )}
        </button>
      </div>
    </>
  );
}

function FulfilmentRow({
  on,
  onClick,
  icon,
  title,
  sub,
  trailing,
}: {
  on: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  sub: string;
  trailing?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="press flex w-full items-center gap-3 px-4 py-3.5 text-left"
    >
      <span className="grid size-9 shrink-0 place-items-center text-ink">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-bold">{title}</span>
        <span className="block text-xs text-muted">{sub}</span>
      </span>
      {trailing}
      <span
        className={cn(
          "grid size-5 shrink-0 place-items-center rounded-full border-2",
          on ? "border-accent" : "border-line"
        )}
      >
        {on ? <span className="size-2.5 rounded-full bg-accent" /> : null}
      </span>
    </button>
  );
}

function Row({
  label,
  value,
  muted,
  bold,
}: {
  label: string;
  value: string;
  muted?: boolean;
  bold?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className={cn(muted && "text-muted", bold && "font-extrabold")}>
        {label}
      </span>
      <span
        className={cn(
          "text-data",
          muted && "text-muted",
          bold && "text-base font-extrabold"
        )}
      >
        {value}
      </span>
    </div>
  );
}
