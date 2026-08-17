import Link from "next/link";
import type { Metadata } from "next";
import {
  UtensilsCrossed,
  Store,
  Bike,
  ShieldCheck,
  ClipboardList,
  ArrowRight,
} from "lucide-react";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { PORTALS } from "@/lib/auth/portals";

export const metadata: Metadata = { title: "Sign in · Deligro" };

/**
 * The directory of front doors. Each portal has its own sign-in page and its own
 * accounts — there is no single global login that decides where you belong.
 */
const DOORS = [
  {
    href: "/login",
    label: "Customer",
    desc: "Browse, order & track — phone OTP",
    icon: UtensilsCrossed,
    color: "var(--accent)",
  },
  {
    href: PORTALS.vendor.login,
    label: "Restaurant",
    desc: PORTALS.vendor.blurb,
    icon: Store,
    color: "var(--accent)",
  },
  {
    href: PORTALS.manager.login,
    label: "Manager",
    desc: PORTALS.manager.blurb,
    icon: ClipboardList,
    color: "var(--pop)",
  },
  {
    href: PORTALS.driver.login,
    label: "Driver",
    desc: PORTALS.driver.blurb,
    icon: Bike,
    color: "var(--blue)",
  },
  {
    href: PORTALS.admin.login,
    label: "Admin",
    desc: PORTALS.admin.blurb,
    icon: ShieldCheck,
    color: "var(--green)",
  },
];

export default function PortalsPage() {
  return (
    <div className="dashboard-shell">
      <main className="dashboard-main max-w-[720px]">
        <div className="flex items-center justify-between py-4">
          <div>
            <p className="text-display">Deligro</p>
            <p className="text-sm text-muted">
              One app · five surfaces, each with its own sign-in.
            </p>
          </div>
          <ThemeToggle />
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {DOORS.map((d) => {
            const Icon = d.icon;
            return (
              <Link key={d.href} href={d.href} className="press card block p-5">
                <span
                  className="grid size-11 place-items-center rounded-xl"
                  style={{ background: "var(--surface-2)", color: d.color }}
                >
                  <Icon className="size-5" />
                </span>
                <p className="mt-3 flex items-center gap-1 font-bold">
                  {d.label} <ArrowRight className="size-4 text-muted" />
                </p>
                <p className="mt-0.5 text-sm text-muted">{d.desc}</p>
              </Link>
            );
          })}
        </div>

        <p className="mt-6 text-center text-xs text-muted">
          Signing in at a portal only gets you that portal. The server enforces
          role + resource-ownership checks on every request — that, and RLS
          underneath it, is the real security boundary.
        </p>
      </main>
    </div>
  );
}
