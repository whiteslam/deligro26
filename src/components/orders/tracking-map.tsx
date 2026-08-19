"use client";

import { useEffect, useRef, useState } from "react";
import { Bike, Loader2, Store } from "lucide-react";
import { loadGoogleMaps } from "@/lib/maps/loader";
import { isMapsConfigured, DEFAULT_CENTER } from "@/lib/maps/config";
import type { TrackPoint } from "@/lib/tracking/rider-position";

export function TrackingMap({
  restaurant,
  destination,
  rider,
  showRider,
}: {
  restaurant: TrackPoint;
  destination: TrackPoint;
  rider: TrackPoint | null;
  showRider: boolean;
}) {
  const mapEl = useRef<HTMLDivElement>(null);
  const mapObj = useRef<google.maps.Map | null>(null);
  const restaurantMarker = useRef<google.maps.Marker | null>(null);
  const destMarker = useRef<google.maps.Marker | null>(null);
  const riderMarker = useRef<google.maps.Marker | null>(null);
  const routeLine = useRef<google.maps.Polyline | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    isMapsConfigured ? "loading" : "error"
  );

  useEffect(() => {
    if (!isMapsConfigured) return;
    let cancelled = false;

    loadGoogleMaps()
      .then(() => {
        if (cancelled || !mapEl.current) return;

        const center = rider ?? destination ?? DEFAULT_CENTER;
        const map = new google.maps.Map(mapEl.current, {
          center,
          zoom: 15,
          disableDefaultUI: true,
          zoomControl: true,
          clickableIcons: false,
          gestureHandling: "greedy",
        });
        mapObj.current = map;

        restaurantMarker.current = new google.maps.Marker({
          map,
          position: restaurant,
          title: "Restaurant",
        });
        destMarker.current = new google.maps.Marker({
          map,
          position: destination,
          title: "Your location",
        });
        routeLine.current = new google.maps.Polyline({
          map,
          path: [restaurant, destination],
          strokeColor: "#17b26a",
          strokeOpacity: 0.85,
          strokeWeight: 4,
          geodesic: true,
        });

        if (showRider && rider) {
          riderMarker.current = new google.maps.Marker({
            map,
            position: rider,
            title: "Courier",
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 10,
              fillColor: "#17b26a",
              fillOpacity: 1,
              strokeColor: "#ffffff",
              strokeWeight: 3,
            },
          });
        }

        fitBounds(map, restaurant, destination, rider);
        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });

    return () => {
      cancelled = true;
    };
    // One-shot map init
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!mapObj.current || status !== "ready") return;

    restaurantMarker.current?.setPosition(restaurant);
    destMarker.current?.setPosition(destination);
    routeLine.current?.setPath([restaurant, destination]);

    if (showRider && rider) {
      if (!riderMarker.current) {
        riderMarker.current = new google.maps.Marker({
          map: mapObj.current,
          position: rider,
          title: "Courier",
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: "#17b26a",
            fillOpacity: 1,
            strokeColor: "#ffffff",
            strokeWeight: 3,
          },
        });
      } else {
        riderMarker.current.setPosition(rider);
        riderMarker.current.setMap(mapObj.current);
      }
      mapObj.current.panTo(rider);
    } else {
      riderMarker.current?.setMap(null);
    }
  }, [restaurant, destination, rider, showRider, status]);

  if (status === "error") {
    return (
      <TrackingMapFallback
        restaurant={restaurant}
        destination={destination}
        rider={rider}
        showRider={showRider}
      />
    );
  }

  return (
    <div className="relative h-56 w-full overflow-hidden bg-surface-2">
      <div ref={mapEl} className="h-full w-full" />
      {status === "loading" ? (
        <div className="absolute inset-0 grid place-items-center bg-surface-2/70">
          <Loader2 className="size-6 animate-spin text-muted" />
        </div>
      ) : null}
    </div>
  );
}

function fitBounds(
  map: google.maps.Map,
  restaurant: TrackPoint,
  destination: TrackPoint,
  rider: TrackPoint | null
) {
  const bounds = new google.maps.LatLngBounds();
  bounds.extend(restaurant);
  bounds.extend(destination);
  if (rider) bounds.extend(rider);
  map.fitBounds(bounds, 48);
}

/** Where a point sits inside the padded bounding box, as CSS percentages. */
interface Placed {
  left: string;
  top: string;
}

/**
 * Project real coordinates onto the panel, so every marker keeps its true
 * position relative to the others. A degenerate span (one point, or several at
 * the same place) collapses to the centre rather than dividing by zero.
 */
function placer(points: TrackPoint[]): (p: TrackPoint) => Placed {
  const lats = points.map((p) => p.lat);
  const lngs = points.map((p) => p.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const latSpan = maxLat - minLat;
  const lngSpan = maxLng - minLng;

  // Inset so a marker at an extreme isn't half outside the panel.
  const PAD = 18;
  const SPAN = 100 - PAD * 2;

  return (p) => ({
    left: `${lngSpan === 0 ? 50 : PAD + ((p.lng - minLng) / lngSpan) * SPAN}%`,
    // North is up, so the highest latitude gets the smallest `top`.
    top: `${latSpan === 0 ? 50 : PAD + ((maxLat - p.lat) / latSpan) * SPAN}%`,
  });
}

/**
 * What we can honestly draw with no Maps SDK: the restaurant, the destination
 * and — when there is one — the courier, each at its real coordinates, plus the
 * straight line between the two fixed ends.
 *
 * It used to draw a decorative grid and walk the courier marker along
 * `left = 28 + offset*42%`, `top = 18 + sin(offset·2π)*8%`, on a 400 ms timer,
 * with `rider` used only as a truthiness check and its actual coordinates
 * discarded. Since `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is unset, that was the
 * production path: for the whole delivery a customer watched a dot that moved
 * while the courier stood still and stood still nowhere near the courier — and
 * the "this is an estimate" caption in `tracking-view` is suppressed exactly
 * when the rider IS sharing GPS, so the invention was least disclosed in the
 * case where it was most wrong.
 *
 * This is a schematic, not a map: it has no roads and the line is not a route.
 * The caption says so, because a customer reading distance off it would
 * otherwise be reading a straight line as a journey.
 */
function TrackingMapFallback({
  restaurant,
  destination,
  rider,
  showRider,
}: {
  restaurant: TrackPoint;
  destination: TrackPoint;
  rider: TrackPoint | null;
  showRider: boolean;
}) {
  const courier = showRider && rider ? rider : null;
  const place = placer([restaurant, destination, ...(courier ? [courier] : [])]);
  const shop = place(restaurant);
  const home = place(destination);
  const bike = courier ? place(courier) : null;

  return (
    <div className="relative h-56 overflow-hidden bg-[linear-gradient(135deg,#e6f4ec,#eef1f2)]">
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        {/* Stroked via `style`, not a `stroke` attribute: a CSS variable is
            only valid in a style declaration, and `stroke="var(--line)"` as a
            presentation attribute simply doesn't paint. */}
        <line
          x1={parseFloat(shop.left)}
          y1={parseFloat(shop.top)}
          x2={parseFloat(home.left)}
          y2={parseFloat(home.top)}
          style={{ stroke: "var(--line)" }}
          strokeWidth="0.6"
          strokeDasharray="2 2"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      <Marker at={shop} label="Restaurant">
        <span className="grid size-7 place-items-center rounded-full bg-surface text-ink ring-4 ring-white/70">
          <Store className="size-3.5" />
        </span>
      </Marker>

      <Marker at={home} label="Your location">
        <span className="grid size-7 place-items-center rounded-full bg-ink text-bg ring-4 ring-white/70">
          <span className="size-2 rounded-full bg-bg" />
        </span>
      </Marker>

      {bike ? (
        <Marker at={bike} label="Courier">
          <span className="grid size-8 place-items-center rounded-full bg-accent text-[var(--on-accent)] ring-4 ring-white/70">
            <Bike className="size-4" />
          </span>
        </Marker>
      ) : null}

      <p className="absolute inset-x-0 bottom-0 bg-surface/85 px-3 py-1.5 text-[10px] font-medium leading-snug text-muted">
        No map available — positions shown in a straight line, not along roads.
      </p>
    </div>
  );
}

/** Centres its child on a projected point. */
function Marker({
  at,
  label,
  children,
}: {
  at: Placed;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="absolute -translate-x-1/2 -translate-y-1/2"
      style={{ left: at.left, top: at.top }}
      title={label}
    >
      {children}
    </div>
  );
}
