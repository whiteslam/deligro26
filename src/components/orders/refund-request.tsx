"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatINR } from "@/lib/utils/format";

/**
 * "Request a refund" on a finished order.
 *
 * The refunds table has been in the schema since 0001 with a policy letting a
 * customer request one, and until now nothing in the app ever called it — the
 * admin queue could only ever be empty because there was no way to ask. This is
 * the ask.
 *
 * The amount is not here on purpose. The server reads it from `orders.total`;
 * this component knows the total only so it can tell the customer what they are
 * asking for. `paid` changes the words, not the offer: a cash order is just as
 * refundable, it is simply settled by a person rather than by the gateway, and
 * saying so up front is the difference between a wait and a complaint.
 */
export function RefundRequest({
  orderId,
  orderTotal,
  paid,
}: {
  orderId: string;
  orderTotal: number;
  paid: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Set when this session made the request AND when the server says one is
  // already open — the second is how the button stays disabled across a reload,
  // since the answer lives on the server rather than in a prop.
  const [requested, setRequested] = useState(false);

  async function submit() {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/refunds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, reason: reason.trim() || undefined }),
      });

      if (res.ok) {
        setRequested(true);
        setOpen(false);
        router.refresh();
        return;
      }

      const data = (await res.json().catch(() => ({}))) as { error?: string };

      // Already open is not a failure — it is the state the button was trying
      // to reach, so show it rather than an error the customer can't act on.
      if (data.error === "already_requested") {
        setRequested(true);
        setOpen(false);
        return;
      }

      setError(
        res.status === 429
          ? "Too many requests. Wait a moment and try again."
          : data.error === "invalid_state"
            ? "Refunds can only be requested once an order is delivered or cancelled."
            : data.error === "not_found"
              ? "We couldn't find this order."
              : data.error === "unauthorized"
                ? "Your session expired. Sign in and try again."
                : "Couldn't send the request. Try again."
      );
    } finally {
      setBusy(false);
    }
  }

  if (requested) {
    return (
      <p className="flex w-full items-center justify-center gap-2 rounded-full border border-line bg-surface py-3.5 text-sm font-bold text-muted">
        <Check className="size-4 text-green" />
        Refund requested · we&apos;re reviewing it
      </p>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="press flex w-full items-center justify-center gap-2 rounded-full border border-line bg-surface py-3.5 text-sm font-bold text-ink"
      >
        <RotateCcw className="size-4" /> Request a refund
      </button>

      {open ? (
        // `fixed` so it covers the phone screen rather than the scrolled page
        // it's rendered inside — the app shell is the containing block.
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            aria-label="Close"
            onClick={() => setOpen(false)}
            className="animate-fade-in absolute inset-0 bg-ink/40"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="refund-request-title"
            className="bolt-sheet animate-sheet-in absolute inset-x-0 bottom-0 p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]"
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 id="refund-request-title" className="text-heading">
                Request a refund
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="press grid size-9 place-items-center rounded-full bg-surface-2 text-muted"
              >
                <X className="size-5" />
              </button>
            </div>

            <p className="text-sm leading-relaxed text-muted">
              We&apos;ll review your request for the full order —{" "}
              <span className="text-data font-semibold text-ink">
                {formatINR(orderTotal)}
              </span>
              .{" "}
              {paid
                ? "If it's approved the money goes back to however you paid."
                : "This order was paid in cash, so an approved refund is settled by our team directly rather than through the app."}
            </p>

            <label
              htmlFor="refund-reason"
              className="mt-4 block text-xs font-semibold text-muted"
            >
              What went wrong?
            </label>
            <textarea
              id="refund-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder="Missing items, food arrived cold, never delivered…"
              className="mt-1.5 w-full resize-none rounded-xl bg-surface-2 px-3.5 py-3 text-[15px] outline-none focus:ring-2 focus:ring-accent/30"
            />

            {error ? <p className="mt-2 text-sm text-deal">{error}</p> : null}

            <Button
              className="mt-4 w-full"
              disabled={busy || reason.trim().length === 0}
              onClick={submit}
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : "Send request"}
            </Button>
          </div>
        </div>
      ) : null}
    </>
  );
}
