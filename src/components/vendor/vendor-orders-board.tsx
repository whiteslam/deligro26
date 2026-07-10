"use client";

import { useEffect, useState } from "react";
import {
  Bell,
  Check,
  ChefHat,
  ChevronDown,
  Clock,
  ClipboardList,
  MapPin,
  Phone,
  Sparkles,
  User,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { VendorSegmentedTabs } from "@/components/vendor/vendor-page-header";
import { AutoRefresh } from "@/components/shared/auto-refresh";
import {
  VendorEmptyState,
  VendorHero,
  VendorKanbanColumn,
  VendorMetricCard,
  VendorPanel,
} from "@/components/vendor/vendor-ui";
import { formatINR } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import type { KitchenOrder } from "@/lib/roles-data";

type OrderTab = "new" | "prep" | "cancelled" | "done";

function statusLabel(status: string) {
  if (status === "delivered") return "Delivered";
  if (status === "cancelled") return "Cancelled";
  if (status === "on_the_way") return "On the way";
  return status;
}

function OrderCard({
  order,
  variant = "default",
  children,
}: {
  order: KitchenOrder;
  variant?: "new" | "default";
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(variant === "new");

  return (
    <article
      className={cn(
        "vendor-order-card overflow-hidden",
        variant === "new" && "vendor-order-card--new"
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="press flex w-full items-start justify-between gap-3 p-3 text-left sm:p-4"
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-data font-bold">{order.code}</p>
            {variant === "new" ? (
              <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-bold uppercase text-accent">
                New
              </span>
            ) : null}
          </div>
          <p className="mt-1 flex items-center gap-1 text-sm text-muted">
            <Clock className="size-3.5 shrink-0" /> {order.placedAgo}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-data text-base font-bold">
            {formatINR(order.total)}
          </span>
          <ChevronDown
            className={cn(
              "size-4 text-muted transition-transform",
              open && "rotate-180"
            )}
          />
        </div>
      </button>

      {open ? (
        <div className="border-t border-line px-3 pb-3 sm:px-4 sm:pb-4">
          <div className="mt-3 flex gap-3 rounded-xl bg-surface-2 p-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent/15 text-sm font-bold text-accent">
              {order.customerProfile?.initials ??
                order.customer.slice(0, 2).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1 space-y-1">
              <p className="flex items-center gap-1.5 text-sm font-semibold">
                <User className="size-3.5 text-muted" />
                {order.customerProfile?.name ?? order.customer}
              </p>
              {order.customerProfile?.phone ? (
                <a
                  href={`tel:${order.customerProfile.phone.replace(/\s/g, "")}`}
                  className="flex items-center gap-1.5 text-sm text-accent"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Phone className="size-3.5" />
                  {order.customerProfile.phone}
                </a>
              ) : null}
              <p className="flex items-start gap-1.5 text-xs text-muted">
                <MapPin className="mt-0.5 size-3.5 shrink-0" />
                <span className="line-clamp-2">{order.area}</span>
              </p>
            </div>
          </div>

          <ul className="mt-3 space-y-2">
            {order.lines.map((l, i) => (
              <li
                key={i}
                className="flex justify-between gap-3 rounded-lg bg-surface-2/80 px-3 py-2 text-sm"
              >
                <span>
                  <span className="text-data font-semibold text-accent">
                    {l.qty}×
                  </span>{" "}
                  {l.name}
                </span>
                <span className="text-data text-muted">
                  {formatINR(l.price * l.qty)}
                </span>
              </li>
            ))}
          </ul>

          {order.note ? (
            <p className="mt-2 rounded-lg border border-line bg-surface-2 px-3 py-2 text-xs text-muted">
              Note: {order.note}
            </p>
          ) : null}

          <div className="mt-3 grid grid-cols-2 gap-2">{children}</div>
        </div>
      ) : null}
    </article>
  );
}

function IncomingList({
  orders,
  busy,
  onPatch,
}: {
  orders: KitchenOrder[];
  busy: string | null;
  onPatch: (o: KitchenOrder, s: "kitchen" | "ready" | "cancelled") => void;
}) {
  if (orders.length === 0) {
    return (
      <VendorEmptyState
        icon={Sparkles}
        title="All caught up"
        description="New orders will appear here instantly with a sound-free pulse."
      />
    );
  }
  return (
    <div className="space-y-3">
      {orders.map((o) => (
        <OrderCard key={o.id} order={o} variant="new">
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            disabled={busy === o.id}
            onClick={() => onPatch(o, "cancelled")}
          >
            <X className="size-4" /> Reject
          </Button>
          <Button
            size="sm"
            className="w-full"
            disabled={busy === o.id}
            onClick={() => onPatch(o, "kitchen")}
          >
            <Check className="size-4" /> Accept
          </Button>
        </OrderCard>
      ))}
    </div>
  );
}

function PreparingList({
  orders,
  busy,
  onPatch,
}: {
  orders: KitchenOrder[];
  busy: string | null;
  onPatch: (o: KitchenOrder, s: "kitchen" | "ready" | "cancelled") => void;
}) {
  if (orders.length === 0) {
    return (
      <VendorEmptyState
        icon={ChefHat}
        title="Kitchen clear"
        description="Accepted orders land here until you mark them ready."
      />
    );
  }
  return (
    <div className="space-y-3">
      {orders.map((o) => (
        <OrderCard key={o.id} order={o}>
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            disabled={busy === o.id}
            onClick={() => onPatch(o, "cancelled")}
          >
            <X className="size-4" /> Cancel
          </Button>
          <Button
            size="sm"
            className="w-full"
            disabled={busy === o.id}
            onClick={() => onPatch(o, "ready")}
          >
            <Bell className="size-4" /> Ready
          </Button>
        </OrderCard>
      ))}
    </div>
  );
}

function HistoryList({
  orders,
  empty,
  statusTone,
}: {
  orders: KitchenOrder[];
  empty: string;
  statusTone: "cancelled" | "done";
}) {
  if (orders.length === 0) {
    return (
      <VendorEmptyState
        icon={ClipboardList}
        title="Nothing here yet"
        description={empty}
      />
    );
  }
  return (
    <div className="space-y-3">
      {orders.map((o) => (
        <OrderCard key={o.id} order={o}>
          <span
            className={cn(
              "col-span-2 text-center text-xs font-bold uppercase tracking-wide",
              statusTone === "cancelled" ? "text-red-500" : "text-green"
            )}
          >
            {statusTone === "cancelled"
              ? "Cancelled"
              : statusLabel(o.status ?? "delivered")}
          </span>
        </OrderCard>
      ))}
    </div>
  );
}

export function VendorOrdersBoard({
  initialIncoming,
  initialPreparing,
  initialRecent = [],
  initialCancelled = [],
  live,
  restaurantName,
}: {
  initialIncoming: KitchenOrder[];
  initialPreparing: KitchenOrder[];
  initialRecent?: KitchenOrder[];
  initialCancelled?: KitchenOrder[];
  live: boolean;
  restaurantName?: string;
}) {
  const [incoming, setIncoming] = useState(initialIncoming);
  const [preparing, setPreparing] = useState(initialPreparing);
  const [recent, setRecent] = useState(initialRecent);
  const [cancelled, setCancelled] = useState(initialCancelled);
  const [readyCount, setReadyCount] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState<OrderTab>("new");

  useEffect(() => {
    if (live) {
      setIncoming(initialIncoming);
      setPreparing(initialPreparing);
      setRecent(initialRecent);
      setCancelled(initialCancelled);
    }
  }, [live, initialIncoming, initialPreparing, initialRecent, initialCancelled]);

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
    setMobileTab("prep");
  }
  function rejectLocal(o: KitchenOrder) {
    setIncoming((prev) => prev.filter((x) => x.id !== o.id));
    setPreparing((prev) => prev.filter((x) => x.id !== o.id));
    setCancelled((prev) => [{ ...o, status: "cancelled" }, ...prev]);
    setMobileTab("cancelled");
  }
  function readyLocal(o: KitchenOrder) {
    setPreparing((prev) => prev.filter((x) => x.id !== o.id));
    setReadyCount((c) => c + 1);
  }

  const mobileTabs: { id: OrderTab; label: string; count: number }[] = [
    { id: "new", label: "New", count: incoming.length },
    { id: "prep", label: "Prep", count: preparing.length },
    ...(live
      ? [
          { id: "cancelled" as const, label: "Cancelled", count: cancelled.length },
          { id: "done" as const, label: "Done", count: recent.length },
        ]
      : []),
  ];

  const maxQueue = Math.max(incoming.length, preparing.length, readyCount, 1);

  return (
    <div className="space-y-4 lg:space-y-6">
      {live ? <AutoRefresh interval={4000} /> : null}

      <VendorHero
        live={live}
        title="Live orders"
        subtitle={
          restaurantName
            ? `Managing ${restaurantName} — accept, prep, and dispatch.`
            : "Your restaurant order board."
        }
      />

      <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
        <VendorMetricCard
          label="New"
          value={String(incoming.length)}
          icon="sparkles"
          tone="accent"
          barPct={(incoming.length / maxQueue) * 100}
        />
        <VendorMetricCard
          label="Preparing"
          value={String(preparing.length)}
          icon="chef"
          tone="blue"
          barPct={(preparing.length / maxQueue) * 100}
        />
        <VendorMetricCard
          label="Ready today"
          value={String(readyCount)}
          icon="bell"
          tone="green"
          barPct={(readyCount / maxQueue) * 100}
        />
        <VendorMetricCard
          label="Cancelled"
          value={String(cancelled.length)}
          icon="x"
          tone="muted"
          barPct={(cancelled.length / maxQueue) * 100}
        />
      </div>

      <div className="space-y-4 lg:hidden">
        <VendorSegmentedTabs
          tabs={mobileTabs}
          active={mobileTab}
          onChange={setMobileTab}
        />
        {mobileTab === "new" ? (
          <IncomingList orders={incoming} busy={busy} onPatch={patchStatus} />
        ) : null}
        {mobileTab === "prep" ? (
          <PreparingList orders={preparing} busy={busy} onPatch={patchStatus} />
        ) : null}
        {mobileTab === "cancelled" && live ? (
          <HistoryList
            orders={cancelled}
            empty="Rejected orders stay here for your records."
            statusTone="cancelled"
          />
        ) : null}
        {mobileTab === "done" && live ? (
          <HistoryList
            orders={recent}
            empty="No delivered orders yet."
            statusTone="done"
          />
        ) : null}
      </div>

      <div className="hidden gap-4 lg:grid lg:grid-cols-2">
        <VendorKanbanColumn title="New orders" count={incoming.length} tone="accent">
          <IncomingList orders={incoming} busy={busy} onPatch={patchStatus} />
        </VendorKanbanColumn>
        <VendorKanbanColumn title="Preparing" count={preparing.length} tone="blue">
          <PreparingList orders={preparing} busy={busy} onPatch={patchStatus} />
        </VendorKanbanColumn>
      </div>

      {live ? (
        <div className="hidden gap-4 lg:grid lg:grid-cols-2">
          <VendorPanel title="Cancelled" accent="red">
            <HistoryList
              orders={cancelled}
              empty="Rejected orders stay in the database."
              statusTone="cancelled"
            />
          </VendorPanel>
          <VendorPanel title="Completed" accent="green">
            <HistoryList
              orders={recent}
              empty="No delivered orders yet."
              statusTone="done"
            />
          </VendorPanel>
        </div>
      ) : null}
    </div>
  );
}
