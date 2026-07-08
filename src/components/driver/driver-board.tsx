"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Bike,
  MapPin,
  Package,
  Navigation,
  Phone,
  CheckCircle2,
  IndianRupee,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatCard, SectionTitle, Pill } from "@/components/roles/role-ui";
import { EmptyState } from "@/components/shared/empty-state";
import { AutoRefresh } from "@/components/shared/auto-refresh";
import { formatINR } from "@/lib/utils/format";
import type { DriverBoardData } from "@/lib/data-access/driver-orders";
import { acceptDeliveryAction, advanceDeliveryAction } from "@/app/driver/actions";

export function DriverBoard({
  initial,
  live,
}: {
  initial: DriverBoardData;
  live: boolean;
}) {
  const router = useRouter();
  const [online, setOnline] = useState(true);
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);

  const { available, active, today } = initial;

  function accept(orderId: string) {
    setBusyId(orderId);
    startTransition(async () => {
      try {
        await acceptDeliveryAction(orderId);
        router.refresh();
      } finally {
        setBusyId(null);
      }
    });
  }

  function advance(orderId: string) {
    setBusyId(orderId);
    startTransition(async () => {
      try {
        await advanceDeliveryAction(orderId);
        router.refresh();
      } finally {
        setBusyId(null);
      }
    });
  }

  return (
    <div className="space-y-6">
      {live && online ? <AutoRefresh interval={4000} /> : null}
      {/* Online toggle */}
      <div className="card flex items-center gap-3 p-4">
        <span
          className={`grid size-11 place-items-center rounded-full ${
            online ? "bg-green-soft text-green" : "bg-surface-2 text-muted"
          }`}
        >
          <Bike className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-bold leading-tight">
            {online ? "You're online" : "You're offline"}
          </p>
          <p className="text-xs text-muted">
            {live
              ? online
                ? "Receiving live delivery requests"
                : "Go online to earn"
              : "Demo data — connect Supabase for live requests"}
          </p>
        </div>
        <button
          onClick={() => setOnline((v) => !v)}
          role="switch"
          aria-checked={online}
          aria-label="Toggle online status"
          className={`press relative h-7 w-12 shrink-0 rounded-full transition-colors ${
            online ? "bg-green" : "bg-line"
          }`}
        >
          <span
            className={`absolute top-1 size-5 rounded-full bg-white shadow-sm transition-all ${
              online ? "left-6" : "left-1"
            }`}
          />
        </button>
      </div>

      {/* Today */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Today's earnings" value={formatINR(today.earnings)} tone="green" />
        <StatCard label="Trips" value={String(today.trips)} tone="accent" />
        <StatCard label="Online" value={`${today.onlineHours} h`} />
        <StatCard label="Rating" value={`${today.rating} ★`} />
      </div>

      {/* Active delivery */}
      {active ? (
        <section>
          <SectionTitle right={<Pill tone="accent">In progress</Pill>}>
            Active delivery
          </SectionTitle>
          <div className="card overflow-hidden">
            <div className="relative h-32 bg-surface-2">
              <div
                className="absolute inset-0 opacity-70"
                style={{
                  backgroundImage:
                    "radial-gradient(circle at 30% 40%, var(--accent-soft), transparent 45%), linear-gradient(120deg, var(--surface-2), var(--surface))",
                }}
              />
              <div className="absolute inset-0 grid place-items-center">
                <span className="text-label">Live map</span>
              </div>
            </div>

            <div className="space-y-4 p-4">
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
                  {active.job.distanceKm} km
                </span>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1">
                  <Navigation className="size-4" /> Navigate
                </Button>
                <Button variant="outline" size="sm" className="flex-1">
                  <Phone className="size-4" /> Call
                </Button>
              </div>

              <Button
                className="w-full"
                size="lg"
                disabled={pending}
                onClick={() => advance(active.job.id)}
              >
                {pending && busyId === active.job.id ? (
                  <>
                    <Loader2 className="size-5 animate-spin" /> Updating…
                  </>
                ) : active.leg === "TO_PICKUP" ? (
                  <>
                    <Package className="size-5" /> Picked up — start delivery
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="size-5" /> Mark as delivered
                  </>
                )}
              </Button>
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

        {!online ? (
          <EmptyState
            icon={<Bike className="size-7" />}
            title="You're offline"
            description="Go online to start receiving delivery requests near you."
          />
        ) : active ? (
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
                    <Pill tone="muted">{job.distanceKm} km</Pill>
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
        )}
      </section>

      <p className="px-1 text-center text-xs text-muted">
        Details are shared only for orders assigned to you, and redacted once
        delivered — enforced server-side in production.
      </p>
    </div>
  );
}
