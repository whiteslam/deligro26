"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  ShoppingBag,
  MapPin,
  AlertTriangle,
  Trash2,
  Bike,
} from "lucide-react";
import { useCart } from "@/stores/cart-store";
import { ACTIVE_ORDER } from "@/lib/data";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { EmptyState } from "@/components/shared/empty-state";
import { MapPicker } from "@/components/location/map-picker";
import { Button } from "@/components/ui/button";
import { AddAddressForm } from "@/components/addresses/add-address-form";
import { AddressPickerSheet } from "@/components/addresses/address-picker-sheet";
import { useSavedAddresses } from "@/hooks/use-saved-addresses";
import { cn } from "@/lib/utils/cn";
import { formatINR } from "@/lib/utils/format";
import { computeChargesWith, TIP_OPTIONS } from "@/lib/pricing";

type CheckoutStatus = "ready" | "processing" | "placed";

/** Live platform config from the Admin Settings tab — the same values billed. */
export interface CheckoutConfig {
  deliveryFee: number;
  taxRate: number;
  freeDeliveryThreshold: number;
  minOrder: number;
  acceptingOrders: boolean;
  maintenanceMessage: string;
}

export function CheckoutView({ config }: { config: CheckoutConfig }) {
  const router = useRouter();
  const lines = useCart((s) => s.lines);
  const restaurantSlug = useCart((s) => s.restaurantSlug);
  const restaurantName = useCart((s) => s.restaurantName);
  const subtotal = lines.reduce((sum, l) => sum + l.price * l.qty, 0);
  const clear = useCart((s) => s.clear);

  const {
    addresses,
    loading: addrLoading,
    selectedId,
    setSelectedId,
    selected: selectedAddress,
    create: createAddress,
    update: updateAddress,
  } = useSavedAddresses();

  const [showPicker, setShowPicker] = useState(false);
  // Asked for explicitly ("Add another address", or a failed place-order). With
  // no address saved at all the form is the only thing to show — and it offers
  // no Cancel in that state — so that case is derived rather than stored: state
  // that duplicates a fact already in `addresses` can only drift from it.
  const [addFormRequested, setAddFormRequested] = useState(false);
  const [mapCoords, setMapCoords] = useState<{ lat: number; lng: number } | null>(
    null
  );
  const [pinBusy, setPinBusy] = useState(false);
  const [pinSaved, setPinSaved] = useState(false);

  const [apartment, setApartment] = useState("");
  const [entryCode, setEntryCode] = useState("");
  const [floor, setFloor] = useState("");
  const [buildingName, setBuildingName] = useState("");
  const [courierInstructions, setCourierInstructions] = useState("");

  const [tip, setTip] = useState(0);

  // One definition of what an order costs, from the live platform settings the
  // server bills with — so the quote here equals the charge.
  const charges = computeChargesWith(config, subtotal, tip);
  const [status, setStatus] = useState<CheckoutStatus>("ready");
  const [error, setError] = useState<string | null>(null);

  const showAddForm =
    addFormRequested || (!addrLoading && addresses.length === 0);

  const payTotal = charges.total;

  // Availability gates: the platform can be paused, or a minimum can apply.
  const belowMinimum = config.minOrder > 0 && subtotal < config.minOrder;
  const shortBy = config.minOrder - subtotal;
  const ordersClosed = !config.acceptingOrders;
  const checkoutBlocked = ordersClosed || belowMinimum;

  // Move the map pin onto whichever address the customer picked. Adjusted during
  // render rather than in an effect, so the map never paints a frame still
  // showing the previous address's pin.
  //
  // Keyed on the address id, not the object: saving a pin re-fetches the list
  // and hands back a new object for the same address, and re-running on that
  // would wipe the "Saved" confirmation the customer just earned.
  const addressId = selectedAddress?.id ?? null;
  const [syncedAddressId, setSyncedAddressId] = useState(addressId);
  if (addressId !== syncedAddressId) {
    setSyncedAddressId(addressId);
    if (selectedAddress) {
      if (selectedAddress.lat != null && selectedAddress.lng != null) {
        setMapCoords({ lat: selectedAddress.lat, lng: selectedAddress.lng });
      }
      setPinSaved(false);
    }
  }

  const pinMoved =
    selectedAddress &&
    mapCoords &&
    (selectedAddress.lat !== mapCoords.lat || selectedAddress.lng !== mapCoords.lng);

  const showDistanceWarning = Boolean(selectedAddress) && !mapCoords;

  async function savePinToAddress() {
    if (!selectedAddress || !mapCoords) return;
    setPinBusy(true);
    setError(null);
    try {
      await updateAddress(selectedAddress.id, {
        lat: mapCoords.lat,
        lng: mapCoords.lng,
      });
      setPinSaved(true);
    } catch {
      setError("Could not save pin to your address.");
    } finally {
      setPinBusy(false);
    }
  }

  function clearCart() {
    clear();
    router.back();
  }

  const placeOrder = async () => {
    setError(null);

    if (ordersClosed) {
      setError(
        config.maintenanceMessage.trim() ||
          "We're not accepting orders right now. Please try again shortly."
      );
      return;
    }
    if (belowMinimum) {
      setError(
        `Add ${formatINR(shortBy)} more to reach the ${formatINR(
          config.minOrder
        )} minimum order.`
      );
      return;
    }
    if (!selectedAddress) {
      setError("Add a delivery address to continue.");
      setAddFormRequested(true);
      return;
    }
    if (!courierInstructions.trim()) {
      setError("Add instructions for the courier.");
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
            // The tip is money: the server re-derives the total including it,
            // rather than us telling it what to charge.
            tip,
            address: {
              label: selectedAddress.label,
              line: [
                selectedAddress.line,
                apartment.trim(),
                entryCode.trim() && `Entry ${entryCode.trim()}`,
                floor.trim() && `Floor ${floor.trim()}`,
                buildingName.trim(),
                courierInstructions.trim(),
              ]
                .filter(Boolean)
                .join(", "),
              lat: mapCoords?.lat ?? selectedAddress.lat,
              lng: mapCoords?.lng ?? selectedAddress.lng,
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
              : data.error === "tip_unsupported"
                ? "Tipping isn't available right now — set the tip to “No tip” to place your order."
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

    window.setTimeout(() => {
      setStatus("placed");
      clear();
      router.push(`/orders/${ACTIVE_ORDER.id}?placed=1`);
    }, 1400);
  };

  if (lines.length === 0 && status !== "placed") {
    return (
      <>
        <CheckoutHeader title="Checkout" onBack={() => router.back()} />
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

  return (
    <div className="relative min-h-full bg-surface-2">
      <CheckoutHeader
        title={restaurantName ?? "Checkout"}
        onBack={() => router.back()}
        onClear={clearCart}
      />

      <div className="space-y-3 px-4 pb-4 pt-3">
        <section className="card overflow-hidden">
          {addrLoading ? (
            <p className="flex items-center gap-2 p-4 text-sm text-muted">
              <Loader2 className="size-4 animate-spin" /> Loading your addresses…
            </p>
          ) : showAddForm ? (
            <>
              <div className="border-b border-line px-4 py-3">
                <h2 className="text-[15px] font-bold">
                  {addresses.length ? "Add delivery address" : "Set delivery address"}
                </h2>
                <p className="mt-0.5 text-xs text-muted">
                  Search on the map or enter your full address.
                </p>
              </div>
              <AddAddressForm
                compact
                onSave={async (input) => {
                  await createAddress(input);
                  setAddFormRequested(false);
                }}
                onCancel={
                  addresses.length
                    ? () => setAddFormRequested(false)
                    : undefined
                }
              />
            </>
          ) : selectedAddress ? (
            <>
              <button
                type="button"
                onClick={() => setShowPicker(true)}
                className="press flex w-full items-center gap-3 border-b border-line px-4 py-3.5 text-left"
              >
                <MapPin className="size-5 shrink-0 text-ink" strokeWidth={2.25} />
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-semibold uppercase tracking-wide text-muted">
                    {selectedAddress.label}
                    {selectedAddress.isDefault ? " · Default" : ""}
                  </span>
                  <span className="mt-0.5 block text-[15px] font-medium leading-snug">
                    {selectedAddress.line}
                  </span>
                </span>
                <ChevronRight className="size-5 shrink-0 text-muted" />
              </button>

              {showDistanceWarning ? (
                <div className="flex items-start gap-2.5 border-b border-line bg-deal-soft px-4 py-3 text-sm font-medium text-deal">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                  <span>Check your address, you&apos;re a bit far away</span>
                </div>
              ) : null}

              <div className="space-y-3 p-4">
                <MapPicker
                  key={selectedId}
                  variant="checkout"
                  initial={mapCoords}
                  onPick={({ lat, lng }) => {
                    setMapCoords({ lat, lng });
                    setPinSaved(false);
                  }}
                />

                {pinMoved ? (
                  <button
                    type="button"
                    onClick={savePinToAddress}
                    disabled={pinBusy}
                    className="press w-full rounded-xl border border-accent bg-accent-soft py-2.5 text-sm font-bold text-accent-ink disabled:opacity-60"
                  >
                    {pinBusy ? (
                      <Loader2 className="mx-auto size-4 animate-spin" />
                    ) : pinSaved ? (
                      "Pin saved to address"
                    ) : (
                      "Save pin to this address"
                    )}
                  </button>
                ) : null}

                <CheckoutField
                  placeholder="Apartment, flat or suite number"
                  value={apartment}
                  onChange={setApartment}
                />

                <div className="grid grid-cols-2 gap-3">
                  <CheckoutField
                    placeholder="Entry code"
                    value={entryCode}
                    onChange={setEntryCode}
                  />
                  <CheckoutField
                    placeholder="Floor"
                    value={floor}
                    onChange={setFloor}
                  />
                </div>

                <CheckoutField
                  label="Building name"
                  placeholder="Building name"
                  value={buildingName}
                  onChange={setBuildingName}
                />

                <CheckoutField
                  label="Instructions for the courier"
                  placeholder="Instructions for the courier"
                  value={courierInstructions}
                  onChange={setCourierInstructions}
                  required
                />

                <p className="text-xs text-muted">*Required fields</p>

                <Link
                  href="/profile/addresses"
                  className="block text-center text-sm font-semibold text-accent-ink"
                >
                  Manage saved addresses
                </Link>
              </div>
            </>
          ) : null}
        </section>

        <section className="card p-4">
          <div className="flex gap-4">
            <div className="grid size-20 shrink-0 place-items-center rounded-2xl bg-accent-soft">
              <Bike className="size-9 text-accent-ink" strokeWidth={1.75} />
            </div>
            <div className="min-w-0 flex-1 pt-1">
              <h2 className="text-[17px] font-extrabold tracking-tight">
                Tip the courier?
              </h2>
              <p className="mt-1 text-sm leading-snug text-muted">
                The courier will get 100% of your tip. You can cancel the tip
                later.
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {TIP_OPTIONS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTip(t)}
                className={cn(
                  "press bolt-chip min-w-[72px] justify-center",
                  tip === t && "bolt-chip-on"
                )}
              >
                {t === 0 ? "No tip" : formatINR(t)}
              </button>
            ))}
          </div>
        </section>

        {error ? (
          <p className="text-center text-sm text-deal">{error}</p>
        ) : null}
      </div>

      <div className="glass sticky bottom-0 z-20 border-t border-line p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        {ordersClosed ? (
          <p className="mb-2 flex items-center gap-1.5 text-center text-sm font-medium text-deal">
            <AlertTriangle className="size-4 shrink-0" />
            {config.maintenanceMessage.trim() ||
              "We're not accepting orders right now."}
          </p>
        ) : belowMinimum ? (
          <p className="mb-2 text-center text-sm font-medium text-muted">
            Add {formatINR(shortBy)} more to reach the{" "}
            {formatINR(config.minOrder)} minimum.
          </p>
        ) : null}
        <button
          onClick={placeOrder}
          disabled={status !== "ready" || checkoutBlocked}
          className="press flex h-12 w-full items-center justify-between rounded-full bg-accent px-5 text-[16px] font-bold text-white shadow-[var(--glow-accent)] disabled:opacity-70"
        >
          {status === "processing" ? (
            <span className="mx-auto flex items-center gap-2">
              <Loader2 className="size-5 animate-spin" /> Placing order…
            </span>
          ) : ordersClosed ? (
            <span className="mx-auto">Orders paused</span>
          ) : (
            <>
              <span>Place order</span>
              <span>{formatINR(payTotal)}</span>
            </>
          )}
        </button>
      </div>

      <AddressPickerSheet
        open={showPicker}
        addresses={addresses}
        selectedId={selectedId}
        onSelect={setSelectedId}
        onClose={() => setShowPicker(false)}
        onAddNew={() => setAddFormRequested(true)}
      />
    </div>
  );
}

function CheckoutHeader({
  title,
  onBack,
  onClear,
}: {
  title: string;
  onBack: () => void;
  onClear?: () => void;
}) {
  return (
    <header className="glass sticky top-0 z-20 flex items-center gap-3 px-4 py-3">
      <button
        onClick={onBack}
        aria-label="Go back"
        className="press grid size-10 shrink-0 place-items-center rounded-full border border-line bg-surface text-ink"
      >
        <ChevronLeft className="size-5" />
      </button>
      <h1 className="min-w-0 flex-1 truncate text-center text-[17px] font-extrabold leading-tight tracking-tight">
        {title}
      </h1>
      {onClear ? (
        <button
          onClick={onClear}
          aria-label="Clear cart"
          className="press grid size-10 shrink-0 place-items-center rounded-full border border-line bg-surface text-ink"
        >
          <Trash2 className="size-[18px]" />
        </button>
      ) : (
        <span className="size-10 shrink-0" aria-hidden />
      )}
    </header>
  );
}

function CheckoutField({
  label,
  placeholder,
  value,
  onChange,
  required,
}: {
  label?: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  return (
    <label className="block">
      {label ? (
        <span className="mb-1.5 block text-xs font-medium text-muted">
          {required ? "*" : ""}
          {label}
        </span>
      ) : null}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={label ? undefined : placeholder}
        className="w-full rounded-xl bg-surface-2 px-3.5 py-3 text-[15px] text-ink outline-none placeholder:text-muted focus:ring-2 focus:ring-accent/30"
      />
    </label>
  );
}
