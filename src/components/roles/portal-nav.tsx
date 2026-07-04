"use client";

import { usePathname } from "next/navigation";
import { RoleNavLink } from "@/components/roles/role-ui";

/** Renders a set of nav links with active state from the current path. */
export function PortalNav({
  links,
}: {
  links: { href: string; label: string }[];
}) {
  const pathname = usePathname();
  return (
    <>
      {links.map((l) => (
        <RoleNavLink
          key={l.href}
          href={l.href}
          active={pathname === l.href}
        >
          {l.label}
        </RoleNavLink>
      ))}
    </>
  );
}
