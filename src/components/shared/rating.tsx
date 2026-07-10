import { Star } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { formatCount, formatRating } from "@/lib/utils/format";

export function RatingPill({
  rating,
  count,
  className,
  variant = "inline",
}: {
  rating: number;
  count?: number;
  className?: string;
  /** "inline" = green text (in listings); "chip" = solid dark capsule for photo overlays (Bolt style). */
  variant?: "inline" | "chip";
}) {
  if (variant === "chip") {
    return (
      <span className={cn("rating-chip", className)}>
        <Star className="size-3.5 fill-pop text-pop" />
        {formatRating(rating)}
        {count != null ? (
          <span className="font-medium opacity-70">
            ({formatCount(count)})
          </span>
        ) : null}
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-data font-bold text-accent-ink",
        className
      )}
    >
      <Star className="size-3.5 fill-accent text-accent" />
      {formatRating(rating)}
      {count != null ? (
        <span className="text-muted font-normal">
          ({formatCount(count)})
        </span>
      ) : null}
    </span>
  );
}
