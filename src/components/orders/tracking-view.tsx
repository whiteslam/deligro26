"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Phone, Check, MessageCircle, CircleHelp, Star } from "lucide-react";
import type { Order } from "@/types";
import { PageHeader } from "@/components/layout/page-header";
import { TRACKING_STEPS, statusIndex } from "@/lib/utils/order-status";
import { shortOrderId } from "@/lib/utils/order-map";
import { formatINR } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

export function TrackingView({ order }: { order: Order }) {
  const params = useSearchParams();
  const justPlaced = params.get("placed") === "1";
  const [toast, setToast] = useState(justPlaced);

  const current = statusIndex(order.status);
  const delivered = order.status === "DELIVERED";

  useEffect(() => {
    if (!justPlaced) return;
    const t = window.setTimeout(() => setToast(false), 2600);
    return () => window.clearTimeout(t);
  }, [justPlaced]);

  return (
    <>
      {/* Placed toast */}
      {toast ? (
        <div className="animate-slide-up glass fixed left-1/2 top-4 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full px-4 py-2.5 shadow-[var(--shadow-md)]">
          <span className="grid size-6 place-items-center rounded-full bg-green text-white">
            <Check className="size-4" strokeWidth={3} />
          </span>
          <span className="text-sm font-semibold">Order placed</span>
        </div>
      ) : null}

      <PageHeader
        title={`Order ${shortOrderId(order.id)}`}
        subtitle={order.restaurantName}
      />

      {/* Map area — live rider on the way */}
      <div className="relative h-56 overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(135deg,#e8efe9,#f2ece2)",
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.5]"
          style={{
            backgroundImage:
              "linear-gradient(var(--line) 1px,transparent 1px),linear-gradient(90deg,var(--line) 1px,transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
        {/* dashed route */}
        <svg
          className="absolute inset-0 h-full w-full"
          viewBox="0 0 400 224"
          fill="none"
          preserveAspectRatio="none"
        >
          <path
            d="M60 40 C 140 60, 120 150, 220 150 S 340 170, 340 190"
            stroke="var(--accent)"
            strokeWidth="3"
            strokeDasharray="6 8"
            strokeLinecap="round"
            opacity="0.7"
          />
        </svg>
        {/* rider dot */}
        <div className="absolute left-[54px] top-[30px]">
          <span className="pulse-ring grid size-6 place-items-center rounded-full bg-accent ring-4 ring-white/70" />
        </div>
        {/* destination */}
        <div className="absolute bottom-[26px] right-[52px] grid size-7 place-items-center rounded-full bg-ink text-bg ring-4 ring-white/70">
          <span className="size-2 rounded-full bg-bg" />
        </div>
      </div>

      {/* Status card floats over the map */}
      <div className="relative -mt-6 space-y-4 rounded-t-[var(--radius-sheet)] bg-bg px-4 pt-5">
        {delivered ? (
          <div className="card border-green/40 bg-green-soft p-5 text-center">
            <div className="mx-auto mb-2 grid size-12 place-items-center rounded-full bg-green text-white">
              <Check className="size-6" strokeWidth={3} />
            </div>
            <h2 className="text-heading text-green">Delivered</h2>
            <p className="text-sm text-muted">
              Hope it was delicious. How was it?
            </p>
            <div className="mt-3 flex justify-center gap-1.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  className="press grid size-10 place-items-center rounded-xl border border-line bg-surface"
                >
                  <Star className="size-5 text-muted" />
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="card p-5">
            <p className="text-label">Arriving in</p>
            <p className="mt-0.5">
              <span className="font-serif text-4xl font-medium text-accent">
                {order.etaMinutes}
              </span>{" "}
              <span className="text-2xl font-semibold">min</span>
            </p>

            {/* Stepper */}
            <ol className="mt-4 space-y-0">
              {TRACKING_STEPS.map((step, i) => {
                const done = i < current;
                const active = i === current;
                const last = i === TRACKING_STEPS.length - 1;
                return (
                  <li key={step.key} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <span
                        className={cn(
                          "grid size-6 shrink-0 place-items-center rounded-full border-2",
                          done && "border-green bg-green text-white",
                          active && "border-accent bg-accent-soft pulse-ring",
                          !done && !active && "border-line"
                        )}
                      >
                        {done ? (
                          <Check className="size-3.5" strokeWidth={3} />
                        ) : active ? (
                          <span className="size-2 rounded-full bg-accent" />
                        ) : null}
                      </span>
                      {!last ? (
                        <span
                          className={cn(
                            "my-0.5 w-0.5 flex-1 rounded-full",
                            done ? "bg-green" : "bg-line"
                          )}
                          style={{ minHeight: 22 }}
                        />
                      ) : null}
                    </div>
                    <div className={cn("pb-4", last && "pb-0")}>
                      <p
                        className={cn(
                          "text-[15px] font-semibold leading-tight",
                          !done && !active && "text-muted"
                        )}
                      >
                        {step.title}
                      </p>
                      <p className="text-xs text-muted">{step.sub}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        )}

        {/* Rider card */}
        {order.rider && !delivered ? (
          <div className="card flex items-center gap-3 p-4">
            <span className="grid size-12 place-items-center rounded-full bg-surface-2 text-lg font-bold text-ink">
              {order.rider.name.charAt(0)}
            </span>
            <div className="flex-1">
              <p className="text-[15px] font-bold">{order.rider.name}</p>
              <p className="flex items-center gap-1 text-xs text-muted">
                <Star className="size-3 fill-green text-green" />
                {order.rider.rating} · {order.rider.vehicle}
              </p>
            </div>
            <button
              aria-label="Message rider"
              className="press grid size-11 place-items-center rounded-full border border-line bg-surface text-ink"
            >
              <MessageCircle className="size-5" />
            </button>
            <button
              aria-label="Call rider"
              className="press grid size-11 place-items-center rounded-full bg-accent text-white shadow-[var(--glow-accent)]"
            >
              <Phone className="size-5" />
            </button>
          </div>
        ) : null}

        {/* Order items */}
        <div className="card p-4">
          <h2 className="text-label mb-3">Your order</h2>
          <ul className="space-y-2 text-sm">
            {order.lines.map((l) => (
              <li key={l.itemId} className="flex justify-between">
                <span className="text-muted">
                  {l.qty}× <span className="text-ink">{l.name}</span>
                </span>
                <span className="text-data">{formatINR(l.price * l.qty)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex justify-between border-t border-dashed border-line pt-3">
            <span className="font-bold">Total {delivered ? "paid" : "(Cash)"}</span>
            <span className="text-data text-base font-bold">
              {formatINR(order.total)}
            </span>
          </div>
        </div>

        <button className="press flex w-full items-center justify-center gap-2 rounded-full border border-line bg-surface py-3.5 text-sm font-semibold text-muted">
          <CircleHelp className="size-4" /> Get help with this order
        </button>
      </div>
    </>
  );
}
