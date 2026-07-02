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
