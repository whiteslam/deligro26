/**
 * Guest-mode primitive.
 *
 * A guest is a visitor who tapped "Explore as guest" on the entry screen — no
 * Supabase session, but explicitly allowed into the view-only feed. We mark
 * that choice with a cookie so the *proxy* (edge route gate) and *server
 * components* (guest-aware UI) agree on the same three states:
 *
 *   user  — real Supabase session      → full access
 *   guest — this cookie, no session     → browse-only, gated actions bounce
 *   anon  — neither                      → blocked, sent to /welcome
 *
 * This file holds only the constant so it is safe to import from the proxy
 * runtime. Cookie *writes* live in ./guest-actions ("use server").
 */
export const GUEST_COOKIE = "deligro-guest";

/** 30 days — long enough that a guest isn't nagged every session. */
export const GUEST_MAX_AGE = 60 * 60 * 24 * 30;
