"use client";

import { Monitor, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export type ShellMode = "app" | "web";

/**
 * Floating layout switcher — only visible on computer/laptop (≥480px).
 * Hidden on real phones so operators never see a desktop-only control.
 */
export function DesktopShellSwitcher({
  mode,
  onChange,
  hydrated,
}: {
  mode: ShellMode;
  onChange: (mode: ShellMode) => void;
  hydrated: boolean;
}) {
  return (
    <div
      className="pointer-events-none fixed bottom-5 right-5 z-[100] hidden min-[480px]:block"
      role="group"
      aria-label="Layout switcher"
    >
      <div className="pointer-events-auto flex items-center gap-1 rounded-2xl border border-line bg-surface/95 p-1.5 shadow-[var(--shadow-lg)] backdrop-blur-md">
        <span className="hidden px-2 text-[11px] font-bold uppercase tracking-wide text-muted sm:inline">
          Layout
        </span>
        <ModeButton
          active={mode === "app"}
          disabled={!hydrated}
          onClick={() => onChange("app")}
          icon={<Smartphone className="size-3.5" />}
          label="App"
        />
        <ModeButton
          active={mode === "web"}
          disabled={!hydrated}
          onClick={() => onChange("web")}
          icon={<Monitor className="size-3.5" />}
          label="Web"
        />
      </div>
    </div>
  );
}

function ModeButton({
  active,
  disabled,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  disabled: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "press flex items-center gap-1.5 rounded-xl px-3 py-2 text-[12px] font-bold transition-colors disabled:opacity-40",
        active
          ? "bg-accent text-white shadow-[var(--glow-accent)]"
          : "text-muted hover:bg-surface-2 hover:text-ink"
      )}
    >
      {icon}
      {label}
    </button>
  );
}
