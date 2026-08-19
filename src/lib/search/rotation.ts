/**
 * The seed that rotates which kitchen champions a dish.
 *
 * Ranking with no exploration is a ratchet — see `ROTATION_BAND` in
 * `dishes.ts`. This supplies the "which day is it" half of that, and nothing
 * more: it is a plain date string, so two vendors who are genuinely comparable
 * trade places from one day to the next instead of one of them winning forever.
 *
 * ## Why it is computed on the server and passed down
 *
 * The alternative — reading the clock inside the client component that ranks —
 * produces a value the server render and the client render can disagree about
 * across a midnight boundary, which is a hydration mismatch in the one part of
 * the app that must not flicker. The customer pages are already
 * `force-dynamic`, so a per-request value costs nothing.
 *
 * ## Why it is not per-user
 *
 * A per-device seed would spread the rotation more evenly, but it also means no
 * two customers see the same ordering and no support conversation about "why is
 * this shop first?" can be answered. One seed a day is uniform, explicable, and
 * still breaks the ratchet. Revisit if vendor fairness needs finer control —
 * that is a deliberate trade, not an oversight.
 */
export function dailyRotationSeed(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
