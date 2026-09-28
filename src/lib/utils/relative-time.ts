// Server components run in UTC; every label here is read by people in India.
const IST = "Asia/Kolkata";

/** Relative label e.g. "2 min ago" for kitchen boards. */
export function formatRelativeTime(iso: string): string {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60_000);

  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;

  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;

  return date.toLocaleDateString("en-IN", { weekday: "short", timeZone: IST });
}

/** Absolute date + time e.g. "24 Jul, 8:24 PM" for order feeds. */
export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  const day = date.toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: IST });
  const time = date.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: IST,
  });
  return `${day}, ${time}`;
}
