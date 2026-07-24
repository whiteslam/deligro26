import Link from "next/link";
import { Phone, Mail, MessageCircle } from "lucide-react";
import { ProfileSubpage } from "@/components/profile/profile-subpage";
import { requireUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

/** Strip a phone number down to digits for tel:/wa.me links. */
function digits(s: string) {
  return s.replace(/[^\d]/g, "");
}

const FAQ = [
  {
    q: "Where is my order?",
    a: "Open Orders and tap your active order to see live tracking on the map.",
  },
  {
    q: "How do I cancel?",
    a: "You can cancel from the order tracking screen before the kitchen starts preparing your food.",
  },
  {
    q: "Payment methods",
    a: "We currently support Cash on Delivery. Online payments are coming soon.",
  },
];

export default async function HelpPage() {
  await requireUser();
  const s = await getSettings();

  const channels = [
    s.supportPhone && {
      icon: Phone,
      label: "Call us",
      value: s.supportPhone,
      href: `tel:${digits(s.supportPhone)}`,
    },
    s.supportWhatsapp && {
      icon: MessageCircle,
      label: "WhatsApp",
      value: s.supportWhatsapp,
      href: `https://wa.me/${digits(s.supportWhatsapp)}`,
    },
    s.supportEmail && {
      icon: Mail,
      label: "Email",
      value: s.supportEmail,
      href: `mailto:${s.supportEmail}`,
    },
  ].filter(Boolean) as {
    icon: typeof Phone;
    label: string;
    value: string;
    href: string;
  }[];

  return (
    <ProfileSubpage title="Help & support">
      <div className="space-y-3">
        {FAQ.map((item) => (
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
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-accent-soft text-accent-ink">
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
