import type { Role } from "@/lib/auth";

/**
 * Where each role belongs after authenticating. This is the single source of
 * truth for post-login routing — the login flow, the MFA hop and the customer
 * shell's operator-redirect all read it, so a vendor can never be stranded on
 * the customer UI again.
 *
 * Pure and side-effect free (no server-only imports), so it is safe to call from
 * client components and server components alike.
 */
export function roleHome(role: Role): string {
  switch (role) {
    case "restaurant":
      return "/vendor";
    case "driver":
      return "/driver";
    case "admin":
      return "/admin";
    case "manager":
      return "/manager";
    case "customer":
    default:
      return "/";
  }
}

/** The operator portal roots — everything else is the customer shell. */
const OPERATOR_PREFIXES = ["/vendor", "/driver", "/admin", "/manager"];

/** True when a path lives inside an operator portal (not the customer app). */
export function isOperatorPath(path: string): boolean {
  return OPERATOR_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));
}

/**
 * Resolve where a freshly-authenticated user should land, honoring an explicit
 * `next` only when it belongs to that user's own space:
 *
 *  - Operators land in their portal. A `next` is honored only if it is already
 *    inside that portal (e.g. a deep link to `/vendor/menu` that the proxy
 *    bounced through `/login`) — a vendor is never sent to a customer path.
 *  - Customers land on `next`, unless it points into an operator portal, in
 *    which case they fall back to the app root.
 *
 * `next` is accepted only as a same-origin, non-protocol-relative path, so it
 * can't be used as an open-redirect.
 */
export function landingFor(role: Role, next?: string | null): string {
  const home = roleHome(role);
  const target =
    next && next.startsWith("/") && !next.startsWith("//") ? next : null;

  if (role === "customer") {
    return target && !isOperatorPath(target) ? target : "/";
  }
  return target && (target === home || target.startsWith(`${home}/`))
    ? target
    : home;
}
