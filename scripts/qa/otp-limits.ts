/**
 * QA — OTP send limits.
 *
 * The question this suite answers: when someone keeps asking for codes, does
 * the server stop them at the right point, and does it tell them *exactly*
 * when they may try again? A vague "try later" was the bug — the login screen
 * could not say until when, so people kept pressing Resend.
 *
 * Runs offline — no Supabase, no SMS, no environment. Tests the pure
 * `lib/auth/otp-limits.ts`, which `createOtp` runs every request through.
 *
 * Usage:
 *   npm run test:otp-limits
 */
import {
  OTP_LIMITS,
  checkOtpLimits,
  istDayStart,
  nextIstMidnight,
} from "../../src/lib/auth/otp-limits";

let passed = 0;
let failed = 0;

function check(name: string, actual: unknown, expected: unknown): void {
  if (Object.is(actual, expected)) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.log(`  ✗ ${name} — expected ${String(expected)}, got ${String(actual)}`);
  }
}

const MIN = 60_000;
const HOUR = 60 * MIN;

// 2026-10-03 14:00 IST == 08:30 UTC.
const NOW = Date.UTC(2026, 9, 3, 8, 30);

console.log("\nIST calendar day");
check("day starts at 00:00 IST (18:30 UTC the day before)", istDayStart(NOW), Date.UTC(2026, 9, 2, 18, 30));
check("next midnight is 00:00 IST tomorrow", nextIstMidnight(NOW), Date.UTC(2026, 9, 3, 18, 30));
// 23:59 IST — one minute before the reset.
const LATE = Date.UTC(2026, 9, 3, 18, 29);
check("23:59 IST still belongs to today", istDayStart(LATE), Date.UTC(2026, 9, 2, 18, 30));
// 00:01 IST — just after it.
const EARLY = Date.UTC(2026, 9, 3, 18, 31);
check("00:01 IST is a new day", istDayStart(EARLY), Date.UTC(2026, 9, 3, 18, 30));

console.log("\nFirst send");
{
  const v = checkOtpLimits([], NOW);
  check("allowed", v.ok, true);
  check("remaining today after it", v.ok && v.remainingToday, OTP_LIMITS.perDay - 1);
}

console.log("\nResend cooldown");
{
  const v = checkOtpLimits([NOW - 10_000], NOW);
  check("blocked 10s after the last send", v.ok, false);
  check("as cooldown", !v.ok && v.error, "cooldown");
  check("retry after the remaining 20s", !v.ok && v.retryAfter, 20);
  const later = checkOtpLimits([NOW - 31_000], NOW);
  check("allowed after 31s", later.ok, true);
}

console.log("\nHourly cap");
{
  // Six sends in the last hour, the oldest 50 minutes ago.
  const sends = [50, 40, 30, 20, 10, 5].map((m) => NOW - m * MIN);
  const v = checkOtpLimits(sends, NOW);
  check("7th within an hour is blocked", v.ok, false);
  check("as too_many", !v.ok && v.error, "too_many");
  // Not a flat hour: the oldest send ages out in 10 minutes.
  check("retry when the oldest ages out (10 min)", !v.ok && v.retryAfter, 10 * 60);
  // Sends older than an hour don't count toward it.
  const old = [70, 65, 62, 40, 30, 5].map((m) => NOW - m * MIN);
  check("sends older than an hour don't count", checkOtpLimits(old, NOW).ok, true);
}

console.log("\nDaily cap");
{
  // Ten sends today, spread out so neither the cooldown nor the hourly cap trips.
  const sends = Array.from({ length: OTP_LIMITS.perDay }, (_, i) => NOW - (i + 2) * HOUR / 2 - HOUR);
  const v = checkOtpLimits(sends, NOW);
  check("11th today is blocked", v.ok, false);
  check("as daily_limit", !v.ok && v.error, "daily_limit");
  check(
    "retry at IST midnight",
    !v.ok && v.retryAfter,
    Math.ceil((nextIstMidnight(NOW) - NOW) / 1000),
  );
  // Yesterday's sends don't count.
  const yesterday = sends.map((t) => t - 24 * HOUR);
  check("yesterday's sends don't count", checkOtpLimits(yesterday, NOW).ok, true);
  // The daily verdict wins over the cooldown: it's the one that matters.
  const withRecent = [...sends.slice(1), NOW - 5_000];
  const w = checkOtpLimits(withRecent, NOW);
  check("daily limit outranks the cooldown", !w.ok && w.error, "daily_limit");
}

console.log("\nRemaining count");
{
  const sends = Array.from({ length: 7 }, (_, i) => NOW - (i + 2) * HOUR);
  const v = checkOtpLimits(sends, NOW);
  check("3 left before this send → 2 after it", v.ok && v.remainingToday, 2);
}

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
