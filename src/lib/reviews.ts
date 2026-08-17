/**
 * The rules behind a review, in a module both the server and the client can read
 * — the data layer validates by them, the forms quote them back to the customer.
 * Same arrangement as `popularity.ts` and `vendor-ranking.ts`.
 *
 * Nothing here touches the database or reads config. The two *durations* (how
 * long you may review, how long you may edit) are operator-tunable and therefore
 * live in `platform_settings`, not here — a constant would put them beyond the
 * admin's reach. What lives here are the limits that are structural: the shape of
 * a rating, the length of the text, how many photos, and what the statuses mean.
 *
 * These numbers are also enforced by CHECK constraints in migration 0033. This
 * module exists so a form can refuse a 1,001st character before a round-trip, not
 * so the client can be trusted about it.
 */

/** Overall rating domain, matching the 0006 CHECK. */
export const RATING_MIN = 1;
export const RATING_MAX = 5;

/** Matches the `reviews_comment_len` CHECK in 0033. */
export const REVIEW_TEXT_MAX = 1000;

/** Matches the `reviews_photos_max` CHECK in 0033. */
export const REVIEW_PHOTOS_MAX = 5;

/** Matches the `review_replies.reply_text` CHECK in 0033. */
export const REPLY_TEXT_MAX = 1000;

/** Matches the `review_flags.notes` CHECK in 0033. */
export const FLAG_NOTES_MAX = 500;

/** Matches the `review_moderation_log.reason` CHECK in 0033. */
export const MODERATION_REASON_MAX = 500;

/**
 * Where a review stands.
 *
 * There is no `pending_moderation` or `hidden_by_system`: moderation here is
 * reactive — reviews publish immediately and the queue is fed by flags, not by a
 * submission filter — so nothing could ever produce one. See the header of
 * migration 0033.
 */
export type ReviewStatus = "published" | "hidden_by_admin" | "removed";

export const REVIEW_STATUSES: ReviewStatus[] = [
  "published",
  "hidden_by_admin",
  "removed",
];

export function isReviewStatus(value: unknown): value is ReviewStatus {
  return (
    value === "published" ||
    value === "hidden_by_admin" ||
    value === "removed"
  );
}

/** How the UI names each status, so a label cannot drift from the enum. */
export const REVIEW_STATUS_LABEL: Record<ReviewStatus, string> = {
  published: "Published",
  hidden_by_admin: "Hidden",
  removed: "Removed",
};

/** Only `published` reviews count toward a shop's rating, or appear publicly. */
export function countsTowardRating(status: ReviewStatus): boolean {
  return status === "published";
}

/**
 * The optional sub-ratings, in the order the form shows them.
 *
 * All four are optional by design. The delivered-order screen asks for one tap
 * and gets a high response rate; demanding four would cost more reviews than the
 * extra detail is worth. They are collected, not required.
 */
export const SUB_RATINGS = [
  {
    key: "foodQuality",
    column: "food_quality",
    label: "Food quality",
    hint: "Taste, temperature, portion",
  },
  {
    key: "packaging",
    column: "packaging",
    label: "Packaging",
    hint: "Sealed, intact, no spills",
  },
  {
    key: "deliveryExperience",
    column: "delivery_experience",
    label: "Delivery",
    hint: "Speed and the rider",
  },
  {
    key: "valueForMoney",
    column: "value_for_money",
    label: "Value for money",
    hint: "Worth what you paid",
  },
] as const;

export type SubRatingKey = (typeof SUB_RATINGS)[number]["key"];

/** Why a review was reported. Mirrors the `review_flag_reason` enum (0033). */
export type ReviewFlagReason =
  | "offensive"
  | "fake_or_spam"
  | "unrelated"
  | "personal_info"
  | "other";

export const FLAG_REASONS: {
  value: ReviewFlagReason;
  label: string;
  hint: string;
}[] = [
  {
    value: "offensive",
    label: "Offensive language",
    hint: "Abuse, slurs, or threats",
  },
  {
    value: "fake_or_spam",
    label: "Fake or spam",
    hint: "Not a real customer experience, or advertising",
  },
  {
    value: "unrelated",
    label: "Not about this order",
    hint: "Reviews a different shop, or something we didn't sell",
  },
  {
    value: "personal_info",
    label: "Exposes personal information",
    hint: "A phone number, address, or somebody's name",
  },
  { value: "other", label: "Something else", hint: "Explain in the notes" },
];

export function isFlagReason(value: unknown): value is ReviewFlagReason {
  return FLAG_REASONS.some((r) => r.value === value);
}

/** How a flag was decided. Mirrors the `review_flag_status` enum (0033). */
export type ReviewFlagStatus = "open" | "upheld" | "rejected";

/** What an admin did. Mirrors the `review_moderation_action` enum (0033). */
export type ModerationAction =
  | "hidden"
  | "restored"
  | "removed"
  | "reply_removed"
  | "flag_upheld"
  | "flag_rejected";

export const MODERATION_ACTION_LABEL: Record<ModerationAction, string> = {
  hidden: "Hidden from the public",
  restored: "Restored",
  removed: "Removed",
  reply_removed: "Vendor reply removed",
  flag_upheld: "Report upheld",
  flag_rejected: "Report rejected",
};

/* ============================================================
   Windows — the shared arithmetic, given a duration from settings
   ============================================================ */

/**
 * Is a review still editable by its author?
 *
 * Mirrors `review_edit_open()` in 0033 exactly. The database decides; this lets
 * the UI stop offering an Edit button it knows would be refused, and lets a test
 * assert the boundary without a database.
 */
export function isEditWindowOpen(
  createdAt: string | Date,
  editWindowHours: number,
  now: Date = new Date()
): boolean {
  const created = new Date(createdAt).getTime();
  if (!Number.isFinite(created)) return false;
  return now.getTime() < created + editWindowHours * 60 * 60 * 1000;
}

/**
 * Is an order still inside its review window?
 *
 * Mirrors `review_window_open()` in 0033, including its fallback chain: the
 * delivery timestamp when there is one, otherwise the kitchen's ready time,
 * otherwise when the order was placed. Every fallback is earlier than the real
 * delivery, so a missing timestamp closes the window sooner rather than leaving
 * it open.
 */
export function isReviewWindowOpen(
  order: {
    deliveredAt?: string | Date | null;
    readyAt?: string | Date | null;
    createdAt: string | Date;
  },
  reviewWindowDays: number,
  now: Date = new Date()
): boolean {
  const anchor = order.deliveredAt ?? order.readyAt ?? order.createdAt;
  const start = new Date(anchor).getTime();
  if (!Number.isFinite(start)) return false;
  return now.getTime() < start + reviewWindowDays * 24 * 60 * 60 * 1000;
}

/** Clamp a rating to the 1–5 domain, or null when it isn't a rating at all. */
export function normalizeRating(value: unknown): number | null {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  const rounded = Math.round(n);
  if (rounded < RATING_MIN || rounded > RATING_MAX) return null;
  return rounded;
}

/**
 * A shop's displayed rating, or null when it has none.
 *
 * `rating_count === 0` is the "unrated" signal — migration 0033's backfill sets
 * `rating` to 0 for a shop with no published reviews, and rendering that as
 * "0.0" would be worse than the seeded 4.5 it replaced. Every surface that shows
 * a rating goes through here.
 */
export function displayRating(
  rating: number,
  ratingCount: number
): number | null {
  if (ratingCount <= 0) return null;
  if (!Number.isFinite(rating) || rating <= 0) return null;
  return rating;
}
