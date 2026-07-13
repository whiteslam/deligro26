"use client";

import { useState } from "react";
import { Check, LoaderCircle, MapPin } from "lucide-react";
import { MapPicker, type PickedLocation } from "@/components/location/map-picker";
import { saveShopLocation } from "@/app/vendor/settings/actions";
import { isMapsConfigured } from "@/lib/maps/config";

/**
 * Where the shop is. The vendor drops a pin; from then on every customer sees a
 * real distance to this shop instead of the seeded one.
 */
export function ShopLocationForm({
  initial,
}: {
  initial: { lat: number | null; lng: number | null; address: string | null };
}) {
  const pinned =
    typeof initial.lat === "number" && typeof initial.lng === "number"
      ? { lat: initial.lat, lng: initial.lng }
      : null;

  const [picked, setPicked] = useState<PickedLocation | null>(
    pinned ? { ...pinned, address: initial.address ?? "" } : null
  );
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSave() {
    if (!picked) return;
    setBusy(true);
    setError(null);
    setSaved(false);

    const result = await saveShopLocation(picked);
    setBusy(false);

    if (!result.ok) setError(result.error ?? "Couldn't save.");
    else setSaved(true);
  }

  if (!isMapsConfigured) {
    return (
      <p className="text-sm text-muted">
        Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to enable the map picker.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <MapPicker
        initial={pinned}
        onPick={(loc) => {
          setPicked(loc);
          setSaved(false);
        }}
      />

      <div className="flex items-start gap-2 text-sm">
        <MapPin className="mt-0.5 size-4 shrink-0 text-muted" />
        <p className="min-w-0 flex-1">
          {picked?.address ? (
            <span>{picked.address}</span>
          ) : (
            <span className="text-muted">
              No pin yet — customers see an estimated distance until you set one.
            </span>
          )}
        </p>
      </div>

      {error ? <p className="text-sm font-medium text-deal">{error}</p> : null}

      <button
        type="button"
        onClick={onSave}
        disabled={!picked || busy}
        className="press flex h-11 items-center justify-center gap-2 rounded-full bg-accent px-5 font-bold text-white disabled:opacity-50"
      >
        {busy ? (
          <LoaderCircle className="size-4 animate-spin" />
        ) : saved ? (
          <Check className="size-4" />
        ) : null}
        {saved ? "Saved" : "Save shop location"}
      </button>
    </div>
  );
}
