import { cn } from "@/lib/utils/cn";

type Variant = "primary" | "secondary" | "ghost" | "outline";
type Size = "sm" | "md" | "lg";

/**
 * `ui-btn` is a stable hook, not a style. The ops console retunes buttons to
 * its own proportions through it (see `.console-theme .ui-btn` in globals.css):
 * an 8px radius, tighter heights and no glow, because that shell has no
 * elevation anywhere. Everywhere else keeps the app's pill button.
 */
const base =
  "ui-btn press inline-flex items-center justify-center gap-2 font-semibold rounded-full select-none disabled:opacity-50 disabled:pointer-events-none";

const variants: Record<Variant, string> = {
  primary:
    "bg-accent text-[var(--on-accent)] shadow-[var(--glow-accent)] hover:brightness-[1.03]",
  secondary: "bg-surface-2 text-ink hover:bg-line/60",
  ghost: "text-ink hover:bg-surface-2",
  outline: "border border-line text-ink bg-surface hover:bg-surface-2",
};

const sizes: Record<Size, string> = {
  sm: "h-10 px-4 text-sm",
  md: "h-12 px-5 text-[15px]",
  lg: "h-14 px-6 text-[17px] font-bold",
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
}) {
  return (
    <button
      className={cn(base, variants[variant], sizes[size], className)}
      {...props}
    />
  );
}
