"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Bike,
  Check,
  Copy,
  KeyRound,
  Loader2,
  ShieldCheck,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, fieldCls } from "@/components/ui/field";
import { createEmployeeAction } from "./actions";
import type { EmployeeListItem, EmployeeRole } from "@/lib/data-access/employees";

const dateFmt = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const ROLE_META: Record<
  EmployeeRole,
  { label: string; blurb: string; icon: typeof ShieldCheck; pill: string }
> = {
  manager: {
    label: "Manager",
    blurb: "Full access to the admin panel",
    icon: ShieldCheck,
    pill: "pill pill-green",
  },
  driver: {
    label: "Driver",
    blurb: "Delivery partner app only",
    icon: Bike,
    pill: "pill pill-accent",
  },
};

export function EmployeesManager({
  employees,
  configured,
}: {
  employees: EmployeeListItem[];
  configured: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-4">
      <Button className="w-full" onClick={() => setOpen(true)} disabled={!configured}>
        <UserPlus className="size-4" /> Create employee
      </Button>

      {!configured ? (
        <p className="rounded-2xl border border-pop/40 bg-pop/10 px-3.5 py-3 text-sm font-medium text-ink">
          Connect Supabase to create and manage employees.
        </p>
      ) : null}

      <section>
        <h2 className="text-label mb-2">Team members</h2>
        {employees.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-line bg-surface px-4 py-10 text-center">
            <Users className="size-8 text-muted" />
            <p className="font-semibold">No employees yet</p>
            <p className="text-sm text-muted">
              Create a manager or driver login to get started.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
            {employees.map((e) => (
              <EmployeeRow key={e.id} employee={e} />
            ))}
          </ul>
        )}
      </section>

      {open ? (
        <CreateEmployeeSheet
          onClose={() => setOpen(false)}
          onCreated={() => setOpen(false)}
        />
      ) : null}
    </div>
  );
}

function EmployeeRow({ employee: e }: { employee: EmployeeListItem }) {
  const meta = ROLE_META[e.role];
  const Icon = meta.icon;
  return (
    <li className="flex items-center gap-3 px-4 py-3.5">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-surface-2 text-ink">
        <Icon className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <p className="truncate font-semibold">{e.fullName ?? "Unnamed"}</p>
          <span className={meta.pill}>{meta.label}</span>
        </div>
        <p className="mt-0.5 truncate text-xs text-muted">
          {e.phone ?? "No mobile"}
          {e.createdAt ? ` · Joined ${dateFmt.format(new Date(e.createdAt))}` : ""}
        </p>
      </div>
    </li>
  );
}

function CreateEmployeeSheet({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const router = useRouter();
  const [role, setRole] = useState<EmployeeRole>("manager");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ password: string; email: string } | null>(
    null
  );
  const [pending, start] = useTransition();

  function submit() {
    setError(null);
    start(async () => {
      const res = await createEmployeeAction({
        role,
        fullName,
        email,
        phone: phone || null,
        password: password || null,
      });
      if (!res.ok || !res.password) {
        setError(res.error ?? "Couldn't create the employee.");
        return;
      }
      setCreated({ password: res.password, email: email.trim() });
      router.refresh();
    });
  }

  function done() {
    onCreated();
  }

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Close"
        onClick={created ? done : onClose}
        className="absolute inset-0 bg-ink/40"
      />
      <div
        role="dialog"
        aria-modal="true"
        className="bolt-sheet animate-sheet-in absolute inset-x-0 bottom-0 max-h-[90vh] overflow-y-auto p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-heading">
            {created ? "Employee created" : "Create employee"}
          </h2>
          <button
            type="button"
            onClick={created ? done : onClose}
            className="press grid size-9 place-items-center rounded-full bg-surface-2 text-muted"
          >
            <X className="size-5" />
          </button>
        </div>

        {created ? (
          <CreatedPanel
            role={role}
            email={created.email}
            password={created.password}
            onDone={done}
          />
        ) : (
          <div className="space-y-4">
            <div>
              <span className="text-xs font-semibold text-muted">Role</span>
              <div className="mt-1.5 grid grid-cols-2 gap-2">
                {(Object.keys(ROLE_META) as EmployeeRole[]).map((r) => {
                  const meta = ROLE_META[r];
                  const Icon = meta.icon;
                  const active = role === r;
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(r)}
                      className={
                        "press rounded-xl border p-3 text-left transition-colors " +
                        (active
                          ? "border-accent bg-accent-soft"
                          : "border-line bg-surface-2")
                      }
                    >
                      <Icon
                        className={
                          "size-4 " + (active ? "text-accent" : "text-muted")
                        }
                      />
                      <p className="mt-1.5 text-sm font-bold text-ink">
                        {meta.label}
                      </p>
                      <p className="text-[11px] text-muted">{meta.blurb}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <Field label="Full name" required>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Priya Sharma"
                className={fieldCls}
              />
            </Field>

            <Field label="Email" required hint="Used to sign in to the portal.">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                autoCapitalize="none"
                className={fieldCls}
              />
            </Field>

            <Field
              label="Mobile"
              hint="Optional. Enables OTP sign-in for this employee."
            >
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className={fieldCls}
              />
            </Field>

            <Field
              label="Password"
              hint="Leave blank to auto-generate a one-time password to hand off."
            >
              <input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Auto-generated"
                autoCapitalize="none"
                className={fieldCls}
              />
            </Field>

            {error ? (
              <p className="text-sm font-medium text-deal">{error}</p>
            ) : null}

            <Button className="w-full" disabled={pending} onClick={submit}>
              {pending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <>
                  <UserPlus className="size-4" /> Create {ROLE_META[role].label.toLowerCase()}
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function CreatedPanel({
  role,
  email,
  password,
  onDone,
}: {
  role: EmployeeRole;
  email: string;
  password: string;
  onDone: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 rounded-xl bg-green/10 px-3.5 py-3 text-sm font-medium text-green">
        <Check className="size-4 shrink-0" />
        <span>
          {ROLE_META[role].label} account is ready. Share these credentials — the
          password is only shown once.
        </span>
      </div>

      <CopyRow label="Email" value={email} />
      <CopyRow label="Temporary password" value={password} mono icon />

      <Button className="w-full" variant="secondary" onClick={onDone}>
        Done
      </Button>
    </div>
  );
}

function CopyRow({
  label,
  value,
  mono,
  icon,
}: {
  label: string;
  value: string;
  mono?: boolean;
  icon?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch {
      /* clipboard blocked — the value is visible to read/type */
    }
  }
  return (
    <div className="space-y-1.5">
      <span className="text-xs font-semibold text-muted">{label}</span>
      <div className="flex items-center gap-2 rounded-xl bg-surface-2 p-2.5">
        {icon ? <KeyRound className="size-4 shrink-0 text-muted" /> : null}
        <code
          className={
            "flex-1 break-all px-1 text-[15px] font-semibold text-ink " +
            (mono ? "text-data" : "")
          }
        >
          {value}
        </code>
        <button
          type="button"
          onClick={copy}
          className="press grid size-9 shrink-0 place-items-center rounded-lg bg-surface text-muted hover:text-ink"
          aria-label={`Copy ${label.toLowerCase()}`}
        >
          {copied ? (
            <Check className="size-4 text-green" />
          ) : (
            <Copy className="size-4" />
          )}
        </button>
      </div>
    </div>
  );
}
