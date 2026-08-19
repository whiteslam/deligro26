import type { MetadataRoute } from "next";
import { IS_INDEXABLE, SITE_URL } from "@/lib/site";

/**
 * What crawlers may read.
 *
 * The allow-list is deliberately narrow: the storefront and the restaurant
 * pages, which are the only things here that are both public and worth finding.
 * Everything else is either user data, an operator console, or a sign-in door —
 * none of which should appear in a search result, and several of which would
 * leak the shape of the admin surface if they did.
 *
 * Disallowing a path is not a security control; it only asks well-behaved
 * crawlers not to look. The operator portals are protected by src/proxy.ts and
 * requireRole(), and that is what actually keeps them shut.
 */
export default function robots(): MetadataRoute.Robots {
  if (!IS_INDEXABLE) {
    // A staging or preview deploy. Refuse everything rather than compete with
    // production for its own queries.
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/search", "/restaurant/", "/stores"],
        disallow: [
          "/api/",
          "/admin",
          "/vendor",
          "/driver",
          "/manager",
          "/portals",
          "/switch",
          "/build",
          "/login",
          "/checkout",
          "/orders",
          "/profile",
          "/location",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
