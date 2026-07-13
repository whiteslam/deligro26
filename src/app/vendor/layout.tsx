import { RoleTopBar } from "@/components/roles/role-ui";
import { PortalNav } from "@/components/roles/portal-nav";
import { requireRole } from "@/lib/auth";
import { getOwnedRestaurantFromDb } from "@/lib/data-access/restaurants";
import { isSupabaseConfigured } from "@/lib/supabase/config";

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

  // Whose shop this actually is. The top bar used to read "Restaurant · Saffron
  // Kitchen" for every vendor, on every page — a hardcoded string, while the
  // real name was one query away.
  const owned = isSupabaseConfigured ? await getOwnedRestaurantFromDb() : null;
  const name = owned?.name ?? "Restaurant";

  return (
    <div className="dashboard-shell">
      <RoleTopBar
        role={`Restaurant · ${name}`}
        accent="var(--accent)"
        nav={<PortalNav links={LINKS} />}
      />
      <main className="dashboard-main">{children}</main>
    </div>
  );
}
