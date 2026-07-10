"use client";

import { useEffect } from "react";
import { useUI } from "@/stores/ui-store";
import { cn } from "@/lib/utils/cn";

export function AppearanceRow() {
  const theme = useUI((s) => s.theme);
  const hydrated = useUI((s) => s.hydrated);
  const setTheme = useUI((s) => s.setTheme);
  const initTheme = useUI((s) => s.initTheme);

  useEffect(() => {
    initTheme();
  }, [initTheme]);

  return (
    <div className="flex gap-3">
      <Swatch
        on={hydrated && theme === "light"}
        onClick={() => setTheme("light")}
        label="Light"
        preview="bg-white"
      />
      <Swatch
        on={hydrated && theme === "dark"}
        onClick={() => setTheme("dark")}
        label="Dark"
        preview="bg-[#0f1215]"
      />
    </div>
  );
}

function Swatch({
  on,
  onClick,
  label,
  preview,
}: {
  on: boolean;
  onClick: () => void;
  label: string;
  preview: string;
}) {
  return (
    <button
      onClick={onClick}
      className="press flex flex-1 flex-col items-center gap-1.5"
      aria-label={label}
    >
      <span
        className={cn(
          "grid h-14 w-full place-items-center rounded-2xl border-2",
          preview,
          on ? "border-accent" : "border-line"
        )}
      >
        {on ? <span className="size-3 rounded-full bg-accent" /> : null}
      </span>
      <span
        className={cn(
          "text-[13px]",
          on ? "font-bold text-ink" : "font-medium text-muted"
        )}
      >
        {label}
      </span>
    </button>
  );
}
