"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { StatCard } from "@/components/roles/role-ui";
import { cn } from "@/lib/utils/cn";

export function VendorPageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0 flex-1">
        <h1 className="text-xl font-bold tracking-tight md:text-heading">{title}</h1>
        {subtitle ? (
          <p className="mt-0.5 line-clamp-2 text-sm text-muted">{subtitle}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function VendorStatGrid({
  items,
  columns = 2,
}: {
  items: {
    label: string;
    value: string;
    tone?: "accent" | "green" | "muted";
    delta?: string;
    deltaTone?: "accent" | "green" | "muted";
  }[];
  columns?: 2 | 4;
}) {
  return (
    <div
      className={cn(
        "grid gap-2 sm:gap-3",
        columns === 4
          ? "grid-cols-2 lg:grid-cols-4"
          : "grid-cols-2"
      )}
    >
      {items.map((item) => (
        <StatCard
          key={item.label}
          label={item.label}
          value={item.value}
          tone={item.tone}
          delta={item.delta}
          deltaTone={item.deltaTone}
          compact
        />
      ))}
    </div>
  );
}

export function VendorSegmentedTabs<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: { id: T; label: string; count?: number }[];
  active: T;
  onChange: (id: T) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const activeBtn = container.querySelector<HTMLButtonElement>(
      `[data-tab-id="${active}"]`
    );
    if (!activeBtn) return;
    setIndicator({
      left: activeBtn.offsetLeft,
      width: activeBtn.offsetWidth,
    });
  }, [active, tabs]);

  return (
    <div
      className="sticky top-[var(--vendor-top-offset,52px)] z-20 md:static"
      role="tablist"
    >
      <div
        ref={containerRef}
        className={cn(
          "vendor-segment relative grid gap-0.5",
          tabs.length === 2 && "grid-cols-2",
          tabs.length === 3 && "grid-cols-3",
          tabs.length >= 4 && "grid-cols-4"
        )}
      >
        <span
          className="vendor-segment-indicator"
          style={{ left: indicator.left, width: indicator.width }}
          aria-hidden
        />
        {tabs.map((tab) => {
          const selected = active === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              data-tab-id={tab.id}
              aria-selected={selected}
              onClick={() => onChange(tab.id)}
              className={cn(
                "vendor-segment-btn press min-h-11 rounded-xl px-2 py-2 text-center text-xs font-semibold transition-colors sm:text-sm",
                selected ? "text-ink" : "text-muted hover:text-ink"
              )}
            >
              <span className="block truncate">{tab.label}</span>
              {tab.count !== undefined ? (
                <span
                  className={cn(
                    "mt-0.5 block text-[10px] font-bold",
                    selected ? "text-accent" : "text-muted"
                  )}
                >
                  {tab.count}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
