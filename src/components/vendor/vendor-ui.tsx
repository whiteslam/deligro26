"use client";

import {
  Bell,
  Calendar,
  ChefHat,
  IndianRupee,
  Layers,
  Package,
  PackageX,
  ShoppingBag,
  Sparkles,
  TrendingUp,
  UtensilsCrossed,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

const METRIC_ICONS = {
  utensils: UtensilsCrossed,
  package: Package,
  "package-x": PackageX,
  layers: Layers,
  wallet: Wallet,
  calendar: Calendar,
  trending: TrendingUp,
  rupee: IndianRupee,
  sparkles: Sparkles,
  chef: ChefHat,
  bell: Bell,
  x: X,
  shopping: ShoppingBag,
} as const satisfies Record<string, LucideIcon>;

export type VendorMetricIcon = keyof typeof METRIC_ICONS;

export function LivePulse({ className }: { className?: string }) {
  return (
    <span className={cn("relative flex size-2.5", className)}>
      <span className="absolute inline-flex size-full animate-ping rounded-full bg-green opacity-60" />
      <span className="relative inline-flex size-2.5 rounded-full bg-green" />
    </span>
  );
}

export function VendorHero({
  title,
  subtitle,
  badge,
  action,
  live,
}: {
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  action?: React.ReactNode;
  live?: boolean;
}) {
  return (
    <div className="vendor-hero relative overflow-hidden rounded-[var(--radius-sheet)] border border-line p-4 sm:p-5">
      <div className="vendor-hero-glow pointer-events-none absolute inset-0" />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            {live ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-green/15 px-2.5 py-1 text-[11px] font-bold text-green">
                <LivePulse />
                Live
              </span>
            ) : null}
            {badge}
          </div>
          <h1 className="text-display text-2xl font-bold tracking-tight sm:text-3xl">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-1.5 max-w-lg text-sm text-muted">{subtitle}</p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </div>
  );
}

const metricTones = {
  accent: {
    icon: "bg-accent/12 text-accent",
    bar: "bg-accent",
  },
  green: {
    icon: "bg-green/12 text-green",
    bar: "bg-green",
  },
  blue: {
    icon: "bg-blue/12 text-blue",
    bar: "bg-blue/80",
  },
  muted: {
    icon: "bg-surface-2 text-muted",
    bar: "bg-line",
  },
} as const;

export function VendorMetricCard({
  label,
  value,
  hint,
  icon,
  tone = "accent",
  barPct = 72,
  onClick,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: VendorMetricIcon;
  tone?: keyof typeof metricTones;
  barPct?: number;
  onClick?: () => void;
}) {
  const t = metricTones[tone];
  const Icon = METRIC_ICONS[icon];
  const Tag = onClick ? "button" : "div";

  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "vendor-metric group text-left",
        onClick && "press cursor-pointer hover:border-accent/30"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className={cn(
            "grid size-9 shrink-0 place-items-center rounded-xl transition-transform group-hover:scale-105",
            t.icon
          )}
        >
          <Icon className="size-4" />
        </span>
        {hint ? (
          <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-semibold text-muted">
            {hint}
          </span>
        ) : null}
      </div>
      <p className="text-data mt-3 text-xl font-bold tracking-tight">{value}</p>
      <p className="text-label mt-0.5">{label}</p>
      <div className="mt-3 h-1 overflow-hidden rounded-full bg-surface-2">
        <div
          className={cn("h-full rounded-full transition-all duration-700", t.bar)}
          style={{ width: `${Math.min(100, Math.max(8, barPct))}%` }}
        />
      </div>
    </Tag>
  );
}

export function VendorPanel({
  title,
  subtitle,
  action,
  children,
  className,
  accent,
}: {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  accent?: "accent" | "green" | "blue" | "muted" | "red";
}) {
  const accentBorder =
    accent === "green"
      ? "border-l-green"
      : accent === "blue"
        ? "border-l-blue"
        : accent === "muted"
          ? "border-l-line"
          : accent === "red"
            ? "border-l-red-500"
            : accent === "accent"
              ? "border-l-accent"
              : "";

  return (
    <section
      className={cn(
        "vendor-panel",
        accent && "border-l-4",
        accentBorder,
        className
      )}
    >
      {title ? (
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold">{title}</h2>
            {subtitle ? (
              <p className="mt-0.5 text-xs text-muted">{subtitle}</p>
            ) : null}
          </div>
          {action}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function VendorChip({
  active,
  children,
  onClick,
  count,
}: {
  active?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
  count?: number;
}) {
  const Tag = onClick ? "button" : "span";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "press inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all",
        active
          ? "border-accent bg-accent text-white shadow-[var(--glow-accent)]"
          : "border-line bg-surface text-muted hover:border-accent/40 hover:text-ink"
      )}
    >
      {children}
      {count !== undefined ? (
        <span
          className={cn(
            "grid min-w-5 place-items-center rounded-full px-1 text-[10px] font-bold",
            active ? "bg-white/20 text-white" : "bg-surface-2 text-muted"
          )}
        >
          {count}
        </span>
      ) : null}
    </Tag>
  );
}

export function VendorEmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="vendor-empty flex flex-col items-center justify-center px-4 py-10 text-center">
      <span className="mb-3 grid size-14 place-items-center rounded-2xl bg-surface-2 text-muted">
        <Icon className="size-7" />
      </span>
      <p className="font-semibold">{title}</p>
      <p className="mt-1 max-w-xs text-sm text-muted">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function VendorKanbanColumn({
  title,
  count,
  tone,
  children,
}: {
  title: string;
  count: number;
  tone: "accent" | "green" | "muted" | "red" | "blue";
  children: React.ReactNode;
}) {
  const headerTone =
    tone === "green"
      ? "text-green"
      : tone === "red"
        ? "text-red-500"
        : tone === "blue"
          ? "text-blue"
          : tone === "accent"
            ? "text-accent"
            : "text-muted";

  return (
    <div className="vendor-kanban-col flex min-h-[200px] flex-col rounded-[var(--radius-block)] border border-line bg-surface-2/50 p-3">
      <div className="mb-3 flex items-center justify-between">
        <h3 className={cn("text-xs font-bold uppercase tracking-wider", headerTone)}>
          {title}
        </h3>
        <span className="grid min-w-6 place-items-center rounded-full bg-surface px-2 py-0.5 text-xs font-bold shadow-sm">
          {count}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-3">{children}</div>
    </div>
  );
}
