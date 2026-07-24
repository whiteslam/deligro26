"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils/cn";

export function MenuAvailabilityToggle({
  menuItemId,
  initialAvailable,
  itemName,
  layout = "row",
  onChange,
}: {
  menuItemId: string;
  initialAvailable: boolean;
  itemName: string;
  layout?: "row" | "inline";
  onChange?: (available: boolean) => void;
}) {
  const router = useRouter();
  const [available, setAvailable] = useState(initialAvailable);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setAvailable(initialAvailable);
  }, [initialAvailable]);

  async function toggle() {
    const next = !available;
    setBusy(true);
    try {
      const res = await fetch(`/api/vendor/menu/${menuItemId}/availability`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ available: next }),
      });
      if (!res.ok) return;
      setAvailable(next);
      onChange?.(next);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const out = !available;

  const switchBtn = (
    <button
      type="button"
      disabled={busy}
      onClick={toggle}
      role="switch"
      aria-checked={available}
      aria-label={`${itemName}: ${out ? "sold out" : "in stock"}`}
      className={cn(
        "press relative h-7 w-12 shrink-0 rounded-full transition-colors",
        out ? "bg-line" : "bg-green"
      )}
    >
      <span
        className={cn(
          "absolute top-1 size-5 rounded-full bg-white shadow-sm transition-all",
          out ? "left-1" : "left-6"
        )}
      />
    </button>
  );

  if (layout === "inline") {
    return (
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "text-xs font-semibold",
            out ? "text-muted" : "text-green"
          )}
        >
          {out ? "Sold out" : "In stock"}
        </span>
        {switchBtn}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5",
        out
          ? "border-line bg-surface-2"
          : "border-green/25 bg-green/5"
      )}
    >
      <div className="min-w-0">
        <p className="text-xs font-semibold">Available for orders</p>
        <p
          className={cn(
            "text-[11px] font-medium",
            out ? "text-muted" : "text-green"
          )}
        >
          {out ? "Hidden from customers" : "Visible on your menu"}
        </p>
      </div>
      {switchBtn}
    </div>
  );
}
