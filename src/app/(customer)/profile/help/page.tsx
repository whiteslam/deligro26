import Link from "next/link";
import { ProfileSubpage } from "@/components/profile/profile-subpage";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

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
      <p className="mt-6 text-center text-sm text-muted">
        Still need help?{" "}
        <a href="mailto:support@deligro.app" className="font-semibold text-accent-ink">
          support@deligro.app
        </a>
      </p>
      <Link
        href="/orders"
        className="press mt-4 flex w-full items-center justify-center rounded-full border border-line bg-surface py-3.5 text-sm font-bold"
      >
        View my orders
      </Link>
    </ProfileSubpage>
  );
}
