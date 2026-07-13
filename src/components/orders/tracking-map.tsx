"use client";

import { useEffect, useRef, useState } from "react";
import { Bike, Loader2 } from "lucide-react";
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

function TrackingMapFallback({
  destination,
  rider,
  showRider,
}: {
  restaurant: TrackPoint;
  destination: TrackPoint;
  rider: TrackPoint | null;
  showRider: boolean;
}) {
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    if (!showRider || !rider) return;
    const id = setInterval(() => setOffset((Date.now() % 12000) / 12000), 400);
    return () => clearInterval(id);
  }, [showRider, rider]);

  const left = `${28 + offset * 42}%`;
  const top = `${18 + Math.sin(offset * Math.PI * 2) * 8}%`;

  return (
    <div className="relative h-56 overflow-hidden bg-[linear-gradient(135deg,#e6f4ec,#eef1f2)]">
      <div
        className="absolute inset-0 opacity-50"
        style={{
          backgroundImage:
            "linear-gradient(var(--line) 1px,transparent 1px),linear-gradient(90deg,var(--line) 1px,transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />
      {showRider && rider ? (
        <div
          className="absolute transition-all duration-1000 ease-out"
          style={{ left, top }}
        >
          <span className="pulse-ring grid size-8 place-items-center rounded-full bg-accent text-white ring-4 ring-white/70">
            <Bike className="size-4" />
          </span>
        </div>
      ) : null}
      <div className="absolute bottom-6 right-12 grid size-7 place-items-center rounded-full bg-ink text-bg ring-4 ring-white/70">
        <span className="size-2 rounded-full bg-bg" />
      </div>
      <p className="absolute bottom-2 left-3 text-[10px] font-medium text-muted">
        {destination.lat.toFixed(4)}, {destination.lng.toFixed(4)}
      </p>
    </div>
  );
}
