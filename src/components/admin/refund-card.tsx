"use client";

import { useState, useTransition } from "react";
import { Check, X, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Pill } from "@/components/roles/role-ui";
import { formatINR } from "@/lib/utils/format";
import { decideRefundAction } from "@/app/admin/actions";
import type { RefundRow } from "@/lib/data-access/refunds";
import { shortOrderId } from "@/lib/utils/order-map";

/** One refund. Approve/Deny hit the database — see app/admin/actions.ts. */
export function RefundCard({ refund: r }: { refund: RefundRow }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const decide = (decision: "approved" | "rejected") =>
    startTransition(async () => {
      setError(null);
      const result = await decideRefundAction(r.id, decision);
      if (!result.ok) setError(result.error ?? "Failed");
    });

  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-data font-semibold">
            {shortOrderId(r.orderId)}
            {r.customerName ? (
              <span className="text-sm font-normal text-muted">
                {" "}
                · {r.customerName}
              </span>
            ) : null}
          </p>
          <p className="mt-0.5 truncate text-sm text-muted">
            {r.reason ?? "No reason given"}
            {r.restaurantName ? ` · ${r.restaurantName}` : ""}
          </p>
        </div>
        <span className="text-data shrink-0 font-semibold">
          {formatINR(r.amount)}
        </span>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 border-t border-line pt-3">
        {error ? (
          <span className="text-xs font-semibold text-deal">{error}</span>
        ) : (
          <span className="text-xs text-muted">
            {r.status === "pending"
              ? "Awaiting a decision"
              : "Decision recorded"}
          </span>
        )}

        {r.status !== "pending" ? (
          <Pill tone={r.status === "approved" ? "green" : "muted"}>
            {r.status === "approved" ? "Approved" : "Denied"}
          </Pill>
        ) : (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() => decide("rejected")}
            >
              <X className="size-4" /> Deny
            </Button>
            <Button size="sm" disabled={pending} onClick={() => decide("approved")}>
              {pending ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <Check className="size-4" />
              )}
              Approve
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
