"use client";

import { useState, useTransition } from "react";
import { setRestaurantOpenAction } from "@/app/vendor/actions";

export function RestaurantOpenToggle({ isOpen }: { isOpen: boolean }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState(false);

  return (
    <button
      type="button"
      disabled={pending}
      title={error ? "Could not update status" : undefined}
      onClick={() =>
        startTransition(async () => {
          setError(false);
          try {
            await setRestaurantOpenAction(!isOpen);
          } catch {
            setError(true);
          }
        })
      }
      className={`press rounded-full px-3 py-1.5 text-xs font-semibold ${
        error
          ? "bg-red-500/10 text-red-500"
          : isOpen
            ? "bg-green/15 text-green"
            : "bg-surface-2 text-muted"
      }`}
    >
      {error ? "Retry" : isOpen ? "Open" : "Closed"}
    </button>
  );
}
