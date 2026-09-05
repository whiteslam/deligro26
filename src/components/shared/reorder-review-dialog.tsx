"use client";

import { TriangleAlert } from "lucide-react";
import { useReorderReview } from "@/stores/reorder-review-store";
import { useUI } from "@/stores/ui-store";
import { formatINR } from "@/lib/utils/format";

/**
 * "A few things changed since you last ordered this." Mounted once at
 * app-shell level, shown only when `reconcileReorder` found a sold-out item or
 * a price change — see reorder-review-store for why this exists.
 */
export function ReorderReviewDialog() {
  const pending = useReorderReview((s) => s.pending);
  const confirm = useReorderReview((s) => s.confirm);
  const cancel = useReorderReview((s) => s.cancel);
  const openCart = useUI((s) => s.openCart);

  if (!pending) return null;

  const { removed, repriced, lines } = pending;
  const nothingLeft = lines.length === 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="reorder-review-title"
      className="absolute inset-0 z-[60]"
    >
      <button
        aria-label="Cancel"
        onClick={cancel}
        className="animate-fade-in absolute inset-0 bg-ink/40"
      />
      <div className="animate-sheet-in bolt-sheet absolute inset-x-0 bottom-0">
        <div className="bolt-sheet-handle" />
        <div className="px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-2 text-center">
          <span className="mx-auto grid size-14 place-items-center rounded-full bg-deal-soft text-deal">
            <TriangleAlert className="size-7" />
          </span>
          <h2
            id="reorder-review-title"
            className="mt-3 text-[19px] font-extrabold leading-tight tracking-tight"
          >
            A few things changed
          </h2>

          <div className="mx-auto mt-2 max-w-[19rem] space-y-1.5 text-left text-sm leading-relaxed text-muted">
            {removed.map((name) => (
              <p key={`removed-${name}`}>
                <span className="font-semibold text-ink">{name}</span> isn&apos;t
                available right now — left out of your basket.
              </p>
            ))}
            {repriced.map((r) => (
              <p key={`repriced-${r.name}`}>
                <span className="font-semibold text-ink">{r.name}</span> is now{" "}
                {formatINR(r.newPrice)}{" "}
                <span className="line-through">{formatINR(r.oldPrice)}</span>
              </p>
            ))}
          </div>

          <div className="mt-5 flex gap-3">
            <button
              type="button"
              onClick={cancel}
              className="press h-12 flex-1 rounded-full border border-line bg-surface text-[15px] font-bold text-ink"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={nothingLeft}
              onClick={() => {
                confirm();
                openCart();
              }}
              className="press h-12 flex-1 rounded-full bg-accent text-[15px] font-bold text-[var(--on-accent)] shadow-[var(--glow-accent)] disabled:opacity-40"
            >
              {nothingLeft ? "Nothing left to order" : "Continue"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
