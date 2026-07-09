import { GOOGLE_MAPS_API_KEY } from "./config";

/**
 * Load the Google Maps JS API once, on demand (only when a map is actually
 * shown). Returns a singleton promise so repeated mounts share one <script>.
 * The `places` library powers address autocomplete; geocoding is core.
 */
let loadPromise: Promise<void> | null = null;

export function loadGoogleMaps(): Promise<void> {
  if (loadPromise) return loadPromise;

  loadPromise = new Promise<void>((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("google maps can only load in the browser"));
      return;
    }
    if (!GOOGLE_MAPS_API_KEY) {
      reject(new Error("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY not set"));
      return;
    }

    const callbackName = "__deligroGoogleMapsReady";
    (window as unknown as Record<string, () => void>)[callbackName] = () => {
      resolve();
      delete (window as unknown as Record<string, unknown>)[callbackName];
    };

    const script = document.createElement("script");
    const params = new URLSearchParams({
      key: GOOGLE_MAPS_API_KEY,
      libraries: "places",
      loading: "async",
      callback: callbackName,
    });
    script.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
    script.async = true;
    script.onerror = () => {
      loadPromise = null; // allow a retry on the next mount
      reject(new Error("failed to load google maps"));
    };
    document.head.appendChild(script);
  });

  return loadPromise;
}
