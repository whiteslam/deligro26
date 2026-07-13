"use client";

import { useState, useTransition } from "react";
import { Check, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { approveRestaurantAction } from "@/app/admin/actions";

/** Approves for real: flips restaurants.approved, which puts the shop on the feed. */
export function ApproveRestaurantButton({
  id,
  name,
}: {
  id: string;
  name: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex items-center gap-2">
      {error ? <span className="text-xs text-deal">{error}</span> : null}
      <Button
        size="sm"
        disabled={pending}
        aria-label={`Approve ${name}`}
        onClick={() =>
          startTransition(async () => {
            const result = await approveRestaurantAction(id);
            if (!result.ok) setError(result.error ?? "Failed");
          })
        }
      >
        {pending ? (
          <LoaderCircle className="size-4 animate-spin" />
        ) : (
          <Check className="size-4" />
        )}
        Approve
      </Button>
    </div>
  );
}
