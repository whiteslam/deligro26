"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  LoaderCircle,
  MapPin,
  Navigation,
  Plus,
  Search,
} from "lucide-react";
import { useLocation } from "@/stores/location-store";
import { useSavedAddresses } from "@/hooks/use-saved-addresses";
import { isMapsConfigured } from "@/lib/maps/config";
import { loadGoogleMaps } from "@/lib/maps/loader";

/**
 * Delivery-location picker.
 *
 * Where the header's address chip leads. Three ways to answer the same
 * question — search for a place, use the device fix, or pick something already
 * saved — and a way to add a new address if none of them fit.
 *
 * The permission explainer is deliberately NOT raised from here: by the time
 * you're on this screen you've already been asked once, and the browser only
 * honours one prompt anyway. "Use current location" goes straight to the device.
 */
export default function LocationPage() {
  const router = useRouter();

  const status = useLocation((s) => s.status);
  const label = useLocation((s) => s.label);
  const error = useLocation((s) => s.error);
  const detect = useLocation((s) => s.detect);
  const setPlace = useLocation((s) => s.setPlace);

  const { addresses, loading, selectedId, setDefault } = useSavedAddresses();

  const searchEl = useRef<HTMLInputElement>(null);
  const detecting = status === "loading";

  // Places autocomplete on the search field — same key and loader the address
  // map uses. Silently absent if the key isn't set; the rest of the page works.
  useEffect(() => {
    if (!isMapsConfigured) return;
    let cancelled = false;

    loadGoogleMaps()
      .then(() => {
        if (cancelled || !searchEl.current) return;
        const ac = new google.maps.places.Autocomplete(searchEl.current, {
          fields: ["geometry", "formatted_address", "name"],
          componentRestrictions: { country: "in" },
        });
        ac.addListener("place_changed", () => {
          const place = ac.getPlace();
          const loc = place.geometry?.location;
          if (!loc) return;
          setPlace({
            label: place.name ?? place.formatted_address ?? "Selected location",
            sublabel: place.formatted_address ?? null,
            coords: { lat: loc.lat(), lng: loc.lng() },
          });
          router.back();
        });
      })
      .catch(() => {
        // Autocomplete is a convenience — the other paths still work without it.
      });

    return () => {
      cancelled = true;
    };
  }, [router, setPlace]);

  // Leave as soon as the device gives us a fix.
  const detectedRef = useRef(status);
  useEffect(() => {
    if (detectedRef.current === "loading" && status === "granted") router.back();
    detectedRef.current = status;
  }, [status, router]);

  async function chooseSaved(id: string, addressLabel: string, line: string) {
    const address = addresses.find((a) => a.id === id);
    setPlace({
      label: addressLabel,
      sublabel: line,
      coords:
        address?.lat != null && address?.lng != null
          ? { lat: address.lat, lng: address.lng }
          : null,
    });
    router.back();
    // Persist the choice after navigating — the header already reads the store,
    // so there's nothing to wait for on screen.
    void setDefault(id).catch(() => {});
  }

  return (
    <div className="min-h-full">
      <header className="app-header sticky top-0 z-20 flex items-center gap-3 px-4 py-3">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Back"
          className="press grid size-10 shrink-0 place-items-center rounded-full bg-surface-2 text-ink"
        >
          <ChevronLeft className="size-5" />
        </button>
        <h1 className="min-w-0 flex-1 text-[17px] font-extrabold tracking-tight">
          Delivery location
        </h1>
      </header>

      <div className="px-4 pb-8 pt-1">
        <div className="bolt-search w-full">
          <Search className="size-5 shrink-0" strokeWidth={2.25} />
          <input
            ref={searchEl}
            type="search"
            placeholder="Search for an area, street or landmark"
            aria-label="Search for a delivery location"
          />
        </div>

        <div className="mt-4 divide-y divide-line">
          <button
            type="button"
            onClick={detect}
            disabled={detecting}
            className="press flex w-full items-center gap-3 py-3.5 text-left disabled:opacity-60"
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">
              {detecting ? (
                <LoaderCircle className="size-5 animate-spin" />
              ) : (
                <Navigation className="size-5" />
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-bold text-accent-ink">
                {detecting ? "Locating…" : "Use my current location"}
              </span>
              <span className="mt-0.5 block truncate text-[13px] text-muted">
                {status === "granted" && label
                  ? label
                  : "Detected from your device"}
              </span>
            </span>
          </button>

          <Link
            href="/profile/addresses"
            className="press flex w-full items-center gap-3 py-3.5 text-left"
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-surface-2 text-ink">
              <Plus className="size-5" />
            </span>
            <span className="text-[15px] font-bold">Add a new address</span>
          </Link>
        </div>

        {error ? (
          <p role="alert" className="mt-3 text-[13px] font-medium text-accent-ink">
            {error}
          </p>
        ) : null}

        <h2 className="pb-1 pt-6 text-[13px] font-bold uppercase tracking-[0.08em] text-muted">
          Saved addresses
        </h2>

        {loading ? (
          <p className="flex items-center gap-2 py-6 text-sm text-muted">
            <LoaderCircle className="size-4 animate-spin" /> Loading addresses…
          </p>
        ) : addresses.length === 0 ? (
          <p className="py-6 text-sm text-muted">
            Nothing saved yet. Add an address and it&rsquo;ll show up here.
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {addresses.map((a) => (
              <li key={a.id}>
                <button
                  type="button"
                  onClick={() => chooseSaved(a.id, a.label, a.line)}
                  className="press flex w-full items-start gap-3 py-3.5 text-left"
                >
                  <span
                    className={`mt-0.5 grid size-10 shrink-0 place-items-center rounded-xl ${
                      a.id === selectedId
                        ? "bg-accent text-white"
                        : "bg-surface-2 text-muted"
                    }`}
                  >
                    <MapPin className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2 text-[15px] font-bold">
                      {a.label}
                      {a.isDefault ? (
                        <span className="rounded-full bg-surface-2 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted">
                          Default
                        </span>
                      ) : null}
                    </span>
                    <span className="mt-0.5 block text-[13px] leading-snug text-muted">
                      {a.line}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
