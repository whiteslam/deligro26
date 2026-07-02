"use client";

import { useEffect } from "react";
import { Sun, Moon } from "lucide-react";
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
    <div className="card flex items-center justify-between p-4">
      <div>
        <p className="text-[15px] font-semibold">Appearance</p>
        <p className="text-xs text-muted">
          Auto-switches by time of day. Light by day, dark at night.
        </p>
      </div>
      <div className="flex items-center gap-1 rounded-full bg-surface-2 p-0.5">
        <Seg
          on={hydrated && theme === "light"}
          onClick={() => setTheme("light")}
          label="Light"
          icon={<Sun className="size-4" />}
        />
        <Seg
          on={hydrated && theme === "dark"}
          onClick={() => setTheme("dark")}
          label="Dark"
          icon={<Moon className="size-4" />}
        />
      </div>
    </div>
  );
}

function Seg({
  on,
  onClick,
  label,
  icon,
}: {
  on: boolean;
  onClick: () => void;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={cn(
        "press grid size-9 place-items-center rounded-full",
        on ? "bg-surface text-accent shadow-[var(--shadow-sm)]" : "text-muted"
      )}
    >
      {icon}
    </button>
  );
}
