import Link from "next/link";
import { Phone, Mail, MessageCircle } from "lucide-react";
import { ProfileSubpage } from "@/components/profile/profile-subpage";
import { requireUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { onlinePaymentsEnabled } from "@/lib/payments/availability";

export const dynamic = "force-dynamic";

/** Strip a phone number down to digits for tel:/wa.me links. */
function digits(s: string) {
  return s.replace(/[^\d]/g, "");
}

/**
 * The answers that don't depend on configuration. "Payment methods" used to sit
 * here too, as a constant reading "We currently support Cash on Delivery. Online
 * payments are coming soon." — on a page that already loads live settings for
 * its contact channels. The moment an admin enabled online payment, the official
 * support answer told customers it didn't exist.
 */
const FAQ = [
  {
    q: "Where is my order?",
    a: "Open Orders and tap your active order to see live tracking on the map.",
  },
  {
    q: "How do I cancel?",
    a: "You can cancel from the order tracking screen before the kitchen starts preparing your food.",
  },
];

export default async function HelpPage() {
  await requireUser();
  // Same gate the checkout and /api/orders use, not the raw toggle: what the
  // customer can actually pay with depends on the admin switch AND the gateway
  // keys, and answering from the switch alone would promise a method the order
  // API would refuse.
  const [s, onlinePayments] = await Promise.all([
    getSettings(),
    onlinePaymentsEnabled(),
  ]);

  const faq = [
    ...FAQ,
    {
      q: "Payment methods",
      a: onlinePayments
        ? "You can pay cash on delivery, or online by card, UPI or netbanking at checkout. Some shops set a cash limit on larger orders — checkout will say so."
        : "We currently accept Cash on Delivery. Online payment isn't available yet.",
    },
  ];

  const channels = [
    s.supportPhone && {
      icon: Phone,
      label: "Call us",
      value: s.supportPhone,
      href: `tel:${digits(s.supportPhone)}`,
      tone: "bg-blue/12 text-blue",
    },
    s.supportWhatsapp && {
      icon: MessageCircle,
      label: "WhatsApp",
      value: s.supportWhatsapp,
      href: `https://wa.me/${digits(s.supportWhatsapp)}`,
      tone: "bg-green/12 text-green",
    },
    s.supportEmail && {
      icon: Mail,
      label: "Email",
      value: s.supportEmail,
      href: `mailto:${s.supportEmail}`,
      tone: "bg-accent/12 text-accent",
    },
  ].filter(Boolean) as {
    icon: typeof Phone;
    label: string;
    value: string;
    href: string;
    tone: string;
  }[];

  return (
    <ProfileSubpage title="Help & support">
      <div className="space-y-3">
        {faq.map((item) => (
          <div key={item.q} className="card p-4">
            <h2 className="text-[15px] font-bold">{item.q}</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted">{item.a}</p>
          </div>
        ))}
      </div>

      {channels.length ? (
        <div className="mt-6 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            Contact {s.businessName} support
          </p>
          {channels.map((c) => {
            const Icon = c.icon;
            return (
              <a
                key={c.label}
                href={c.href}
                className="press flex items-center gap-3 rounded-xl border border-line bg-surface p-3.5"
              >
                <span
                  className={`grid size-9 shrink-0 place-items-center rounded-full ${c.tone}`}
                >
                  <Icon className="size-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-xs text-muted">{c.label}</span>
                  <span className="block truncate text-sm font-semibold">
                    {c.value}
                  </span>
                </span>
              </a>
            );
          })}
        </div>
      ) : (
        <p className="mt-6 text-center text-sm text-muted">
          Still need help? Reach us from the Orders screen.
        </p>
      )}

      <Link
        href="/orders"
        className="press mt-4 flex w-full items-center justify-center rounded-full border border-line bg-surface py-3.5 text-sm font-bold"
      >
        View my orders
      </Link>
    </ProfileSubpage>
  );
}
