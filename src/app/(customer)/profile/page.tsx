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
  Phone,
  User,
} from "lucide-react";
import { USER, ADDRESSES } from "@/lib/data";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { requireUser } from "@/lib/auth";
import { getProfileSummary, type ProfileSummary } from "@/lib/data-access/profile";
import { AppearanceRow } from "@/components/profile/appearance-row";

// Per-request: reads the auth cookie to show the signed-in user's own data.
export const dynamic = "force-dynamic";

const OTHER = [
  { icon: MapPin, label: "Saved addresses", href: "/checkout" },
  { icon: Bell, label: "Notifications", href: undefined },
  { icon: CircleHelp, label: "Help & support", href: undefined },
  { icon: ShieldCheck, label: "Privacy & security", href: undefined },
  { icon: Info, label: "About Deligro", href: undefined },
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
        memberSince: USER.memberSince,
        orders: USER.orders,
        addresses: ADDRESSES.length,
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
    <div className="px-4 pb-4 pt-6">
      <h1 className="text-[30px] font-extrabold leading-tight tracking-tight">
        Hello, {firstName}
      </h1>

      {/* Favourites */}
      <SectionHead title="Favourites" action="All" />
      <div className="flex items-center gap-4 rounded-2xl bg-surface-2 p-4">
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-bold">No favourites added</p>
          <p className="mt-0.5 text-sm text-muted">
            Save all your favourites in one place using the heart icon.
          </p>
        </div>
        <span className="grid size-12 shrink-0 place-items-center rounded-full bg-deal-soft text-deal">
          <Heart className="size-6 fill-current" />
        </span>
      </div>

      {/* Payment */}
      <SectionHead title="Payment" action="Edit" />
      <div className="flex items-center gap-3 border-b border-line pb-4">
        <span className="grid size-9 place-items-center rounded-lg bg-surface-2 text-ink">
          <Wallet className="size-[18px]" />
        </span>
        <span className="flex-1 text-[15px] font-semibold">
          Cash on Delivery
        </span>
        <span className="text-sm font-bold text-accent-ink">Change</span>
      </div>

      {/* Profile */}
      <SectionHead title="Profile" />
      <div className="divide-y divide-line">
        <EditRow icon={<User className="size-5" />} value={summary.name} />
        {summary.phone ? (
          <EditRow icon={<Phone className="size-5" />} value={summary.phone} />
        ) : null}
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
          const inner = (
            <>
              <Icon className="size-5 shrink-0 text-ink" />
              <span className="flex-1 text-[15px] font-medium">{item.label}</span>
              <ChevronRight className="size-5 shrink-0 text-muted" />
            </>
          );
          return item.href ? (
            <Link
              key={item.label}
              href={item.href}
              className="press flex w-full items-center gap-3 py-3.5 text-left"
            >
              {inner}
            </Link>
          ) : (
            <button
              key={item.label}
              className="press flex w-full items-center gap-3 py-3.5 text-left"
            >
              {inner}
            </button>
          );
        })}
      </div>

      {/* Become a courier — decorative promo */}
      <div className="mt-6 flex items-center gap-4 rounded-2xl bg-accent-soft p-4">
        <div className="flex-1">
          <p className="text-[15px] font-extrabold tracking-tight">
            Become a courier
          </p>
          <p className="mt-0.5 text-sm text-muted">Earn money on your schedule</p>
        </div>
        <span className="grid size-12 shrink-0 place-items-center rounded-full bg-accent text-white">
          <Wallet className="size-6" />
        </span>
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
    <div className="mb-3 mt-7 flex items-end justify-between">
      <h2 className="text-[19px] font-extrabold tracking-tight">{title}</h2>
      {action ? (
        <span className="flex items-center gap-0.5 text-sm font-bold text-accent-ink">
          {action} <ChevronRight className="size-4" />
        </span>
      ) : null}
    </div>
  );
}

function EditRow({ icon, value }: { icon: React.ReactNode; value: string }) {
  return (
    <div className="flex items-center gap-3 py-3.5">
      <span className="shrink-0 text-ink">{icon}</span>
      <span className="min-w-0 flex-1 truncate text-[15px] font-medium">
        {value}
      </span>
      <span className="text-sm font-bold text-accent-ink">Edit</span>
    </div>
  );
}
