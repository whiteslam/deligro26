"use client";

import { useEffect, useState } from "react";
import { Check, X, ChefHat, Bell, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatCard, SectionTitle, Pill } from "@/components/roles/role-ui";
import { AutoRefresh } from "@/components/shared/auto-refresh";
import { formatINR } from "@/lib/utils/format";
import type { KitchenOrder } from "@/lib/roles-data";

function OrderCard({
  order,
  children,
}: {
  order: KitchenOrder;
  children: React.ReactNode;
}) {
  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-data font-semibold">{order.code}</p>
          <p className="text-sm text-muted">
            {order.customer} · {order.area}
          </p>
        </div>
        <span className="flex items-center gap-1 text-xs text-muted">
          <Clock className="size-3.5" /> {order.placedAgo}
        </span>
      </div>

      <ul className="mt-3 space-y-1.5 border-t border-line pt-3">
        {order.lines.map((l, i) => (
          <li key={i} className="flex justify-between text-sm">
            <span>
              <span className="text-data text-muted">{l.qty}×</span> {l.name}
            </span>
            <span className="text-data text-muted">
              {formatINR(l.price * l.qty)}
            </span>
          </li>
        ))}
      </ul>

      {order.note ? (
        <p className="mt-2 rounded-lg bg-surface-2 px-3 py-2 text-xs text-muted">
          Note: {order.note}
        </p>
      ) : null}

      <div className="mt-3 flex items-center justify-between gap-3 border-t border-line pt-3">
        <span className="text-data font-semibold">{formatINR(order.total)}</span>
        <div className="flex gap-2">{children}</div>
      </div>
    </div>
  );
}

export function VendorOrdersBoard({
  initialIncoming,
  initialPreparing,
  live,
}: {
  initialIncoming: KitchenOrder[];
  initialPreparing: KitchenOrder[];
  live: boolean;
}) {
  const [incoming, setIncoming] = useState(initialIncoming);
  const [preparing, setPreparing] = useState(initialPreparing);
  const [readyCount, setReadyCount] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);

  // When auto-refresh pulls fresh server data, adopt it as the source of truth
  // (new orders appear, accepted ones move) while keeping the local ready tally.
  useEffect(() => {
    if (live) {
      setIncoming(initialIncoming);
      setPreparing(initialPreparing);
    }
  }, [live, initialIncoming, initialPreparing]);

  async function patchStatus(
    order: KitchenOrder,
    status: "kitchen" | "ready" | "cancelled"
  ) {
    if (!live) {
      if (status === "kitchen") acceptLocal(order);
      else if (status === "cancelled") rejectLocal(order);
      else readyLocal(order);
      return;
    }

    setBusy(order.id);
    try {
      const res = await fetch(`/api/orders/${order.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) return;

      if (status === "kitchen") acceptLocal(order);
      else if (status === "cancelled") rejectLocal(order);
      else readyLocal(order);
    } finally {
      setBusy(null);
    }
  }

  function acceptLocal(o: KitchenOrder) {
    setIncoming((prev) => prev.filter((x) => x.id !== o.id));
    setPreparing((prev) => [o, ...prev]);
  }
  function rejectLocal(o: KitchenOrder) {
    setIncoming((prev) => prev.filter((x) => x.id !== o.id));
  }
  function readyLocal(o: KitchenOrder) {
    setPreparing((prev) => prev.filter((x) => x.id !== o.id));
    setReadyCount((c) => c + 1);
  }

  const revenue =
    preparing.reduce((s, o) => s + o.total, 0) +
    incoming.reduce((s, o) => s + o.total, 0);

  return (
    <div className="space-y-6">
      {live ? <AutoRefresh interval={4000} /> : null}
      <div>
        <h1 className="text-heading">Live orders</h1>
        <p className="text-sm text-muted">
          You only see orders for your restaurant.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="New" value={String(incoming.length)} tone="accent" />
        <StatCard label="Preparing" value={String(preparing.length)} />
        <StatCard label="Ready today" value={String(readyCount)} tone="green" />
        <StatCard label="In pipeline" value={formatINR(revenue)} />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <section>
          <SectionTitle right={<Pill tone="accent">{incoming.length}</Pill>}>
            New orders
          </SectionTitle>
          {incoming.length === 0 ? (
            <p className="card p-4 text-sm text-muted">
              No new orders. New tickets appear here in real time.
            </p>
          ) : (
            <div className="space-y-3">
              {incoming.map((o) => (
                <OrderCard key={o.id} order={o}>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={busy === o.id}
                    onClick={() => patchStatus(o, "cancelled")}
                  >
                    <X className="size-4" /> Reject
                  </Button>
                  <Button
                    size="sm"
                    disabled={busy === o.id}
                    onClick={() => patchStatus(o, "kitchen")}
                  >
                    <Check className="size-4" /> Accept
                  </Button>
                </OrderCard>
              ))}
            </div>
          )}
        </section>

        <section>
          <SectionTitle right={<Pill tone="muted">{preparing.length}</Pill>}>
            Preparing
          </SectionTitle>
          {preparing.length === 0 ? (
            <p className="card p-4 text-sm text-muted">
              Accepted orders move here. Tap “Food ready” when packed.
            </p>
          ) : (
            <div className="space-y-3">
              {preparing.map((o) => (
                <OrderCard key={o.id} order={o}>
                  <Button
                    size="sm"
                    disabled={busy === o.id}
                    onClick={() => patchStatus(o, "ready")}
                  >
                    <Bell className="size-4" /> Food ready
                  </Button>
                </OrderCard>
              ))}
            </div>
          )}
        </section>
      </div>

      <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted">
        <ChefHat className="size-3.5" /> Enable MFA on restaurant accounts — they
        can accept orders and change payouts.
      </p>
    </div>
  );
}
