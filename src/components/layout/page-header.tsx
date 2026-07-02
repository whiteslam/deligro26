"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export function PageHeader({
  title,
  subtitle,
  right,
  transparent,
  className,
}: {
  title?: string;
  subtitle?: string;
  right?: React.ReactNode;
  transparent?: boolean;
  className?: string;
}) {
  const router = useRouter();
  return (
    <header
      className={cn(
        "sticky top-0 z-20 flex items-center gap-3 px-4 py-3",
        transparent ? "bg-transparent" : "glass",
        className
      )}
    >
      <button
        onClick={() => router.back()}
        aria-label="Go back"
        className="press grid size-10 shrink-0 place-items-center rounded-full border border-line bg-surface text-ink"
      >
        <ChevronLeft className="size-5" />
      </button>
      <div className="min-w-0 flex-1">
        {title ? (
          <h1 className="truncate text-[17px] font-bold leading-tight">
            {title}
          </h1>
        ) : null}
        {subtitle ? (
          <p className="truncate text-xs text-muted">{subtitle}</p>
        ) : null}
      </div>
      {right}
    </header>
  );
}
