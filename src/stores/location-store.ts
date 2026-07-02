"use client";

import { create } from "zustand";
import { reverseGeocode } from "@/lib/utils/geocode";

/**
 * Current-location state for the delivery header.
 *
 * The browser Geolocation API surfaces its own native permission prompt the
 * first time `getCurrentPosition` is called. We front that with an in-app
 * explainer sheet (see LocationPermissionSheet) so the user knows why we're
 * asking before the OS dialog appears — the standard mobile pattern.
 */

export type LocationStatus =
  | "idle" // not asked yet
  | "loading" // waiting on the device
  | "granted" // we have a fix
  | "denied" // user/OS refused
  | "unsupported"; // no geolocation on this device

export interface Coords {
  lat: number;
  lng: number;
}

interface LocationState {
  status: LocationStatus;
  label: string | null; // resolved area, e.g. "Bandra West"
  sublabel: string | null; // fuller line, e.g. "Mumbai, Maharashtra"
  coords: Coords | null;
  error: string | null;
  askOpen: boolean; // in-app permission explainer visibility

  /** Decide whether to raise the explainer sheet on app open. */
  maybePrompt: () => void;
  openAsk: () => void;
  closeAsk: () => void;
  /** Kick off a real detection (triggers the native OS prompt). */
  detect: () => void;
  /** Record that the user declined, without a hard error. */
  dismiss: () => void;
}

const PREF_KEY = "deligro-loc-pref"; // "asked" once the user has responded
const CACHE_KEY = "deligro-loc-cache"; // last resolved location

function loadCache(): Partial<LocationState> | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveCache(data: {
  label: string | null;
  sublabel: string | null;
  coords: Coords | null;
}) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {}
}

function markAsked() {
  try {
    localStorage.setItem(PREF_KEY, "asked");
  } catch {}
}

export const useLocation = create<LocationState>((set) => ({
  status: "idle",
  label: null,
  sublabel: null,
  coords: null,
  error: null,
  askOpen: false,

  maybePrompt: () => {
    if (typeof window === "undefined") return;

    // Restore a previously resolved location so the header isn't empty.
    const cached = loadCache();
    if (cached?.coords) {
      set({
        status: "granted",
        label: cached.label ?? null,
        sublabel: cached.sublabel ?? null,
        coords: cached.coords ?? null,
      });
    }

    if (!("geolocation" in navigator)) {
      set({ status: "unsupported" });
      return;
    }

    let alreadyAsked = false;
    try {
      alreadyAsked = localStorage.getItem(PREF_KEY) === "asked";
    } catch {}

    // Only raise the explainer if we've never asked and have no fix yet.
    if (!alreadyAsked && !cached?.coords) {
      set({ askOpen: true });
    }
  },

  openAsk: () => set({ askOpen: true }),
  closeAsk: () => set({ askOpen: false }),

  detect: () => {
    if (typeof window === "undefined") return;
    if (!("geolocation" in navigator)) {
      set({ status: "unsupported", askOpen: false });
      return;
    }

    markAsked();
    set({ status: "loading", error: null, askOpen: false });

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const coords: Coords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        // Optimistic: show coordinates-derived state immediately.
        set({ status: "granted", coords });

        const place = await reverseGeocode(coords.lat, coords.lng);
        const next = {
          label: place?.label ?? "Current location",
          sublabel: place?.sublabel ?? null,
          coords,
        };
        saveCache(next);
        set({ ...next, status: "granted" });
      },
      (err) => {
        markAsked();
        const denied = err.code === err.PERMISSION_DENIED;
        set({
          status: denied ? "denied" : "idle",
          error: denied
            ? "Location access is off. You can still pick an address manually."
            : "Couldn't get your location. Please try again.",
        });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  },

  dismiss: () => {
    markAsked();
    set({ askOpen: false });
  },
}));
