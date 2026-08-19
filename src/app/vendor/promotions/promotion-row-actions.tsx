"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Pause, Play, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import {
  deleteVendorPromotionAction,
  setVendorPromotionActiveAction,
} from "./actions";

/** Pause / resume / delete, for one of this shop's own codes. */
export function VendorPromotionRowActions({
  code,
  active,
}: {
  code: string;
  active: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    start(async () => {
      const res = await fn();
      if (!res.ok && res.error) window.alert(res.error);
      router.refresh();
    });

  const base =
    "press grid size-9 place-items-center rounded-full bg-surface-2 transition-colors disabled:opacity-50";

  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        disabled={pending}
        onClick={() => run(() => setVendorPromotionActiveAction(code, !active))}
        className={cn(
          base,
          active ? "text-accent hover:bg-accent/15" : "text-green hover:bg-green/15"
        )}
        aria-label={active ? `Pause ${code}` : `Resume ${code}`}
        title={active ? "Pause this code" : "Make this code live"}
      >
        {active ? <Pause className="size-4" /> : <Play className="size-4" />}
      </button>

      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (
            !window.confirm(
              `Delete ${code}? Your offer badge goes with it. Orders that already used the code keep their discount.`
            )
          ) {
            return;
          }
          run(() => deleteVendorPromotionAction(code));
        }}
        className={cn(base, "text-deal hover:bg-deal/15")}
        aria-label={`Delete ${code}`}
        title="Delete this code"
      >
        <Trash2 className="size-4" />
      </button>
    </div>
  );
}
