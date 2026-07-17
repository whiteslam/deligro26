"use client";

import { create } from "zustand";
import { reverseGeocode } from "@/lib/utils/geocode";
import { PINNED_LOCATION } from "@/lib/location/pinned";

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
  blocked: boolean; // device/browser refused — only Settings can undo it

  /** Decide whether to raise the explainer sheet on app open. */
  maybePrompt: () => void;
  openAsk: () => void;
  closeAsk: () => void;
  /** Kick off a real detection (triggers the native OS prompt). */
  detect: () => void;
  /** Adopt a location the user chose by hand — a search result or saved address. */
  setPlace: (place: {
    label: string;
    sublabel?: string | null;
    coords?: Coords | null;
  }) => void;
  /** Record that the user declined, without a hard error. */
  dismiss: () => void;
}

const PREF_KEY = "deligro-loc-pref"; // "asked" once the user has responded
const CACHE_KEY = "deligro-loc-cache"; // last resolved location

// Accuracy gates for detection. The Geolocation API hands back whatever it has
// first — often a coarse Wi-Fi/cell/IP estimate that lands you in a neighbouring
// city (Bhilai reading as Bilaspur, ~130km off) before GPS has locked. So we
// watch the position, keep the sharpest fix, and stop early once it's good.
const GOOD_ACCURACY_M = 100; // sharp enough — stop waiting and use it
const MAX_ACCURACY_M = 20_000; // coarser than this ≈ IP-level: don't trust the city
const DETECT_TIMEOUT_MS = 12_000; // how long to let the fix sharpen before giving up

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

/**
 * Geolocation only works on a secure origin. On plain http (e.g. a phone
 * hitting the dev server over the LAN) `getCurrentPosition` never prompts and
 * fails as PERMISSION_DENIED, which would otherwise look like a user refusal.
 */
function geolocationUnavailable(): string | null {
  if (!("geolocation" in navigator)) return "unsupported";
  if (!window.isSecureContext) return "insecure";
  return null;
}

/** The device's current answer, before we ask again. Not all browsers expose it. */
async function permissionState(): Promise<PermissionState | null> {
  try {
    const p = await navigator.permissions?.query({ name: "geolocation" });
    return p?.state ?? null;
  } catch {
    return null;
  }
}

export const useLocation = create<LocationState>((set, get) => ({
  // Deligro only delivers in Bemetara today, so that's where we assume the
  // customer is until they tell us otherwise: the header shows it, and every
  // shop distance is measured from it. A detected fix or a saved address
  // replaces it (status flips to "granted"), and distances follow.
  status: "idle",
  label: PINNED_LOCATION.label,
  sublabel: PINNED_LOCATION.sublabel,
  coords: PINNED_LOCATION.coords,
  error: null,
  askOpen: false,
  blocked: false,

  maybePrompt: async () => {
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

    const unavailable = geolocationUnavailable();
    if (unavailable) {
      set({
        status: "unsupported",
        error:
          unavailable === "insecure"
            ? "Location needs a secure (https) connection on this device."
            : "This device can't share its location.",
      });
      return;
    }

    // If the device already said yes, skip the explainer and just refresh the
    // fix — re-asking a granted permission is pure friction.
    const state = await permissionState();
    if (state === "granted") {
      get().detect();
      return;
    }
    if (state === "denied") {
      // The OS won't show its prompt again; only Settings can undo this. Don't
      // pop the sheet on load — the header still shows a fallback place, and the
      // user can reopen it deliberately.
      markAsked();
      set({
        status: "denied",
        blocked: true,
        error: "Location is blocked for Deligro in your device settings.",
      });
      return;
    }

    let alreadyAsked = false;
    try {
      alreadyAsked = localStorage.getItem(PREF_KEY) === "asked";
    } catch {}

    // Show the in-app explainer ONLY when we know the browser hasn't been asked
    // yet ("prompt") — i.e. the user genuinely has no permission. If the
    // Permissions API can't tell us the state (`null`, common on some mobile
    // browsers), don't guess and pop a popup at someone who may already have
    // granted it: detect silently instead. A granted device resolves with no
    // UI at all; only a true first-timer sees the browser's own native prompt.
    if (cached?.coords) return;

    if (state === "prompt") {
      if (!alreadyAsked) set({ askOpen: true });
      return;
    }

    // state === null (unknown): silent detect — no custom popup.
    if (!alreadyAsked) get().detect();
  },

  openAsk: () => set({ askOpen: true, error: null }),
  closeAsk: () => set({ askOpen: false }),

  detect: () => {
    if (typeof window === "undefined") return;

    const unavailable = geolocationUnavailable();
    if (unavailable) {
      set({
        status: "unsupported",
        error:
          unavailable === "insecure"
            ? "Location needs a secure (https) connection on this device."
            : "This device can't share its location.",
      });
      return;
    }

    markAsked();
    // The sheet stays up while the native prompt is open — closing it here
    // would leave the user staring at the home screen mid-decision.
    set({ status: "loading", error: null, blocked: false });

    // Resolve a fix to a place and store it. Runs after we already have coords.
    const applyFix = async (pos: GeolocationPosition) => {
      const coords: Coords = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
      };
      // Device said yes — drop the sheet and show what we have immediately.
      set({ status: "granted", coords, askOpen: false, blocked: false });

      const place = await reverseGeocode(coords.lat, coords.lng);
      const next = {
        label: place?.label ?? "Current location",
        sublabel: place?.sublabel ?? null,
        coords,
      };
      saveCache(next);
      set({ ...next, status: "granted" });
    };

    // We watch instead of taking a single shot, because the first reading the
    // device returns is usually a coarse network estimate; GPS sharpens over
    // the next few seconds. We keep the best fix seen and stop as soon as it's
    // good enough (or the timer runs out).
    let best: GeolocationPosition | null = null;
    let settled = false;
    let watchId: number | null = null;

    const stop = () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
      }
      clearTimeout(timer);
    };

    const finish = () => {
      if (settled) return;
      settled = true;
      stop();

      if (!best) {
        set({
          status: "idle",
          error: "Your device took too long to find you. Try again.",
        });
        return;
      }

      if (best.coords.accuracy > MAX_ACCURACY_M) {
        // Only a coarse, network/IP-level guess made it in — this is exactly
        // what dropped the header into the wrong city. Don't overwrite with a
        // place we don't trust; keep whatever we already show and invite the
        // user to set their area by hand.
        set({
          status: get().coords ? "granted" : "idle",
          error:
            "We couldn't pinpoint you accurately. Pick your area for the right shops.",
        });
        return;
      }

      void applyFix(best);
    };

    const timer = setTimeout(finish, DETECT_TIMEOUT_MS);

    watchId = navigator.geolocation.watchPosition(
      (pos) => {
        if (!best || pos.coords.accuracy < best.coords.accuracy) best = pos;
        if (pos.coords.accuracy <= GOOD_ACCURACY_M) finish();
      },
      (err) => {
        // Hold out for the timer if we already have something to fall back on;
        // a late error shouldn't throw away a usable fix.
        if (settled || best) return;
        settled = true;
        stop();

        const denied = err.code === err.PERMISSION_DENIED;
        const timedOut = err.code === err.TIMEOUT;
        set({
          status: denied ? "denied" : "idle",
          blocked: denied,
          // Only surface the popup when they genuinely lack permission — a
          // transient timeout shouldn't throw a sheet in the user's face.
          askOpen: denied,
          error: denied
            ? "Location is off for Deligro. Turn it on in your browser or device settings, or pick an address manually."
            : timedOut
              ? "Your device took too long to find you. Try again."
              : "Couldn't get your location. Please try again.",
        });
      },
      { enableHighAccuracy: true, timeout: DETECT_TIMEOUT_MS, maximumAge: 0 }
    );
  },

  // A hand-picked address is as good as a detected fix as far as the header is
  // concerned, and it counts as having been asked — we shouldn't nag afterwards.
  setPlace: ({ label, sublabel = null, coords = null }) => {
    markAsked();
    const next = { label, sublabel, coords };
    saveCache(next);
    set({ ...next, status: "granted", askOpen: false, blocked: false, error: null });
  },

  dismiss: () => {
    markAsked();
    set({ askOpen: false, error: null });
  },
}));
