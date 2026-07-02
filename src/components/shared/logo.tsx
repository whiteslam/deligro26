import { cn } from "@/lib/utils/cn";

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("text-heading tracking-tight", className)}>
      <span className="text-accent">Deligro</span>
    </span>
  );
}
