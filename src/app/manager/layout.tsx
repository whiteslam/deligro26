import { StatusBar } from "@/components/layout/status-bar";
import { requireRole } from "@/lib/auth";

// The Manager / Sub-Admin portal. Managers are primarily a mobile client, but
// this web route exists so a manager who signs in on the web lands somewhere
// real (roleHome → /manager) rather than 404-ing, and so the role is gated
// server-side. Super-admins may also open it.
export default async function ManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole(["manager", "admin"]);

  return (
    <div className="device">
      <div className="app-shell">
        <div className="app-scroll no-scrollbar px-4 pb-6 pt-4">{children}</div>
        <StatusBar />
      </div>
    </div>
  );
}
