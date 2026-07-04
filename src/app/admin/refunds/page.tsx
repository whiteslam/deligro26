"use client";

import { useState } from "react";
import { AlertTriangle, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionTitle, Pill } from "@/components/roles/role-ui";
import { formatINR } from "@/lib/utils/format";
import { REFUND_QUEUE, type RefundRow } from "@/lib/roles-data";

type Decision = "approved" | "denied";

export default function AdminRefundsPage() {
  const [queue] = useState<RefundRow[]>(REFUND_QUEUE);
  const [decided, setDecided] = useState<Record<string, Decision>>({});

  function decide(code: string, decision: Decision) {
    setDecided((d) => ({ ...d, [code]: decision }));
  }

  const pending = queue.filter((r) => !decided[r.code]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-heading">Refund queue</h1>
        <p className="text-sm text-muted">
          Approvals are logged, capped by policy limits, and reversible only via
          audit.
        </p>
      </div>

      <SectionTitle right={<Pill tone="accent">{pending.length} pending</Pill>}>
        Requests
      </SectionTitle>

      <div className="space-y-3">
        {queue.map((r) => {
          const decision = decided[r.code];
          return (
            <div
              key={r.code}
              className={`card p-4 ${
                r.flagged ? "border-l-4 border-l-accent" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-data font-semibold">
                    {r.code}{" "}
                    <span className="text-sm font-normal text-muted">
                      · {r.customer}
                    </span>
                  </p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted">
                    {r.flagged ? (
                      <AlertTriangle className="size-3.5 text-accent" />
                    ) : null}
                    {r.reason}
                  </p>
                </div>
                <span className="text-data shrink-0 font-semibold">
                  {formatINR(r.amount)}
                </span>
              </div>

              <div className="mt-3 flex items-center justify-between gap-3 border-t border-line pt-3">
                {r.flagged ? (
                  <span className="text-xs font-semibold text-accent">
                    Flagged — review before approving
                  </span>
                ) : (
                  <span className="text-xs text-muted">
                    Within auto-approve limit
                  </span>
                )}
                {decision ? (
                  <Pill tone={decision === "approved" ? "green" : "muted"}>
                    {decision === "approved" ? "Approved · logged" : "Denied"}
                  </Pill>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => decide(r.code, "denied")}
                    >
                      <X className="size-4" /> Deny
                    </Button>
                    <Button size="sm" onClick={() => decide(r.code, "approved")}>
                      <Check className="size-4" /> Approve
                    </Button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
