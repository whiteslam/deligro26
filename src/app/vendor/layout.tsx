import { RoleTopBar } from "@/components/roles/role-ui";
import { PortalNav } from "@/components/roles/portal-nav";
import { requireRole } from "@/lib/auth";

const LINKS = [
  { href: "/vendor", label: "Orders" },
  { href: "/vendor/menu", label: "Menu" },
  { href: "/vendor/earnings", label: "Earnings" },
  { href: "/vendor/settings", label: "Shop" },
];

export default async function RestaurantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole("restaurant"); // vendor accounts only
  return (
    <div className="dashboard-shell">
      <RoleTopBar
        role="Restaurant · Saffron Kitchen"
        accent="var(--accent)"
        nav={<PortalNav links={LINKS} />}
      />
      <main className="dashboard-main">{children}</main>
    </div>
  );
}
