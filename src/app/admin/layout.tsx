import { RoleTopBar } from "@/components/roles/role-ui";
import { PortalNav } from "@/components/roles/portal-nav";
import { requireRole } from "@/lib/auth";

const LINKS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/refunds", label: "Refunds" },
  { href: "/admin/banners", label: "Campaigns" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole("admin"); // server-side gate — not just hidden in the UI
  return (
    <div className="dashboard-shell">
      <RoleTopBar
        role="Admin · Operations"
        accent="var(--green)"
        nav={<PortalNav links={LINKS} />}
      />
      <main className="dashboard-main">{children}</main>
    </div>
  );
}
