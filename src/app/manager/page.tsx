import type { Metadata } from "next";
import { ClipboardList, Bike, PhoneCall } from "lucide-react";
import { getProfile } from "@/lib/auth";

export const metadata: Metadata = { title: "Manager · Deligro" };

// Minimal operational hub. The scoped manager tools (phone-in orders, live
// order board, rider dispatch) are being built out; this establishes the gated
// portal and states the role's scope. See migrations 0022/0023 for the matching
// database permissions.
const SECTIONS = [
  {
    icon: PhoneCall,
    title: "Phone-in orders",
    note: "Place an order for a customer who called in — coming next.",
  },
  {
    icon: ClipboardList,
    title: "Live orders",
    note: "Watch and advance orders across every vendor.",
  },
  {
    icon: Bike,
    title: "Dispatch",
    note: "Assign and track riders on active deliveries.",
  },
];

export default async function ManagerHome() {
  const profile = await getProfile();
  const name = profile?.full_name?.trim() || "Manager";

  return (
    <div className="mx-auto w-full max-w-md">
      <header className="pt-2">
        <p className="text-sm font-semibold text-muted">Deligro · Operations</p>
        <h1 className="mt-1 text-[23px] font-extrabold tracking-tight">
          Hi, {name}
        </h1>
        <p className="mt-1.5 text-sm text-muted">
          You have operational access — orders and dispatch. Fees, settlements,
          and vendor management stay with the admin team.
        </p>
      </header>

      <div className="mt-6 space-y-3">
        {SECTIONS.map(({ icon: Icon, title, note }) => (
          <div
            key={title}
            className="flex items-start gap-3 rounded-2xl border border-line bg-surface p-4"
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-surface-2 text-ink">
              <Icon className="size-5" />
            </span>
            <div>
              <p className="text-[15px] font-bold text-ink">{title}</p>
              <p className="mt-0.5 text-sm text-muted">{note}</p>
            </div>
          </div>
        ))}
      </div>

      <form action="/auth/signout" method="post" className="mt-8">
        <button
          type="submit"
          className="press block w-full text-center text-sm font-semibold text-muted hover:text-ink"
        >
          Sign out
        </button>
      </form>
    </div>
  );
}
