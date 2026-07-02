import { Star } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { formatCount, formatRating } from "@/lib/utils/format";

export function RatingPill({
  rating,
  count,
  className,
}: {
  rating: number;
  count?: number;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-data font-medium text-green",
        className
      )}
    >
      <Star className="size-3.5 fill-green text-green" />
      {formatRating(rating)}
      {count != null ? (
        <span className="text-muted font-normal">
          ({formatCount(count)})
        </span>
      ) : null}
    </span>
  );
}
