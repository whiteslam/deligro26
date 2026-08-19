"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Banknote,
  Bike,
  MapPin,
  Package,
  Navigation,
  Phone,
  CheckCircle2,
  IndianRupee,
  KeyRound,
  Loader2,
  LocateFixed,
  LocateOff,
  ShieldCheck,
} from "lucide-react";
import { Button, buttonClasses } from "@/components/ui/button";
import { StatCard, SectionTitle, Pill } from "@/components/roles/role-ui";
import { EmptyState } from "@/components/shared/empty-state";
import { AutoRefresh } from "@/components/shared/auto-refresh";
import { formatINR } from "@/lib/utils/format";
import { callablePhone, mapsDirectionsUrl } from "@/lib/utils/phone";
import type { DriverBoardData } from "@/lib/data-access/driver-orders";
import { acceptDeliveryAction, advanceDeliveryAction } from "@/app/driver/actions";

/**
 * One position posted per this many milliseconds, however fast the device
 * produces fixes. A phone on a moving bike emits a reading roughly every second;
 * the customer's map is not more truthful for being told sixty times a minute,
 * and the rider's data plan and battery are real costs.
 */
const LOCATION_REPORT_INTERVAL_MS = 10_000;

type ReportingState =
  | "off" // nothing in flight, or the server said the delivery is over
  | "starting" // watching, no fix accepted yet
  | "reporting" // the server has our position
  | "denied" // the device refused, and will not be asked again
  | "unavailable"; // no geolocation here at all

/**
 * The device's standing answer about geolocation, before we subscribe to
 * anything. Same helper — and same caveat, that plenty of mobile browsers just
 * don't answer — as src/stores/location-store.ts.
 */
async function geolocationPermission(): Promise<PermissionState | null> {
  try {
    const status = await navigator.permissions?.query({ name: "geolocation" });
    return status?.state ?? null;
  } catch {
    return null;
  }
}

/**
 * Report this device's position for as long as a delivery is in flight.
 *
 * Not `useLocation` (src/stores/location-store.ts). That store answers a
 * different question — "which area is this person shopping from" — and answers
 * it once: best single fix, reverse-geocoded to a place name, cached in
 * localStorage, wired to an explainer sheet. A rider needs the opposite
 * lifecycle: a continuous watch, no label, no cache, and no UI in the way of
 * someone holding a bag of food. What is worth borrowing is borrowed — the
 * permission probe above, the secure-origin guard (on plain http the browser
 * reports PERMISSION_DENIED without ever prompting, which reads as a refusal
 * the user never made), and the rule that a real refusal is final and silent.
 *
 * The reported state is *derived* from the delivery it belongs to, so a new job
 * starts from "starting" without the effect having to reset anything. Every
 * write to it comes from a callback — a fetch settling, the device objecting —
 * never from the body of the effect.
 */
function useLocationReporting(activeOrderId: string | null): ReportingState {
  const [tracked, setTracked] = useState<{
    orderId: string;
    state: ReportingState;
  } | null>(null);

  const state: ReportingState = !activeOrderId
    ? "off"
    : tracked?.orderId === activeOrderId
      ? tracked.state
      : "starting";

  useEffect(() => {
    if (!activeOrderId) return;

    let watchId: number | null = null;
    let lastSentAt = 0;
    let inFlight = false;
    let cancelled = false; // the effect was torn down
    let done = false; // we have stopped watching on purpose

    const clearWatch = () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
      }
    };

    const settle = (next: ReportingState) => {
      if (!cancelled) setTracked({ orderId: activeOrderId, state: next });
    };

    /** Stop watching for good, and say why. */
    const finish = (next: ReportingState) => {
      if (done) return;
      done = true;
      clearWatch();
      settle(next);
    };

    const send = async (position: GeolocationPosition) => {
      const now = Date.now();
      // Throttled on the way out rather than by asking the device for fewer
      // fixes: a sparse watch takes longer to notice the rider has moved.
      if (
        cancelled ||
        done ||
        inFlight ||
        now - lastSentAt < LOCATION_REPORT_INTERVAL_MS
      ) {
        return;
      }
      inFlight = true;
      lastSentAt = now;

      try {
        const response = await fetch("/api/driver/location", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          }),
        });
        if (cancelled || done) return;

        if (response.status === 401 || response.status === 403) {
          // The session ended, or the role changed under us. Neither is fixed by
          // trying again, so stop rather than hammer.
          finish("off");
          return;
        }

        if (response.ok) {
          const body = (await response.json().catch(() => null)) as {
            active?: boolean;
          } | null;
          if (cancelled || done) return;
          if (body?.active === false) {
            // Delivery closed somewhere else — completed on another device, or
            // reassigned by an operator. Nothing left to report.
            finish("off");
            return;
          }
          settle("reporting");
        }
        // Anything else (429, 5xx, a rejected fix) is transient from here: keep
        // the watch and let the next position try again.
      } catch {
        // Offline, or the request was dropped mid-ride. Normal on a bike.
      } finally {
        inFlight = false;
      }
    };

    const start = async () => {
      const permission = await geolocationPermission();
      if (cancelled) return;

      if (!("geolocation" in navigator) || !window.isSecureContext) {
        finish("unavailable");
        return;
      }

      if (permission === "denied") {
        // Already refused in device settings. Subscribing would produce a watch
        // that silently never fires; say so instead.
        finish("denied");
        return;
      }

      watchId = navigator.geolocation.watchPosition(
        (position) => void send(position),
        (error) => {
          if (error.code === error.PERMISSION_DENIED) {
            // Final, and silent. The OS will not prompt again from here, there
            // is no dialog we could raise that would change that, and a rider
            // halfway through a delivery should not be arguing with a popup. We
            // report nothing at all rather than anything invented; the
            // customer's map falls back to an interpolated position and says so.
            finish("denied");
          }
          // POSITION_UNAVAILABLE and TIMEOUT are weather, not answers — a
          // tunnel, a basement, a cold GPS chip. Keep watching.
        },
        { enableHighAccuracy: true, maximumAge: 5_000, timeout: 20_000 }
      );
    };

    void start();

    return () => {
      cancelled = true;
      clearWatch();
    };
  }, [activeOrderId]);

  return state;
}

export function DriverBoard({
  initial,
  live,
}: {
  initial: DriverBoardData;
  live: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);

  const { available, active, today } = initial;
  const customerTel = callablePhone(active?.customerPhone);
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState<string | null>(null);
  const [acceptError, setAcceptError] = useState<string | null>(null);

  // Tied to the delivery: a rider carrying someone's dinner is sharing their
  // position for as long as they are carrying it. (This used to be phrased
  // against the online/offline toggle, which has since gone — see below.)
  const reporting = useLocationReporting(live && active ? active.job.id : null);

  function accept(orderId: string) {
    setBusyId(orderId);
    setAcceptError(null);
    startTransition(async () => {
      try {
        const result = await acceptDeliveryAction(orderId);
        if (result && !result.ok) {
          setAcceptError(
            result.error === "already_taken"
              ? "Another rider just grabbed this order."
              : result.error === "rate_limited"
                ? "Too many attempts — wait a minute and try again."
                : "Couldn't accept the order. Try again."
          );
        }
        // Refresh either way: on success the job becomes active; on a lost race
        // it leaves the available pool.
        router.refresh();
      } finally {
        setBusyId(null);
      }
    });
  }

  function advance(orderId: string, code?: string) {
    setBusyId(orderId);
    setOtpError(null);
    startTransition(async () => {
      try {
        const result = await advanceDeliveryAction(orderId, code);
        if (result && !result.ok) {
          setOtpError(
            result.error === "bad_otp"
              ? "Wrong code — ask the customer again."
              : result.error === "bad_pickup_otp"
                ? "Wrong code — ask the restaurant to read it again."
              : result.error === "rate_limited"
                ? "Too many attempts — wait a minute and try again."
                : "Couldn't update. Try again."
          );
          return;
        }
        setOtp("");
        router.refresh();
      } finally {
        setBusyId(null);
      }
    });
  }

  return (
    <div className="space-y-6">
      {live ? <AutoRefresh interval={4000} /> : null}

      {/* This was an online/offline switch. It was `useState(true)` — never
          persisted, never sent anywhere, reset to online on every mount — and
          its only effects were hiding this page's own job list and pausing this
          page's own polling. A rider who ended a shift with it and closed the
          app was never off duty as far as the platform was concerned, and
          reopening the app put them back to "online" regardless.

          It is gone rather than wired up because there is nothing behind it to
          wire to: no driver-availability column, no dispatch, no assignment, no
          shift state. The pool is every ready order not yet claimed, shown to
          whoever opens the board. That is what this card now says, because a
          rider deciding whether to stop for lunch should know that logging off
          is not a thing this system can currently do. */}
      <div className="card flex items-center gap-3 p-4">
        <span className="grid size-11 place-items-center rounded-full bg-surface-2 text-muted">
          <Bike className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-bold leading-tight">
            {live ? "Open to all riders" : "Demo data"}
          </p>
          <p className="text-xs text-muted">
            {live
              ? "Every order below is offered to every rider — first to accept takes it. There's no shift or duty status yet."
              : "Connect Supabase for live requests"}
          </p>
        </div>
      </div>

      {/* Today. "Online 5.5 h" and "Rating 4.8 ★" used to sit here as constants —
          the same numbers for every driver, every day. We track neither. */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Today's earnings" value={formatINR(today.earnings)} tone="green" />
        <StatCard label="Trips" value={String(today.trips)} tone="accent" />
      </div>

      {/* Active delivery */}
      {active ? (
        <section>
          <SectionTitle right={<Pill tone="accent">In progress</Pill>}>
            Active delivery
          </SectionTitle>
          <div className="card overflow-hidden">
            {/* This strip used to be a 128px gradient captioned "Live map". There
                was no map, and there was nothing live about it. It now carries the
                one piece of live information the rider needs from this app about
                the customer's view: whether the customer can actually see them. */}
            <div className="flex items-center justify-center gap-2 border-b border-line bg-surface-2 px-4 py-3 text-center">
              {reporting === "reporting" ? (
                <>
                  <LocateFixed className="size-4 shrink-0 text-green" />
                  <span className="text-sm font-semibold text-green">
                    Sharing your location with the customer
                  </span>
                </>
              ) : reporting === "starting" ? (
                <>
                  <LocateFixed className="size-4 shrink-0 text-muted" />
                  <span className="text-sm text-muted">Finding your position…</span>
                </>
              ) : (
                <>
                  <LocateOff className="size-4 shrink-0 text-muted" />
                  <span className="text-sm text-muted">
                    {reporting === "denied"
                      ? "Location off — the customer sees an estimate, not you"
                      : reporting === "unavailable"
                        ? "This device can't share its location"
                        : "Not sharing your location"}
                  </span>
                </>
              )}
            </div>

            <div className="space-y-4 p-4">
              {/* Money first, and unmissably. A rider glances at this card once,
                  at the door, with a bag in one hand. */}
              {active.payment.instruction === "collect" ? (
                <div className="rounded-xl border-2 border-deal bg-deal-soft px-4 py-3 text-center">
                  <p className="flex items-center justify-center gap-1.5 text-xs font-bold uppercase tracking-wider text-deal">
                    <Banknote className="size-4" /> Collect cash
                  </p>
                  <p className="text-data mt-1 text-3xl font-extrabold text-deal">
                    {formatINR(active.payment.collectAmount)}
                  </p>
                  <p className="mt-1 text-xs font-medium text-deal">
                    Take the full amount before handing the order over.
                  </p>
                </div>
              ) : active.payment.instruction === "prepaid" ? (
                <div className="flex items-center gap-2.5 rounded-xl border border-green bg-green-soft px-4 py-3">
                  <ShieldCheck className="size-5 shrink-0 text-green" />
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-green">
                      Prepaid — collect nothing
                    </p>
                    <p className="text-xs text-muted">
                      Already paid online. Do not ask for money.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2.5 rounded-xl border border-accent bg-accent-soft px-4 py-3">
                  <AlertTriangle className="size-5 shrink-0 text-accent" />
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-accent">
                      Payment not confirmed
                    </p>
                    <p className="text-xs text-muted">
                      Placed as an online payment that hasn&apos;t settled. Don&apos;t
                      collect cash — check with support before handing over.
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3">
                <span className="mt-0.5 grid size-9 place-items-center rounded-full bg-accent-soft text-accent">
                  <MapPin className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-label">
                    {active.leg === "TO_PICKUP" ? "Pick up from" : "Deliver to"}
                  </p>
                  <p className="truncate font-semibold">
                    {active.leg === "TO_PICKUP"
                      ? active.job.restaurant
                      : active.job.customer}
                  </p>
                  <p className="truncate text-sm text-muted">
                    {active.leg === "TO_PICKUP"
                      ? active.job.pickupArea
                      : active.job.dropArea}
                  </p>
                </div>
                <span className="text-data text-sm text-muted">
                  {active.job.distanceKm !== undefined
                    ? `${active.job.distanceKm} km`
                    : "Distance unknown"}
                </span>
              </div>

              {/* Both of these were full-width outline buttons with no onClick,
                  no href and no disabled state — so they looked and pressed
                  like working controls and did nothing, to a courier standing
                  at an address they don't know. They now open the phone's maps
                  app and dialler, and degrade to a visibly-disabled control
                  when the pin or the number isn't recorded (the pattern the
                  customer's own call button already used). */}
              <div className="flex gap-2">
                {active.navigateTo ? (
                  <a
                    href={mapsDirectionsUrl(active.navigateTo)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={buttonClasses({
                      variant: "outline",
                      size: "sm",
                      className: "flex-1",
                    })}
                  >
                    <Navigation className="size-4" /> Navigate
                  </a>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    disabled
                    title={
                      active.leg === "TO_PICKUP"
                        ? "This shop hasn't been pinned on the map"
                        : "This address has no map pin"
                    }
                  >
                    <Navigation className="size-4" /> No pin
                  </Button>
                )}

                {customerTel ? (
                  <a
                    href={`tel:${customerTel}`}
                    className={buttonClasses({
                      variant: "outline",
                      size: "sm",
                      className: "flex-1",
                    })}
                  >
                    <Phone className="size-4" /> Call customer
                  </a>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    disabled
                    title="No phone number recorded for this customer"
                  >
                    <Phone className="size-4" /> No number
                  </Button>
                )}
              </div>

              {active.leg === "TO_CUSTOMER" ? (
                <div className="space-y-2">
                  <label className="text-label block">Ask the customer for their delivery code</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={4}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                    className="w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-center text-2xl tracking-[0.4em] outline-none focus:border-accent"
                    placeholder="••••"
                  />
                  {otpError ? <p className="text-sm text-accent">{otpError}</p> : null}
                  <Button
                    className="w-full"
                    size="lg"
                    disabled={pending || otp.length !== 4}
                    onClick={() => advance(active.job.id, otp)}
                  >
                    {pending && busyId === active.job.id ? (
                      <><Loader2 className="size-5 animate-spin" /> Verifying…</>
                    ) : (
                      <><CheckCircle2 className="size-5" /> Confirm delivery</>
                    )}
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* The other half of the handover, and it now works the same
                      way round as the delivery leg: the counter holds the code
                      and the rider enters it. The rider used to be SHOWN this
                      code to read out, while the server wrote `picked_up`
                      without checking anything — so a pickup could be marked
                      from anywhere. Typing what the kitchen tells you is what
                      makes the code evidence of having been there. */}
                  {active.pickupCodeRequired ? (
                    <div className="space-y-2">
                      <label className="text-label flex items-center gap-1.5">
                        <KeyRound className="size-3.5" />
                        Ask the restaurant for the pickup code
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={4}
                        value={otp}
                        onChange={(e) =>
                          setOtp(e.target.value.replace(/\D/g, ""))
                        }
                        className="w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-center text-2xl tracking-[0.4em] outline-none focus:border-accent"
                        placeholder="••••"
                      />
                    </div>
                  ) : null}
                  {otpError ? <p className="text-sm text-accent">{otpError}</p> : null}
                  <Button
                    className="w-full"
                    size="lg"
                    disabled={
                      pending || (active.pickupCodeRequired && otp.length !== 4)
                    }
                    onClick={() =>
                      advance(
                        active.job.id,
                        active.pickupCodeRequired ? otp : undefined
                      )
                    }
                  >
                    {pending && busyId === active.job.id ? (
                      <><Loader2 className="size-5 animate-spin" /> Updating…</>
                    ) : (
                      <><Package className="size-5" /> Picked up — start delivery</>
                    )}
                  </Button>
                </div>
              )}
              <p className="text-center text-xs text-muted">
                Order {active.job.code} · payout {formatINR(active.job.payout)}
              </p>
            </div>
          </div>
        </section>
      ) : null}

      {/* Available orders */}
      <section>
        <SectionTitle
          right={<span className="text-xs text-muted">{available.length} nearby</span>}
        >
          Available orders
        </SectionTitle>

        {active ? (
          <p className="card p-4 text-sm text-muted">
            Finish your active delivery to see new requests.
          </p>
        ) : available.length === 0 ? (
          <EmptyState
            icon={<Package className="size-7" />}
            title="No requests right now"
            description="Hang tight — orders marked ready by kitchens appear here."
          />
        ) : (
          <>
            {acceptError ? (
              <p className="mb-3 rounded-xl bg-deal-soft px-3 py-2 text-sm font-medium text-deal">
                {acceptError}
              </p>
            ) : null}
            <div className="space-y-3">
            {available.map((job) => (
              <div key={job.id} className="card p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold">{job.restaurant}</p>
                  <span className="text-data flex items-center text-green">
                    <IndianRupee className="size-3.5" />
                    {job.payout}
                  </span>
                </div>
                <div className="mt-2 space-y-1 text-sm text-muted">
                  <p className="flex items-center gap-1.5">
                    <MapPin className="size-3.5 shrink-0" /> Pick up · {job.pickupArea}
                  </p>
                  <p className="flex items-center gap-1.5">
                    <Navigation className="size-3.5 shrink-0" /> Drop · {job.dropArea}
                  </p>
                </div>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    {job.distanceKm !== undefined ? (
                      <Pill tone="muted">{job.distanceKm} km</Pill>
                    ) : null}
                    <Pill tone="muted">{job.items} items</Pill>
                  </div>
                  <Button
                    size="sm"
                    disabled={pending}
                    onClick={() => accept(job.id)}
                  >
                    {pending && busyId === job.id ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      "Accept"
                    )}
                  </Button>
                </div>
              </div>
            ))}
            </div>
          </>
        )}
      </section>

      <p className="px-1 text-center text-xs text-muted">
        Details are shared only for orders assigned to you, and redacted once
        delivered — enforced server-side in production.
      </p>
    </div>
  );
}
