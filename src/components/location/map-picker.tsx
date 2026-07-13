"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, LocateFixed, Search } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { loadGoogleMaps } from "@/lib/maps/loader";
import { isMapsConfigured, DEFAULT_CENTER } from "@/lib/maps/config";

export interface PickedLocation {
  lat: number;
  lng: number;
  address: string;
}

/**
 * Drop-a-pin delivery-location picker (Google Maps) — the same idea as the
 * legacy delivery-address page. The user searches, taps the map, drags the pin,
 * or hits "use my location"; each move reverse-geocodes to a street address and
 * reports { lat, lng, address } to the parent.
 *
 * Renders nothing when NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is unset, so callers can
 * fall back to a plain text field.
 */
export function MapPicker({
  initial,
  onPick,
  variant = "form",
}: {
  initial?: { lat: number; lng: number } | null;
  onPick: (loc: PickedLocation) => void;
  /** "checkout" — embedded map with Adjust pin, no search bar */
  variant?: "form" | "checkout";
}) {
  const mapEl = useRef<HTMLDivElement>(null);
  const searchEl = useRef<HTMLInputElement>(null);
  const marker = useRef<google.maps.Marker | null>(null);
  const geocoder = useRef<google.maps.Geocoder | null>(null);
  const mapObj = useRef<google.maps.Map | null>(null);

  // Keep the latest onPick without re-running the (one-shot) init effect.
  const onPickRef = useRef(onPick);
  useEffect(() => {
    onPickRef.current = onPick;
  });

  // Init to "error" (renders nothing) when the key is absent, so we never mount
  // the map container. isMapsConfigured is a build-time constant, so this is a
  // stable initial value — no conditional hooks below.
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    isMapsConfigured ? "loading" : "error"
  );
  const [locating, setLocating] = useState(false);

  // Move the pin, recentre, reverse-geocode, and report upward.
  function settle(pos: google.maps.LatLng) {
    const lat = pos.lat();
    const lng = pos.lng();
    marker.current?.setPosition(pos);
    mapObj.current?.panTo(pos);
    geocoder.current
      ?.geocode({ location: { lat, lng } })
      .then((r) => onPickRef.current({ lat, lng, address: r.results?.[0]?.formatted_address ?? "" }))
      .catch(() => onPickRef.current({ lat, lng, address: "" }));
  }

  useEffect(() => {
    if (!isMapsConfigured) return;
    let cancelled = false;
    loadGoogleMaps()
      .then(() => {
        if (cancelled || !mapEl.current) return;
        const start = initial ?? DEFAULT_CENTER;

        const map = new google.maps.Map(mapEl.current, {
          center: start,
          zoom: initial ? 17 : 14,
          disableDefaultUI: true,
          zoomControl: true,
          clickableIcons: false,
          gestureHandling: "greedy",
        });
        const pin = new google.maps.Marker({ map, position: start, draggable: true });
        mapObj.current = map;
        marker.current = pin;
        geocoder.current = new google.maps.Geocoder();

        map.addListener("click", (e) => {
          if (e.latLng) settle(e.latLng);
        });
        pin.addListener("dragend", () => {
          const p = pin.getPosition();
          if (p) settle(p);
        });

        if (searchEl.current) {
          const ac = new google.maps.places.Autocomplete(searchEl.current, {
            fields: ["geometry", "formatted_address"],
            componentRestrictions: { country: "in" },
          });
          ac.addListener("place_changed", () => {
            const loc = ac.getPlace().geometry?.location;
            if (loc) {
              map.setZoom(17);
              settle(loc);
            }
          });
        }

        // Resolve the address for a pre-existing pin so the parent has a line.
        if (initial) settle(new google.maps.LatLng(initial.lat, initial.lng));
        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
    };
    // Intentionally one-shot: re-init only on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function useMyLocation() {
    if (!("geolocation" in navigator)) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        mapObj.current?.setZoom(17);
        settle(new google.maps.LatLng(pos.coords.latitude, pos.coords.longitude));
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }

  if (status === "error") {
    if (variant === "checkout") {
      return (
        <div className="relative overflow-hidden rounded-xl bg-surface-2">
          <div className="grid h-44 place-items-center text-sm text-muted">
            Map unavailable — enter address details below
          </div>
        </div>
      );
    }
    return null;
  }

  const checkout = variant === "checkout";

  return (
    <div className={checkout ? undefined : "space-y-2"}>
      {!checkout ? (
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <input
            ref={searchEl}
            type="text"
            placeholder="Search for area, street, landmark…"
            className="w-full rounded-lg border border-line bg-surface py-2 pl-9 pr-3 text-sm outline-none focus:border-accent"
          />
        </div>
      ) : null}

      <div className="relative overflow-hidden rounded-xl bg-surface-2">
        <div ref={mapEl} className={cn("w-full", checkout ? "h-44" : "h-52")} />
        {status === "loading" ? (
          <div className="absolute inset-0 grid place-items-center bg-surface-2/60">
            <Loader2 className="size-6 animate-spin text-muted" />
          </div>
        ) : null}
        {checkout ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
            <span className="rounded-full bg-surface px-4 py-2 text-sm font-semibold text-ink shadow-[var(--shadow-md)]">
              Adjust pin
            </span>
          </div>
        ) : (
          <button
            type="button"
            onClick={useMyLocation}
            disabled={locating}
            className="press absolute bottom-2 right-2 flex items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 text-xs font-semibold text-accent shadow-[var(--shadow-md)] disabled:opacity-60"
          >
            {locating ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <LocateFixed className="size-3.5" />
            )}
            Use my location
          </button>
        )}
      </div>
      {!checkout ? (
        <p className="text-xs text-muted">
          Tap the map or drag the pin to set your exact delivery spot.
        </p>
      ) : null}
    </div>
  );
}
