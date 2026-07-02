import Link from "next/link";
import { cn } from "@/lib/utils/cn";

/** Asymmetric bento grid — block size communicates importance. */
export function BentoGrid({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid grid-cols-2 gap-3", className)}>{children}</div>
  );
}

export function BentoBlock({
  href,
  span = 1,
  className,
  style,
  children,
}: {
  href?: string;
  span?: 1 | 2;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  const classes = cn(
    "press card relative flex flex-col overflow-hidden",
    span === 2 ? "col-span-2" : "col-span-1",
    className
  );
  if (href) {
    return (
      <Link href={href} className={classes} style={style}>
        {children}
      </Link>
    );
  }
  return (
    <div className={classes} style={style}>
      {children}
    </div>
  );
}
