/**
 * The app's own public origin.
 *
 * Needed in three places that must all agree: `metadataBase` (which turns the
 * relative image and canonical paths in page metadata into the absolute URLs
 * crawlers and WhatsApp require), `sitemap.ts`, and `robots.ts`. Deriving it
 * separately in each is how one of them ends up pointing at localhost in
 * production and quietly de-indexing the site.
 *
 * Not `NEXT_PUBLIC_` — nothing in the browser needs it, and the client already
 * knows its own origin. Falls back to the dev port this app actually runs on
 * (3005, per package.json), so a local build produces working absolute URLs
 * rather than throwing.
 */
export const SITE_URL = (
  process.env.SITE_URL ?? "http://localhost:3005"
).replace(/\/$/, "");

/**
 * Whether this deploy should be indexed at all.
 *
 * A preview or staging deploy sharing the production sitemap is a real SEO
 * problem — duplicate content under a second hostname. Defaults to false so a
 * new environment is invisible until someone opts it in deliberately: the
 * failure mode of a forgotten flag should be "not indexed", not "indexed twice".
 */
export const IS_INDEXABLE = process.env.SITE_INDEXABLE === "true";
