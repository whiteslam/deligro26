import Link from "next/link";
import { UtensilsCrossed, Store, Bike, ShieldCheck, ArrowRight } from "lucide-react";
import { ThemeToggle } from "@/components/shared/theme-toggle";

const PORTALS = [
  {
    href: "/",
    label: "Customer",
    desc: "Browse, order & track — the main app",
    icon: UtensilsCrossed,
    color: "var(--accent)",
  },
  {
    href: "/vendor",
    label: "Restaurant",
    desc: "Accept orders, manage menu & earnings",
    icon: Store,
    color: "var(--accent)",
  },
  {
    href: "/driver",
    label: "Driver",
    desc: "Available orders, accept & deliver",
    icon: Bike,
    color: "var(--blue)",
  },
  {
    href: "/admin",
    label: "Admin",
    desc: "Overview, orders, refunds & approvals",
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
              One app · four surfaces, chosen by role at login.
            </p>
          </div>
          <ThemeToggle />
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {PORTALS.map((p) => {
            const Icon = p.icon;
            return (
              <Link key={p.href} href={p.href} className="press card block p-5">
                <span
                  className="grid size-11 place-items-center rounded-xl"
                  style={{ background: "var(--surface-2)", color: p.color }}
                >
                  <Icon className="size-5" />
                </span>
                <p className="mt-3 flex items-center gap-1 font-bold">
                  {p.label} <ArrowRight className="size-4 text-muted" />
                </p>
                <p className="mt-0.5 text-sm text-muted">{p.desc}</p>
              </Link>
            );
          })}
        </div>

        <p className="mt-6 text-center text-xs text-muted">
          Role routing is a UI convenience. In production, the server enforces
          role + resource-ownership checks on every request — the real security
          boundary.
        </p>
      </main>
    </div>
  );
}
