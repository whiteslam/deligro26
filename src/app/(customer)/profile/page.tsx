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
import { requireUser } from "@/lib/auth";
import { getProfileSummary, type ProfileSummary } from "@/lib/data-access/profile";
import { AppearanceRow } from "@/components/profile/appearance-row";
import { ProfileAccountRows } from "@/components/profile/profile-account-rows";
import { ProfileAvatar } from "@/components/profile/profile-avatar";

// Per-request: reads the auth cookie to show the signed-in user's own data.
export const dynamic = "force-dynamic";

const OTHER = [
  { icon: MapPin, label: "Saved addresses", href: "/profile/addresses" },
  { icon: Bell, label: "Notifications", href: "/profile/notifications" },
  { icon: CircleHelp, label: "Help & support", href: "/profile/help" },
  { icon: ShieldCheck, label: "Privacy & security", href: "/profile/help" },
  { icon: Info, label: "About Deligro", href: "/profile/about" },
];

export default async function ProfilePage() {
  // Profile is per-account — guests are bounced to /login by the proxy; this
  // backstops it server-side.
  await requireUser();

  // Live data when signed in; the mock demo profile when Supabase isn't set up.
  const summary: ProfileSummary | null = isSupabaseConfigured
    ? await getProfileSummary()
    : {
        name: USER.name,
        phone: USER.phone,
        initials: USER.initials,
        avatarUrl: null,
        memberSince: USER.memberSince,
        orders: USER.orders,
        addresses: ADDRESSES.length,
        favorites: 0,
      };

  if (!summary) {
    return (
      <div className="px-4 pt-8">
        <section className="card flex flex-col items-center gap-3 p-8 text-center">
          <span className="grid size-14 place-items-center rounded-2xl bg-accent-soft text-accent-ink">
            <LogIn className="size-7" />
          </span>
          <div>
            <h2 className="text-lg font-extrabold">You&apos;re not signed in</h2>
            <p className="mt-1 text-sm text-muted">
              Sign in to see your orders, saved addresses, and profile.
            </p>
          </div>
          <Link
            href="/login?next=/profile"
            className="press mt-1 flex items-center justify-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-bold text-white shadow-[var(--glow-accent)]"
          >
            <LogIn className="size-4" /> Sign in
          </Link>
        </section>
      </div>
    );
  }

  const firstName = summary.name.split(" ")[0];

  return (
    <div className="px-4 pb-4 pt-5">
      <h1 className="text-[24px] font-extrabold leading-tight tracking-tight">
        Account
      </h1>

      <div className="mt-4 flex items-center gap-4">
        <ProfileAvatar
          name={summary.name}
          initials={summary.initials}
          avatarUrl={summary.avatarUrl}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[17px] font-extrabold leading-tight">
            Hello, {firstName}
          </p>
          <p className="mt-1 truncate text-[13px] font-medium text-muted">
            {summary.phone ?? "Add a phone number below"}
          </p>
        </div>
      </div>

      {/* Favourites */}
      <SectionHead title="Favourites" />
      <div className="flex items-center gap-4 rounded-2xl border border-line bg-surface p-4">
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-bold">
            {summary.favorites
              ? `${summary.favorites} ${summary.favorites === 1 ? "restaurant" : "restaurants"} saved`
              : "No favourites added"}
          </p>
          <p className="mt-0.5 text-sm text-muted">
            {summary.favorites
              ? "Tap the heart on any restaurant to add or remove it."
              : "Save all your favourites in one place using the heart icon."}
          </p>
        </div>
        <span className="grid size-12 shrink-0 place-items-center rounded-full bg-deal-soft text-deal">
          <Heart className="size-6 fill-current" />
        </span>
      </div>

      {/* Payment. "Edit" and "Change" used to sit here as affordances for a
          picker that doesn't exist — Cash on Delivery is the only method, so the
          row states it rather than inviting a tap that does nothing. */}
      <SectionHead title="Payment" />
      <div className="flex items-center gap-3 border-b border-line pb-4">
        <span className="grid size-9 place-items-center rounded-lg bg-surface-2 text-ink">
          <Wallet className="size-[18px]" />
        </span>
        <span className="flex-1 text-[15px] font-semibold">
          Cash on Delivery
        </span>
        <span className="text-sm text-muted">Only method for now</span>
      </div>

      {/* Profile */}
      <SectionHead title="Profile" />
      <div className="relative">
        <ProfileAccountRows summary={summary} />
      </div>
      <p className="mt-3 text-xs text-muted">
        Member since {summary.memberSince} · {summary.orders}{" "}
        {summary.orders === 1 ? "order" : "orders"}
      </p>

      {/* Theme */}
      <SectionHead title="Theme" />
      <AppearanceRow />

      {/* Other */}
      <SectionHead title="Other" />
      <div className="divide-y divide-line">
        {OTHER.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              href={item.href}
              className="press flex w-full items-center gap-3 py-3.5 text-left"
            >
              <Icon className="size-5 shrink-0 text-ink" />
              <span className="flex-1 text-[15px] font-medium">{item.label}</span>
              <ChevronRight className="size-5 shrink-0 text-muted" />
            </Link>
          );
        })}
      </div>

      {/* Sign out — native form POST, clears the session server-side. */}
      <form action="/auth/signout" method="post" className="mt-6">
        <button
          type="submit"
          className="press flex w-full items-center justify-center gap-2 rounded-full border border-line bg-surface py-3.5 text-sm font-bold text-deal"
        >
          <LogOut className="size-4" /> Sign out
        </button>
      </form>

      <p className="pb-2 pt-6 text-center text-xs text-muted">
        Deligro · Craving to doorstep
      </p>
    </div>
  );
}

function SectionHead({ title, action }: { title: string; action?: string }) {
  return (
    <div className="mb-2 mt-7 flex items-end justify-between">
      <h2 className="text-[13px] font-bold uppercase tracking-[0.06em] text-muted">
        {title}
      </h2>
      {action ? (
        <span className="bolt-section-link text-[13px]">
          {action} <ChevronRight className="size-3.5" />
        </span>
      ) : null}
    </div>
  );
}
