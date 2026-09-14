import Link from "next/link";
import {
  KeyRound,
  MapPin,
  ReceiptText,
  Smartphone,
  Trash2,
  CircleHelp,
} from "lucide-react";
import { ProfileSubpage } from "@/components/profile/profile-subpage";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * Privacy & security.
 *
 * This row existed on the account screen, with a shield icon, pointing at
 * `/profile/help` — the support FAQ, which says nothing about either. Two rows
 * with two labels, two icons and one destination, and the one that arrived was
 * not the one promised.
 *
 * What is written below is deliberately a description of what this app actually
 * does, field by field, not a policy document. Deligro has no published privacy
 * policy or terms — the sign-in screen asserts you agree to both, in plain text,
 * with nothing to read and nothing to link to — and inventing legal text to fill
 * a screen would be worse than the empty row it replaces. Everything here can be
 * checked against the schema; the moment a real policy exists it belongs at the
 * bottom of this page as a link.
 */
const HELD: { icon: typeof MapPin; title: string; body: string }[] = [
  {
    icon: Smartphone,
    title: "Your phone number",
    body: "It is how you sign in and how a rider reaches you at the door. It is the one thing an account cannot exist without.",
  },
  {
    icon: MapPin,
    title: "Addresses you save",
    body: "The label, the address line and its map pin, so a rider can find you. Saved only when you add one, and yours to delete at any time.",
  },
  {
    icon: ReceiptText,
    title: "Your orders",
    body: "What you ordered, from where, what it cost and how it was paid. This is the record behind your receipts and any refund, so it is kept rather than cleared.",
  },
  {
    icon: KeyRound,
    title: "A device token for notifications",
    body: "Only if you turn push on. It identifies this browser to the notification service — not you — and turning notifications off stops it being used.",
  },
];

export default async function PrivacyPage() {
  await requireUser();

  return (
    <ProfileSubpage title="Privacy & security">
      <section>
        <h2 className="mb-2 px-1 text-[13px] font-bold uppercase tracking-[0.06em] text-muted">
          How you sign in
        </h2>
        <div className="card p-4">
          <p className="text-[15px] font-semibold">
            A code to your phone, never a password
          </p>
          <p className="mt-1 text-[13px] leading-relaxed text-muted">
            Deligro has no password for your account, so there is none to guess,
            reuse or leak. Each sign-in sends a one-time code to your number and
            that code expires. Anyone who cannot receive your texts cannot get
            in, which also means keeping your number current matters — see
            &ldquo;Getting help&rdquo; below if it changes.
          </p>
        </div>
      </section>

      <section className="mt-6">
        <h2 className="mb-2 px-1 text-[13px] font-bold uppercase tracking-[0.06em] text-muted">
          What we hold about you
        </h2>
        <div className="card divide-y divide-line">
          {HELD.map((h) => {
            const Icon = h.icon;
            return (
              <div key={h.title} className="flex items-start gap-3 p-4">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-surface-2 text-muted">
                  <Icon className="size-[18px]" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-semibold">
                    {h.title}
                  </span>
                  <span className="mt-0.5 block text-[13px] leading-relaxed text-muted">
                    {h.body}
                  </span>
                </span>
              </div>
            );
          })}
        </div>
        <p className="mt-3 px-1 text-xs leading-relaxed text-muted">
          Your saved card details are never held here — online payments go
          straight to the payment provider, and Deligro only learns whether a
          payment succeeded.
        </p>
      </section>

      <section className="mt-6">
        <h2 className="mb-2 px-1 text-[13px] font-bold uppercase tracking-[0.06em] text-muted">
          What you can do
        </h2>
        <div className="card divide-y divide-line">
          <Link
            href="/profile/addresses"
            className="press flex items-center gap-3 p-4"
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-blue/12 text-blue">
              <MapPin className="size-[18px]" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-semibold">
                Review your saved addresses
              </span>
              <span className="mt-0.5 block text-[13px] text-muted">
                Edit or delete any of them.
              </span>
            </span>
          </Link>
          <Link
            href="/profile/notifications"
            className="press flex items-center gap-3 p-4"
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent/12 text-accent">
              <Smartphone className="size-[18px]" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-semibold">
                Turn notifications off
              </span>
              <span className="mt-0.5 block text-[13px] text-muted">
                Stops the device token being used.
              </span>
            </span>
          </Link>
          {/* Account deletion is a support request rather than a button,
              because it is not one: orders are financial records a vendor has
              been settled against, so an account cannot simply be dropped. Say
              that plainly instead of offering a button that opens a dialog and
              then explains it cannot finish. */}
          <Link
            href="/profile/help"
            className="press flex items-center gap-3 p-4"
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-deal/12 text-deal">
              <Trash2 className="size-[18px]" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-semibold">
                Ask us to delete your account
              </span>
              <span className="mt-0.5 block text-[13px] leading-snug text-muted">
                Get in touch and we will remove your profile and addresses. Past
                orders are kept — they are the record behind receipts, refunds
                and what each shop was paid.
              </span>
            </span>
          </Link>
        </div>
      </section>

      <section className="mt-6">
        <h2 className="mb-2 px-1 text-[13px] font-bold uppercase tracking-[0.06em] text-muted">
          Getting help
        </h2>
        <Link
          href="/profile/help"
          className="card press flex items-center gap-3 p-4"
        >
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-green/12 text-green">
            <CircleHelp className="size-[18px]" />
          </span>
          <span className="min-w-0 flex-1 text-[15px] font-semibold">
            Contact support
          </span>
        </Link>
      </section>
    </ProfileSubpage>
  );
}
