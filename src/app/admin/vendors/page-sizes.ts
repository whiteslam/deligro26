/**
 * Rows per page for the admin vendor directory.
 *
 * Lives in a module with no `"use client"` and no `"server-only"` so both the
 * server page and the search bar can share one array. Importing this constant
 * from the client component into the RSC is how Turbopack handed the page a
 * stub with no `.includes`.
 *
 * The first entry is the default, and is what the page falls back to for an
 * absent or bogus `?per=` — so the list can never be talked into an unbounded
 * query. `listVendors` caps at 100 as well.
 */
export const PAGE_SIZES = [25, 50, 100];
