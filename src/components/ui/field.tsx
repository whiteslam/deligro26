import { cn } from "@/lib/utils/cn";

/**
 * Shared form primitives, promoted from the copy-pasted `field`/`Labeled`/
 * `Section`/`Toggle` helpers that lived in banner-form and settings-form. This
 * module has no "use client" so it can render in either a Server or Client
 * Component; the event-handler props (Toggle's onChange) are only ever supplied
 * from a client form.
 */

export const fieldCls =
  "w-full rounded-xl bg-surface-2 px-3.5 py-3 text-[15px] text-ink outline-none focus:ring-2 focus:ring-accent/30 disabled:opacity-50";

export const labelCls = "text-xs font-semibold text-muted";

export function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className={labelCls}>
        {label}
        {required ? <span className="text-deal"> *</span> : null}
      </span>
      {children}
      {hint ? <span className="block text-[11px] text-muted">{hint}</span> : null}
    </label>
  );
}

export function Section({
  title,
  description,
  right,
  className,
  children,
}: {
  title?: string;
  description?: string;
  right?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn("card space-y-4 p-4", className)}>
      {title || right ? (
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            {title ? <h2 className="text-heading text-[15px]">{title}</h2> : null}
            {description ? (
              <p className="mt-0.5 text-xs text-muted">{description}</p>
            ) : null}
          </div>
          {right}
        </div>
      ) : null}
      {children}
    </section>
  );
}

/** A labelled switch. Uncontrolled (defaultChecked) or controlled (checked + onChange). */
export function Toggle({
  name,
  label,
  description,
  defaultChecked,
  checked,
  onChange,
}: {
  name?: string;
  label: string;
  description?: string;
  defaultChecked?: boolean;
  checked?: boolean;
  onChange?: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl bg-surface-2 px-3.5 py-3">
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-ink">{label}</span>
        {description ? (
          <span className="block text-xs text-muted">{description}</span>
        ) : null}
      </span>
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        checked={checked}
        onChange={onChange ? (e) => onChange(e.target.checked) : undefined}
        className="size-5 shrink-0 accent-accent"
      />
    </label>
  );
}
