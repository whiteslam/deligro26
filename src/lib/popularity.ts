/**
 * The rules behind "Popular", in a module both the server and the client can
 * read — the data layer ranks by them, and the UI quotes them back to the user.
 * Keep the numbers here and nowhere else: a caption that disagrees with the
 * ranking is worse than no caption.
 */

/** Rolling window the ranking counts orders over. */
export const POPULARITY_WINDOW_DAYS = 30;

/** How many dishes the Popular tab holds at most. */
export const POPULAR_LIMIT = 8;

/** Below this many dishes with sales, the window is too thin to rank honestly. */
export const MIN_RANKED = 3;

/** How a Popular list was arrived at — the UI captions itself from this. */
export type PopularBasis = "orders" | "picks";
