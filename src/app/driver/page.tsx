"use client";

import { useState } from "react";
import {
  Bike,
  MapPin,
  Package,
  Navigation,
  Phone,
  CheckCircle2,
  IndianRupee,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatCard, SectionTitle, Pill } from "@/components/roles/role-ui";
import { EmptyState } from "@/components/shared/empty-state";
import { formatINR } from "@/lib/utils/format";
import {
  AVAILABLE_JOBS,
  DRIVER_TODAY,
  type DeliveryJob,
} from "@/lib/roles-data";

type Leg = "TO_PICKUP" | "TO_CUSTOMER";

export default function DriverPage() {
  const [online, setOnline] = useState(true);
  const [jobs, setJobs] = useState<DeliveryJob[]>(AVAILABLE_JOBS);
  const [active, setActive] = useState<DeliveryJob | null>(null);
  const [leg, setLeg] = useState<Leg>("TO_PICKUP");
  const [done, setDone] = useState({
    trips: DRIVER_TODAY.trips,
    earnings: DRIVER_TODAY.earnings,
  });

  function accept(job: DeliveryJob) {
    setActive(job);
    setLeg("TO_PICKUP");
    setJobs((prev) => prev.filter((j) => j.id !== job.id));
  }

  function advance() {
    if (!active) return;
    if (leg === "TO_PICKUP") {
      setLeg("TO_CUSTOMER");
      return;
    }
    // delivered
    setDone((d) => ({
      trips: d.trips + 1,
      earnings: d.earnings + active.payout,
    }));
    setActive(null);
    setLeg("TO_PICKUP");
  }

  return (
    <div className="space-y-6">
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
            {online ? "Receiving delivery requests" : "Go online to earn"}
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
        <StatCard
          label="Today's earnings"
          value={formatINR(done.earnings)}
          tone="green"
        />
        <StatCard label="Trips" value={String(done.trips)} tone="accent" />
        <StatCard label="Online" value={`${DRIVER_TODAY.onlineHours} h`} />
        <StatCard label="Rating" value={`${DRIVER_TODAY.rating} ★`} />
      </div>

      {/* Active delivery */}
      {active ? (
        <section>
          <SectionTitle right={<Pill tone="accent">In progress</Pill>}>
            Active delivery
          </SectionTitle>
          <div className="card overflow-hidden">
            {/* map placeholder */}
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
                    {leg === "TO_PICKUP" ? "Pick up from" : "Deliver to"}
                  </p>
                  <p className="truncate font-semibold">
                    {leg === "TO_PICKUP" ? active.restaurant : active.customer}
                  </p>
                  <p className="truncate text-sm text-muted">
                    {leg === "TO_PICKUP" ? active.pickupArea : active.dropArea}
                  </p>
                </div>
                <span className="text-data text-sm text-muted">
                  {active.distanceKm} km
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

              <Button className="w-full" size="lg" onClick={advance}>
                {leg === "TO_PICKUP" ? (
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
                Order {active.code} · payout {formatINR(active.payout)}
              </p>
            </div>
          </div>
        </section>
      ) : null}

      {/* Available orders */}
      <section>
        <SectionTitle
          right={<span className="text-xs text-muted">{jobs.length} nearby</span>}
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
        ) : jobs.length === 0 ? (
          <EmptyState
            icon={<Package className="size-7" />}
            title="No requests right now"
            description="Hang tight — new orders in your area will appear here."
          />
        ) : (
          <div className="space-y-3">
            {jobs.map((job) => (
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
                    <MapPin className="size-3.5 shrink-0" /> Pick up ·{" "}
                    {job.pickupArea}
                  </p>
                  <p className="flex items-center gap-1.5">
                    <Navigation className="size-3.5 shrink-0" /> Drop ·{" "}
                    {job.dropArea}
                  </p>
                </div>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Pill tone="muted">{job.distanceKm} km</Pill>
                    <Pill tone="muted">{job.items} items</Pill>
                  </div>
                  <Button size="sm" onClick={() => accept(job)}>
                    Accept
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
