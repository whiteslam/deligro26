import { cn } from "@/lib/utils/cn";

/**
 * Food photography — "photography is the color". When `src` is set the real
 * image carries the warmth; the gradient `tint` stays underneath as the
 * backdrop while the photo loads (or if it ever fails to).
 */
export function PhotoTile({
  tint,
  src,
  alt,
  label,
  className,
  children,
}: {
  tint: string;
  src?: string;
  alt?: string;
  label?: string;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={cn("relative overflow-hidden", className)}
      style={{ background: tint }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt ?? ""}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        /* subtle sheen so flat gradients read as a photo surface */
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(120% 80% at 20% 0%, rgba(255,255,255,.28), transparent 55%)",
          }}
        />
      )}
      {label ? (
        <span className="absolute left-3 top-3 text-3xl drop-shadow-sm">
          {label}
        </span>
      ) : null}
      {children}
    </div>
  );
}
