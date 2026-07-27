/**
 * India (Asia/Kolkata) calendar helpers for vendor analytics windows.
 * Server default TZ is often UTC (Vercel); UI is en-IN.
 */

const IST = "Asia/Kolkata";

/** YYYY-MM-DD in IST for a given instant. */
export function istDateKey(d = new Date()): string {
  return d.toLocaleDateString("en-CA", { timeZone: IST });
}

/** Start of the IST calendar day containing `d`, as a UTC Date. */
export function startOfIstDay(d = new Date()): Date {
  return new Date(`${istDateKey(d)}T00:00:00+05:30`);
}

/** Start of the IST week (Monday) containing `d`. */
export function startOfIstWeek(d = new Date()): Date {
  const start = startOfIstDay(d);
  // getDay() in local — use IST weekday via formatter
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: IST,
    weekday: "short",
  }).format(d);
  const map: Record<string, number> = {
    Mon: 0,
    Tue: 1,
    Wed: 2,
    Thu: 3,
    Fri: 4,
    Sat: 5,
    Sun: 6,
  };
  const offset = map[weekday] ?? 0;
  start.setTime(start.getTime() - offset * 24 * 60 * 60 * 1000);
  return start;
}

/** Start of the IST calendar month containing `d`. */
export function startOfIstMonth(d = new Date()): Date {
  const key = istDateKey(d);
  const [y, m] = key.split("-").map(Number);
  return new Date(
    `${y}-${String(m).padStart(2, "0")}-01T00:00:00+05:30`
  );
}

/** Add calendar days to an IST-midnight Date. */
export function addIstDays(d: Date, days: number): Date {
  const next = new Date(d);
  next.setTime(next.getTime() + days * 24 * 60 * 60 * 1000);
  return next;
}
