import { THEME_BG } from "@/lib/theme-colors";

/**
 * Web manifests for the three portal apps, so "Add to Home Screen" on an
 * iPhone (and Android Chrome) installs the vendor, rider or manager app —
 * not the customer app the root manifest.ts describes. Admin is website-only
 * by decision (28 Sept 2026) and has none.
 *
 * Names match the Android APKs (mobile/roles.json) so a person with both
 * sees one app name.
 */
export type PortalRole = "vendor" | "rider" | "manager";

export const ROLE_APP_TITLE: Record<PortalRole, string> = {
  vendor: "Deligro Partner",
  rider: "Deligro Rider",
  manager: "Deligro Manager",
};

const START: Record<PortalRole, string> = {
  vendor: "/vendor",
  rider: "/driver",
  manager: "/manager",
};

export interface RoleManifest {
  id: string;
  name: string;
  short_name: string;
  start_url: string;
  scope: string;
  display: "standalone";
  orientation: "portrait";
  background_color: string;
  theme_color: string;
  icons: { src: string; sizes: string; type: string; purpose: "any" | "maskable" }[];
}

export function isPortalRole(value: string): value is PortalRole {
  return value === "vendor" || value === "rider" || value === "manager";
}

export function buildRoleManifest(role: PortalRole): RoleManifest {
  return {
    // Distinct id per role: the same device can install all of them.
    id: `/app/${role}`,
    name: ROLE_APP_TITLE[role],
    short_name: ROLE_APP_TITLE[role].replace("Deligro ", ""),
    start_url: START[role],
    // "/" rather than the portal path: sign-in goes through /{role}/login and
    // /switch, which must stay inside the installed app.
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: THEME_BG.light,
    theme_color: THEME_BG.light,
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
