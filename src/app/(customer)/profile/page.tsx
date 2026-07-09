import Link from "next/link";
import {
  MapPin,
  Wallet,
  Heart,
  Bell,
  CircleHelp,
  Info,
  ChevronRight,
  LogOut,
  LogIn,
  ShieldCheck,
} from "lucide-react";
import { USER, ADDRESSES } from "@/lib/data";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getProfileSummary, type ProfileSummary } from "@/lib/data-access/profile";
import { AppearanceRow } from "@/components/profile/appearance-row";

// Per-request: reads the auth cookie to show the signed-in user's own data.
export const dynamic = "force-dynamic";

function menuFor(addressCount: number) {
  return [
    {
      group: "Account",
      items: [
        { icon: MapPin, label: "Saved addresses", sub: `${addressCount} saved`, href: "/checkout" },
        { icon: Wallet, label: "Payment methods", sub: "Cash on Delivery", href: undefined },
        { icon: Heart, label: "Favourites", sub: "Restaurants & dishes", href: undefined },
      ],
    },
    {
      group: "Preferences",
      items: [
        { icon: Bell, label: "Notifications", sub: "Order updates & offers", href: undefined },
      ],
    },
    {
      group: "More",
      items: [
        { icon: CircleHelp, label: "Help & support", sub: "FAQ, contact us", href: undefined },
        { icon: ShieldCheck, label: "Privacy & security", sub: "", href: undefined },
        { icon: Info, label: "About Deligro", sub: "v1.0 · Phase 1", href: undefined },
      ],
    },
  ];
}

export default async function ProfilePage() {
  // Live data when signed in; the mock demo profile when Supabase isn't set up.
  const summary: ProfileSummary | null = isSupabaseConfigured
    ? await getProfileSummary()
    : {
        name: USER.name,
        phone: USER.phone,
        initials: USER.initials,
        memberSince: USER.memberSince,
        orders: USER.orders,
        addresses: ADDRESSES.length,
      };

  return (
    <>
      <div className="glass sticky top-0 z-20 px-4 pb-3 pt-4">
        <h1 className="text-heading">Profile</h1>
      </div>

      <div className="space-y-6 px-4 pt-4">
        {summary ? (
          <>
            {/* User card */}
            <section className="card flex items-center gap-4 p-4">
              <span className="grid size-16 place-items-center rounded-2xl bg-accent text-2xl font-bold text-white shadow-[var(--glow-accent)]">
                {summary.initials}
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-lg font-bold">{summary.name}</h2>
                {summary.phone ? (
                  <p className="text-data text-muted">{summary.phone}</p>
                ) : null}
                <p className="mt-0.5 text-xs text-muted">
                  Member since {summary.memberSince} · {summary.orders}{" "}
                  {summary.orders === 1 ? "order" : "orders"}
                </p>
              </div>
            </section>

            <AppearanceRow />

            {/* Menu groups */}
            {menuFor(summary.addresses).map((section) => (
              <section key={section.group} className="space-y-2">
                <h3 className="text-label px-1">{section.group}</h3>
                <div className="card divide-y divide-line overflow-hidden">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const inner = (
                      <>
                        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-surface-2 text-muted">
                          <Icon className="size-5" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[15px] font-semibold">{item.label}</span>
                          {item.sub ? (
                            <span className="block text-xs text-muted">{item.sub}</span>
                          ) : null}
                        </span>
                        <ChevronRight className="size-5 shrink-0 text-muted" />
                      </>
                    );
                    return item.href ? (
                      <Link
                        key={item.label}
                        href={item.href}
                        className="press flex w-full items-center gap-3 p-4 text-left"
                      >
                        {inner}
                      </Link>
                    ) : (
                      <button
                        key={item.label}
                        className="press flex w-full items-center gap-3 p-4 text-left"
                      >
                        {inner}
                      </button>
                    );
                  })}
                </div>
              </section>
            ))}

            {/* Sign out — native form POST, clears the session server-side. */}
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="press flex w-full items-center justify-center gap-2 rounded-full border border-line bg-surface py-3.5 text-sm font-semibold text-accent"
              >
                <LogOut className="size-4" /> Sign out
              </button>
            </form>
          </>
        ) : (
          /* Signed out (Supabase configured but no session). */
          <section className="card flex flex-col items-center gap-3 p-8 text-center">
            <span className="grid size-14 place-items-center rounded-2xl bg-accent-soft text-accent">
              <LogIn className="size-7" />
            </span>
            <div>
              <h2 className="text-lg font-bold">You&apos;re not signed in</h2>
              <p className="mt-1 text-sm text-muted">
                Sign in to see your orders, saved addresses, and profile.
              </p>
            </div>
            <Link
              href="/login?next=/profile"
              className="press mt-1 flex items-center justify-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white shadow-[var(--glow-accent)]"
            >
              <LogIn className="size-4" /> Sign in
            </Link>
          </section>
        )}

        <p className="pb-2 text-center text-xs text-muted">
          Deligro · Craving to doorstep
        </p>
      </div>
    </>
  );
}
