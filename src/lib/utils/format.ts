/** Money & display formatting helpers. Prices are stored as whole rupees. */

export function formatINR(amount: number): string {
  return "₹" + amount.toLocaleString("en-IN");
}

export function formatRating(rating: number): string {
  return rating.toFixed(1);
}

export function formatCount(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "k";
  return String(n);
}

/** e.g. "22–28 min" */
export function formatEta(min: number, max: number): string {
  return `${min}–${max} min`;
}

/**
 * "Gaurav Mirjha" → "GM", for avatar tiles. Falls back to a single letter and
 * then to "A" — an avatar chip with nothing in it reads as a rendering fault.
 */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "A";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * "3d 4h", "5h", "20m" — how long something has been waiting. Coarse on
 * purpose: an approval queue is scanned, not read, and "3d" carries the whole
 * decision where "3d 4h 12m" just costs a column.
 */
export function formatWaited(sinceIso: string, now = Date.now()): string {
  const ms = now - new Date(sinceIso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return "—";
  const mins = Math.floor(ms / 60_000);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  const rem = hours % 24;
  return rem ? `${days}d ${rem}h` : `${days}d`;
}
