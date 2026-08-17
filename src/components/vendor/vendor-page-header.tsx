"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { StatCard } from "@/components/roles/role-ui";
import { VendorHero } from "@/components/vendor/vendor-ui";
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
  return <VendorHero title={title} subtitle={subtitle} action={action} />;
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
          ? "grid-cols-2 @3xl:grid-cols-4"
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
      className="sticky top-[var(--vendor-top-offset,52px)] z-20 -mx-1 min-w-0 @3xl:static @3xl:mx-0"
      role="tablist"
    >
      <div
        ref={containerRef}
        className={cn(
          "vendor-segment relative gap-0.5",
          tabs.length >= 5
            ? "flex overflow-x-auto no-scrollbar px-1"
            : "grid",
          tabs.length === 2 && "grid-cols-2",
          tabs.length === 3 && "grid-cols-3",
          tabs.length === 4 && "grid-cols-4"
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
                tabs.length >= 5 && "min-w-[4.5rem] shrink-0 flex-1",
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
