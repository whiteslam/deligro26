"use client";

import { useEffect, useState } from "react";
import {
  Bell,
  Check,
  ChefHat,
  ChevronDown,
  Clock,
  ClipboardList,
  ExternalLink,
  MapPin,
  Phone,
  Sparkles,
  User,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { VendorSegmentedTabs } from "@/components/vendor/vendor-page-header";
import { VendorOrderHistoryDialog } from "@/components/vendor/vendor-order-history-dialog";
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

function orderTitle(order: KitchenOrder): string {
  if (order.lines.length === 0) return "Order";
  if (order.lines.length === 1) return order.lines[0].name;
  return `${order.lines[0].name} +${order.lines.length - 1} more`;
}

function orderDescription(order: KitchenOrder): string {
  const first = order.lines[0];
  if (first?.description) return first.description;
  const customer = order.customerProfile?.name ?? order.customer;
  return `${customer} · ${order.area}`;
}

function ItemThumb({
  src,
  name,
  size = "md",
}: {
  src?: string | null;
  name: string;
  size?: "sm" | "md";
}) {
  const dim = size === "sm" ? "size-10" : "size-14";
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name}
        className={cn(dim, "shrink-0 rounded-xl object-cover")}
      />
    );
  }
  return (
    <span
      className={cn(
        dim,
        "grid shrink-0 place-items-center rounded-xl bg-surface-2 text-lg"
      )}
    >
      🍽️
    </span>
  );
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
  const first = order.lines[0];
  const title = orderTitle(order);
  const description = orderDescription(order);

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
        className="press flex w-full items-start gap-3 p-3 text-left sm:p-4"
      >
        <ItemThumb src={first?.imageUrl} name={title} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-data text-xs font-semibold text-muted">
              {order.code}
            </p>
            {variant === "new" ? (
              <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-bold uppercase text-accent">
                New
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 line-clamp-1 text-sm font-bold leading-snug">
            {title}
          </p>
          <p className="mt-0.5 line-clamp-2 text-xs text-muted">{description}</p>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3.5 shrink-0" />
              {order.placedAt || order.placedAgo}
            </span>
            <span className="text-data font-bold text-ink">
              {formatINR(order.total)}
            </span>
          </div>
        </div>
        <ChevronDown
          className={cn(
            "mt-1 size-4 shrink-0 text-muted transition-transform",
            open && "rotate-180"
          )}
        />
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
                className="flex items-start gap-3 rounded-xl border border-line bg-surface-2/60 p-2.5"
              >
                <ItemThumb src={l.imageUrl} name={l.name} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold leading-snug">
                      <span className="text-data text-accent">{l.qty}×</span>{" "}
                      {l.name}
                    </p>
                    <span className="text-data shrink-0 text-sm font-bold">
                      {formatINR(l.price * l.qty)}
                    </span>
                  </div>
                  {l.description ? (
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted">
                      {l.description}
                    </p>
                  ) : null}
                </div>
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

function HistoryOrderCard({
  order,
  statusTone,
}: {
  order: KitchenOrder;
  statusTone: "cancelled" | "done";
}) {
  const [open, setOpen] = useState(false);
  const first = order.lines[0];
  const title = orderTitle(order);
  const description =
    first?.description?.trim() ||
    `${order.customerProfile?.name ?? order.customer} · ${order.area}`;

  return (
    <article className="vendor-order-card flex h-full flex-col overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="press flex w-full items-start gap-3 p-3 text-left"
      >
        <ItemThumb src={first?.imageUrl} name={title} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-data text-xs font-semibold text-muted">
              {order.code}
            </span>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                statusTone === "cancelled"
                  ? "bg-red-500/10 text-red-500"
                  : "bg-green/15 text-green"
              )}
            >
              {statusTone === "cancelled"
                ? "Cancelled"
                : statusLabel(order.status ?? "delivered")}
            </span>
          </div>
          <p className="mt-1 line-clamp-1 text-sm font-bold leading-snug">
            {title}
          </p>
          <p className="mt-0.5 line-clamp-2 text-xs text-muted">{description}</p>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1 text-xs text-muted">
              <Clock className="size-3.5 shrink-0" />
              {order.placedAt || order.placedAgo}
            </span>
            <span className="text-data text-sm font-bold">
              {formatINR(order.total)}
            </span>
          </div>
        </div>
        <ChevronDown
          className={cn(
            "mt-1 size-4 shrink-0 text-muted transition-transform",
            open && "rotate-180"
          )}
        />
      </button>

      {open ? (
        <div className="border-t border-line px-3 pb-3">
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
                className="flex items-start gap-3 rounded-xl border border-line bg-surface-2/60 p-2.5"
              >
                <ItemThumb src={l.imageUrl} name={l.name} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold leading-snug">
                      <span className="text-data text-accent">{l.qty}×</span>{" "}
                      {l.name}
                    </p>
                    <span className="text-data shrink-0 text-sm font-bold">
                      {formatINR(l.price * l.qty)}
                    </span>
                  </div>
                  {l.description ? (
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted">
                      {l.description}
                    </p>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </article>
  );
}

function HistoryList({
  orders,
  empty,
  statusTone,
  onViewAll,
}: {
  orders: KitchenOrder[];
  empty: string;
  statusTone: "cancelled" | "done";
  onViewAll?: () => void;
}) {
  if (orders.length === 0) {
    return (
      <div className="space-y-3">
        <VendorEmptyState
          icon={ClipboardList}
          title="Nothing here yet"
          description={empty}
        />
        {onViewAll ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full"
            onClick={onViewAll}
          >
            <ExternalLink className="size-4" /> View full history
          </Button>
        ) : null}
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {orders.map((o) => (
          <HistoryOrderCard key={o.id} order={o} statusTone={statusTone} />
        ))}
      </div>
      {onViewAll ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full"
          onClick={onViewAll}
        >
          <ExternalLink className="size-4" /> View all
        </Button>
      ) : null}
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
  const [historyDialog, setHistoryDialog] = useState<
    null | "cancelled" | "completed"
  >(null);

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
            onViewAll={() => setHistoryDialog("cancelled")}
          />
        ) : null}
        {mobileTab === "done" && live ? (
          <HistoryList
            orders={recent}
            empty="No delivered orders yet."
            statusTone="done"
            onViewAll={() => setHistoryDialog("completed")}
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
          <VendorPanel
            title="Cancelled"
            accent="red"
            action={
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setHistoryDialog("cancelled")}
              >
                View all
              </Button>
            }
          >
            <HistoryList
              orders={cancelled}
              empty="Rejected orders stay in the database."
              statusTone="cancelled"
            />
          </VendorPanel>
          <VendorPanel
            title="Completed"
            accent="green"
            action={
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setHistoryDialog("completed")}
              >
                View all
              </Button>
            }
          >
            <HistoryList
              orders={recent}
              empty="No delivered orders yet."
              statusTone="done"
            />
          </VendorPanel>
        </div>
      ) : null}

      {historyDialog ? (
        <VendorOrderHistoryDialog
          open
          kind={historyDialog}
          onClose={() => setHistoryDialog(null)}
        />
      ) : null}
    </div>
  );
}
