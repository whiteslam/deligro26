"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setActiveRestaurantAction } from "@/app/vendor/actions";
import type { OwnedRestaurant } from "@/lib/data-access/vendor-restaurant";

export function RestaurantSwitcher({
  restaurants,
  activeSlug,
  fullWidth = false,
}: {
  restaurants: OwnedRestaurant[];
  activeSlug: string;
  fullWidth?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (restaurants.length <= 1) return null;

  return (
    <label className={fullWidth ? "flex w-full items-center gap-2" : "flex items-center gap-2"}>
      <span className="sr-only">Switch restaurant</span>
      <select
        value={activeSlug}
        disabled={pending}
        onChange={(e) => {
          const slug = e.target.value;
          startTransition(async () => {
            await setActiveRestaurantAction(slug);
            router.refresh();
          });
        }}
        className={
          fullWidth
            ? "w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm font-semibold text-ink"
            : "max-w-[180px] truncate rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-ink"
        }
      >
        {restaurants.map((r) => (
          <option key={r.slug} value={r.slug}>
            {r.name}
          </option>
        ))}
      </select>
    </label>
  );
}
