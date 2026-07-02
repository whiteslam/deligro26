import { cn } from "@/lib/utils/cn";

/**
 * P3 — Design the empty state first. Every empty state is an invitation,
 * never a shrug.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center px-8 py-14 text-center",
        className
      )}
    >
      {icon ? (
        <div className="mb-4 grid size-16 place-items-center rounded-2xl bg-surface-2 text-muted">
          {icon}
        </div>
      ) : null}
      <h3 className="text-heading">{title}</h3>
      {description ? (
        <p className="mt-1.5 max-w-[16rem] text-body text-muted">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
