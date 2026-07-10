"use client";

import { useTransition } from "react";
import { setRestaurantOpenAction } from "@/app/vendor/actions";

export function RestaurantOpenToggle({ isOpen }: { isOpen: boolean }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await setRestaurantOpenAction(!isOpen);
        })
      }
      className={`press rounded-full px-3 py-1.5 text-xs font-semibold ${
        isOpen
          ? "bg-green/15 text-green"
          : "bg-surface-2 text-muted"
      }`}
    >
      {isOpen ? "Open" : "Closed"}
    </button>
  );
}
