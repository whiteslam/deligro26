"use client";

import { useEffect } from "react";
import { Moon } from "lucide-react";
import { useUI } from "@/stores/ui-store";
import { cn } from "@/lib/utils/cn";

export function AppearanceRow() {
  const theme = useUI((s) => s.theme);
  const hydrated = useUI((s) => s.hydrated);
  const toggleTheme = useUI((s) => s.toggleTheme);
  const initTheme = useUI((s) => s.initTheme);

  useEffect(() => {
    initTheme();
  }, [initTheme]);

  const isDark = hydrated && theme === "dark";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label="Dark mode"
      onClick={toggleTheme}
      className="press flex w-full items-center gap-3 py-3.5 text-left"
    >
      <Moon className="size-5 shrink-0 text-ink" />
      <span className="flex-1 text-[15px] font-medium text-ink">Dark mode</span>
      <span
        className={cn(
          "relative h-[26px] w-[46px] shrink-0 rounded-full transition-colors duration-200",
          isDark ? "bg-accent" : "bg-line"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 left-0.5 size-[22px] rounded-full bg-white shadow-sm transition-transform duration-200",
            isDark && "translate-x-5"
          )}
        />
      </span>
    </button>
  );
}
