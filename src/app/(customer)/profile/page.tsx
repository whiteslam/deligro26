import {
  MapPin,
  Wallet,
  Heart,
  Bell,
  CircleHelp,
  Info,
  ChevronRight,
  LogOut,
  ShieldCheck,
} from "lucide-react";
import { USER, ADDRESSES } from "@/lib/data";
import { AppearanceRow } from "@/components/profile/appearance-row";

const MENU = [
  {
    group: "Account",
    items: [
      {
        icon: MapPin,
        label: "Saved addresses",
        sub: `${ADDRESSES.length} saved`,
      },
      { icon: Wallet, label: "Payment methods", sub: "Cash on Delivery" },
      { icon: Heart, label: "Favourites", sub: "Restaurants & dishes" },
    ],
  },
  {
    group: "Preferences",
    items: [
      { icon: Bell, label: "Notifications", sub: "Order updates & offers" },
    ],
  },
  {
    group: "More",
    items: [
      { icon: CircleHelp, label: "Help & support", sub: "FAQ, contact us" },
      { icon: ShieldCheck, label: "Privacy & security", sub: "" },
      { icon: Info, label: "About Deligro", sub: "v1.0 · Phase 1" },
    ],
  },
];

export default function ProfilePage() {
  return (
    <>
      <div className="glass sticky top-0 z-20 px-4 pb-3 pt-4">
        <h1 className="text-heading">Profile</h1>
      </div>

      <div className="space-y-6 px-4 pt-4">
        {/* User card */}
        <section className="card flex items-center gap-4 p-4">
          <span className="grid size-16 place-items-center rounded-2xl bg-accent text-2xl font-bold text-white shadow-[var(--glow-accent)]">
            {USER.initials}
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-lg font-bold">{USER.name}</h2>
            <p className="text-data text-muted">{USER.phone}</p>
            <p className="mt-0.5 text-xs text-muted">
              Member since {USER.memberSince} · {USER.orders} orders
            </p>
          </div>
        </section>

        <AppearanceRow />

        {/* Menu groups */}
        {MENU.map((section) => (
          <section key={section.group} className="space-y-2">
            <h3 className="text-label px-1">{section.group}</h3>
            <div className="card divide-y divide-line overflow-hidden">
              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.label}
                    className="press flex w-full items-center gap-3 p-4 text-left"
                  >
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-surface-2 text-muted">
                      <Icon className="size-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] font-semibold">
                        {item.label}
                      </span>
                      {item.sub ? (
                        <span className="block text-xs text-muted">
                          {item.sub}
                        </span>
                      ) : null}
                    </span>
                    <ChevronRight className="size-5 shrink-0 text-muted" />
                  </button>
                );
              })}
            </div>
          </section>
        ))}

        <button className="press flex w-full items-center justify-center gap-2 rounded-full border border-line bg-surface py-3.5 text-sm font-semibold text-accent">
          <LogOut className="size-4" /> Sign out
        </button>

        <p className="pb-2 text-center text-xs text-muted">
          Deligro · Craving to doorstep
        </p>
      </div>
    </>
  );
}
