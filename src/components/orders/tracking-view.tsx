"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Phone, Check, MessageCircle, CircleHelp, Star, ShieldCheck, XCircle, Loader2 } from "lucide-react";
import type { Order } from "@/types";
import { PageHeader } from "@/components/layout/page-header";
import { AutoRefresh } from "@/components/shared/auto-refresh";
import { TRACKING_STEPS, statusIndex } from "@/lib/utils/order-status";
import { shortOrderId } from "@/lib/utils/order-map";
import { formatINR } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

export function TrackingView({
  order,
  deliveryOtp,
}: {
  order: Order;
  deliveryOtp?: string | null;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const justPlaced = params.get("placed") === "1";
  const [toast, setToast] = useState(justPlaced);

  const [cancelBusy, setCancelBusy] = useState(false);
  const [cancelMsg, setCancelMsg] = useState<string | null>(null);
  const [rating, setRating] = useState(0);
  const [rateBusy, setRateBusy] = useState(false);
  const [rated, setRated] = useState(false);

  const current = statusIndex(order.status);
  const delivered = order.status === "DELIVERED";
  const cancelled = order.status === "CANCELLED";
  const canCancel = order.status === "PLACED" || order.status === "KITCHEN";
  const isUuid = /^[0-9a-f-]{36}$/i.test(order.id);

  useEffect(() => {
    if (!justPlaced) return;
    const t = window.setTimeout(() => setToast(false), 2600);
    return () => window.clearTimeout(t);
  }, [justPlaced]);

  async function cancelOrder() {
    setCancelBusy(true);
    setCancelMsg(null);
    try {
      const res = await fetch(`/api/orders/${order.id}/cancel`, { method: "POST" });
      if (res.ok) {
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        setCancelMsg(data.error === "too_late" ? "The kitchen already started — can't cancel now." : "Could not cancel. Try again.");
      }
    } finally {
      setCancelBusy(false);
    }
  }

  async function submitRating(n: number) {
    if (!isUuid) return; // mock order, nothing to persist
    setRating(n);
    setRateBusy(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.id, rating: n }),
      });
      if (res.ok) setRated(true);
    } finally {
      setRateBusy(false);
    }
  }

  const headline = delivered
    ? "Delivered"
    : cancelled
      ? "Cancelled"
      : order.etaMinutes
        ? `${order.etaMinutes} min`
        : "Arriving";

  return (
    <>
      {isUuid && !delivered && !cancelled ? <AutoRefresh interval={5000} /> : null}

      {/* Placed toast */}
      {toast ? (
        <div className="animate-slide-up glass fixed left-1/2 top-4 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full px-4 py-2.5 shadow-[var(--shadow-md)]">
          <span className="grid size-6 place-items-center rounded-full bg-green text-white">
            <Check className="size-4" strokeWidth={3} />
          </span>
          <span className="text-sm font-bold">Order placed</span>
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
          style={{ background: "linear-gradient(135deg,#e6f4ec,#eef1f2)" }}
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

      {/* Solid sheet floats over the map */}
      <div className="relative -mt-6 space-y-4 rounded-t-[var(--radius-sheet)] bg-bg px-4 pt-6">
        {/* Grab handle */}
        <span className="mx-auto -mt-2 mb-1 block h-1 w-10 rounded-full bg-line" />

        {/* Headline: estimated time / status */}
        <div className="text-center">
          <p className="text-sm text-muted">
            {delivered
              ? "Your order was delivered"
              : cancelled
                ? "This order was cancelled"
                : "Estimated time of delivery"}
          </p>
          <p
            className={cn(
              "text-[40px] font-extrabold leading-none tracking-tight",
              delivered && "text-green",
              cancelled && "text-deal"
            )}
          >
            {headline}
          </p>
        </div>

        {delivered ? (
          <div className="rounded-2xl bg-green-soft p-5 text-center">
            <p className="text-[15px] font-bold">
              {rated ? "Thanks for rating!" : "Hope it was delicious. How was it?"}
            </p>
            <div className="mt-3 flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  disabled={rateBusy || rated || !isUuid}
                  onClick={() => submitRating(n)}
                  aria-label={`Rate ${n} star${n > 1 ? "s" : ""}`}
                  className="press grid size-11 place-items-center rounded-full bg-surface disabled:opacity-100"
                >
                  <Star
                    className={cn(
                      "size-5",
                      n <= rating ? "fill-pop text-pop" : "text-muted"
                    )}
                  />
                </button>
              ))}
            </div>
          </div>
        ) : cancelled ? null : (
          /* Bolt-style vertical timeline */
          <ol className="pl-1">
            {TRACKING_STEPS.map((step, i) => {
              const done = i < current;
              const active = i === current;
              const last = i === TRACKING_STEPS.length - 1;
              return (
                <li key={step.key} className="flex gap-3.5">
                  <div className="flex flex-col items-center">
                    <span
                      className={cn(
                        "grid size-6 shrink-0 place-items-center rounded-full border-2",
                        done && "border-green bg-green text-white",
                        active && "border-green bg-surface",
                        !done && !active && "border-line bg-surface"
                      )}
                    >
                      {done ? (
                        <Check className="size-3.5" strokeWidth={3} />
                      ) : active ? (
                        <span className="size-2.5 rounded-full bg-green" />
                      ) : null}
                    </span>
                    {!last ? (
                      <span
                        className={cn(
                          "my-1 w-0.5 flex-1 rounded-full",
                          done ? "bg-green" : "bg-line"
                        )}
                        style={{ minHeight: 26 }}
                      />
                    ) : null}
                  </div>
                  <div className={cn("pb-5", last && "pb-0")}>
                    <p
                      className={cn(
                        "text-[15px] font-bold leading-tight",
                        !done && !active && "text-muted"
                      )}
                    >
                      {step.title}
                    </p>
                    <p className="mt-0.5 text-xs text-muted">{step.sub}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        )}

        {/* Delivery handover code */}
        {deliveryOtp && !delivered && !cancelled ? (
          <div className="flex items-center gap-3 rounded-2xl bg-accent-soft p-4">
            <span className="grid size-10 place-items-center rounded-xl bg-accent text-white">
              <ShieldCheck className="size-5" />
            </span>
            <div className="flex-1">
              <p className="text-label !text-accent-ink">Delivery code</p>
              <p className="text-xs text-muted">Share with your rider at the door</p>
            </div>
            <span className="text-data text-2xl font-extrabold tracking-[0.3em] text-accent-ink">
              {deliveryOtp}
            </span>
          </div>
        ) : null}

        {/* Rider card */}
        {order.rider && !delivered && !cancelled ? (
          <div className="card flex items-center gap-3 p-4">
            <span className="grid size-12 place-items-center rounded-full bg-surface-2 text-lg font-extrabold text-ink">
              {order.rider.name.charAt(0)}
            </span>
            <div className="flex-1">
              <p className="text-[15px] font-bold">{order.rider.name}</p>
              <p className="flex items-center gap-1 text-xs text-muted">
                <Star className="size-3 fill-pop text-pop" />
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
          <h2 className="mb-3 text-[17px] font-extrabold tracking-tight">
            Order {shortOrderId(order.id)}
          </h2>
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
          <div className="mt-3 flex justify-between border-t border-line pt-3">
            <span className="font-extrabold">Total {delivered ? "paid" : "(Cash)"}</span>
            <span className="text-data text-base font-extrabold">
              {formatINR(order.total)}
            </span>
          </div>
        </div>

        {/* Cancel (only before the kitchen starts) */}
        {canCancel ? (
          <div className="space-y-1">
            <button
              onClick={cancelOrder}
              disabled={cancelBusy}
              className="press flex w-full items-center justify-center gap-2 rounded-full border border-line bg-surface py-3.5 text-sm font-bold text-deal disabled:opacity-60"
            >
              {cancelBusy ? <Loader2 className="size-4 animate-spin" /> : <XCircle className="size-4" />}
              Cancel order
            </button>
            {cancelMsg ? (
              <p className="rounded-xl bg-deal-soft px-3 py-2 text-center text-sm font-medium text-deal">
                {cancelMsg}
              </p>
            ) : null}
          </div>
        ) : null}

        <button className="press flex w-full items-center justify-center gap-2 rounded-full border border-line bg-surface py-3.5 text-sm font-bold text-ink">
          <CircleHelp className="size-4" /> Get help with this order
        </button>
      </div>
    </>
  );
}
