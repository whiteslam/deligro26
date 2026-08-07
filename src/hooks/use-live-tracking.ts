"use client";

import { useCallback, useEffect, useState } from "react";
import type { OrderStatus, Rider } from "@/types";
import {
  computeRiderPosition,
  type TrackPoint,
} from "@/lib/tracking/rider-position";
import type { OrderEta } from "@/lib/orders/eta";
import type { RiderPositionSource } from "@/lib/data-access/order-tracking";
import { DEFAULT_CENTER } from "@/lib/maps/config";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export interface LiveTrackingState {
  status: OrderStatus;
  /**
   * The server's estimate, recomputed on every poll. Null until the first one
   * lands (or forever, on a mock order) — the view falls back to the
   * restaurant's advertised band and says nothing it can't support.
   */
  eta: OrderEta | null;
  rider: Rider | null;
  restaurant: TrackPoint;
  destination: TrackPoint;
  riderPosition: TrackPoint | null;
  riderPositionSource: RiderPositionSource;
}

interface TrackingInterp {
  orderStatus: string;
  deliveryStatus: string | null;
  assignedAt: string | null;
  pickedUpAt: string | null;
  storedRider: (TrackPoint & { at: string | null }) | null;
  /** The road leg, in minutes — how long the pin should take to cross it. */
  rideMinutes: number;
}

export function useLiveTracking(
  orderId: string,
  initial: {
    status: OrderStatus;
    eta?: OrderEta | null;
    rider?: Rider | null;
  }
) {
  const isUuid = /^[0-9a-f-]{36}$/i.test(orderId);
  const [tracking, setTracking] = useState<LiveTrackingState>({
    status: initial.status,
    eta: initial.eta ?? null,
    rider: initial.rider ?? null,
    restaurant: {
      lat: DEFAULT_CENTER.lat + 0.012,
      lng: DEFAULT_CENTER.lng - 0.008,
    },
    destination: DEFAULT_CENTER,
    riderPosition: null,
    // Nothing has been reported yet, and there is no pin to describe.
    riderPositionSource: "none",
  });
  const [interp, setInterp] = useState<TrackingInterp | null>(null);
  // Seeded with the current time rather than 0, so the very first render can
  // place the rider without reading the clock during render (impure: two renders
  // in the same commit could disagree). The interval below advances it.
  const [tick, setTick] = useState(() => Date.now());

  const poll = useCallback(async () => {
    if (!isSupabaseConfigured || !isUuid) return;
    try {
      const res = await fetch(`/api/orders/${orderId}/tracking`, {
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.tracking) {
        const t = data.tracking;
        setTracking({
          status: t.status,
          eta: t.eta ?? null,
          rider: t.rider,
          restaurant: t.restaurant,
          destination: t.destination,
          riderPosition: t.riderPosition,
          // Absent means an older payload, which we must read as "not proven
          // live" rather than as a claim of GPS.
          riderPositionSource: t.riderPositionSource ?? "estimated",
        });
        if (t.interp) setInterp(t.interp);
      }
    } catch {
      /* keep last snapshot */
    }
  }, [orderId, isUuid]);

  useEffect(() => {
    if (!isSupabaseConfigured || !isUuid) return;

    // The first read is scheduled rather than called inline. poll() only touches
    // state after awaiting the fetch, but an effect body calling it directly
    // reads as a synchronous setState — so it goes through a timer, the same
    // "callback from an external system" shape as the interval below. A 0ms
    // delay, so the first snapshot still lands on the first frame.
    const first = setTimeout(() => void poll(), 0);
    const id = setInterval(() => {
      if (!document.hidden) void poll();
    }, 3000);
    const onFocus = () => void poll();
    document.addEventListener("visibilitychange", onFocus);
    window.addEventListener("focus", onFocus);
    return () => {
      clearTimeout(first);
      clearInterval(id);
      document.removeEventListener("visibilitychange", onFocus);
      window.removeEventListener("focus", onFocus);
    };
  }, [poll, isUuid]);

  // Recompute rider pin every 400ms so movement feels live between GPS polls.
  useEffect(() => {
    if (!interp) return;
    const id = setInterval(() => setTick(Date.now()), 400);
    return () => clearInterval(id);
  }, [interp]);

  const animatedRider =
    interp && tracking.restaurant && tracking.destination
      ? computeRiderPosition({
          orderStatus: interp.orderStatus,
          deliveryStatus: interp.deliveryStatus,
          assignedAt: interp.assignedAt,
          pickedUpAt: interp.pickedUpAt,
          restaurant: tracking.restaurant,
          destination: tracking.destination,
          storedRider: interp.storedRider,
          // The road leg, not the door-to-door promise — see order-tracking.ts.
          etaMinutes: interp.rideMinutes,
          now: tick,
        })
      : tracking.riderPosition;

  const riderPosition = animatedRider ?? tracking.riderPosition;

  return {
    ...tracking,
    riderPosition,
    // The server decided this label against the same 45s window
    // `computeRiderPosition` uses, and we re-poll every 3s — so it can only ever
    // be a few seconds behind the pin it describes, and only in the direction of
    // claiming GPS a moment after the fix went stale. Any position we have
    // invented locally, without a snapshot to back it, is never "gps".
    riderPositionSource: riderPosition
      ? tracking.riderPositionSource === "none"
        ? "estimated"
        : tracking.riderPositionSource
      : "none",
  };
}
