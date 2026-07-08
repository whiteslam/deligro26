/**
 * Build plan + live delivery tracker — single source of truth for `/build`.
 *
 * A 4-week (~30 day) plan to take Deligro from "static UI + partial backend"
 * to a shippable v1. Update `status` as tasks land; the tracker route renders
 * straight from this file, so the page is always in sync with reality.
 *
 * status: "done" | "active" | "todo" | "blocked"
 */

export type TaskStatus = "done" | "active" | "todo" | "blocked";

export interface Task {
  title: string;
  detail?: string;
  status: TaskStatus;
}

export interface Milestone {
  week: number;
  range: string; // human dates within the 1-month window
  title: string;
  goal: string;
  tasks: Task[];
}

/** Project window — set these to your real start date. */
export const PROJECT = {
  name: "Deligro",
  tagline: "Craving to doorstep",
  start: "2026-07-07",
  ship: "2026-08-06",
  durationLabel: "4 weeks · ~30 days",
};

export const MILESTONES: Milestone[] = [
  {
    week: 0,
    range: "Already shipped",
    title: "Foundation (done before Day 1)",
    goal: "Static customer UI + first backend slice already merged.",
    tasks: [
      { title: "Customer app UI/UX", detail: "Bento home, glass cart, tracking, dark mode", status: "done" },
      { title: "Cold-start splash + onboarding carousel", detail: "3 brand slides, once per device", status: "done" },
      { title: "Role portals scaffold", detail: "/vendor, /driver, /admin dashboards", status: "done" },
      { title: "Supabase auth + RLS backend", detail: "3-check model, security headers, rate limit", status: "done" },
      { title: "Live catalog + orders API + vendor board", detail: "Phase 2 wiring", status: "done" },
    ],
  },
  {
    week: 1,
    range: "Days 1–7",
    title: "Guest browse + phone-OTP order gate",
    goal: "Anyone can explore without an account; login is demanded only at order — via phone OTP.",
    tasks: [
      { title: "Skip onboarding for signed-in users", detail: "Gate the 3-slide carousel on auth, not just localStorage", status: "active" },
      { title: "Phone-number OTP login", detail: "Supabase phone auth (MSG91/Twilio provider); replace email+password form", status: "todo" },
      { title: "OTP verify screen", detail: "6-digit code entry, resend timer, rate-limited", status: "todo" },
      { title: "\"Order\" triggers auth", detail: "Guest hits checkout → OTP sheet → returns to checkout", status: "todo" },
      { title: "Post-login profile bootstrap", detail: "First name + save on first order", status: "todo" },
    ],
  },
  {
    week: 2,
    range: "Days 8–14",
    title: "Real ordering flow (address → order now → success)",
    goal: "End-to-end order from a real saved address to a live-tracked, successful order.",
    tasks: [
      { title: "Saved addresses (CRUD)", detail: "Replace mock ADDRESSES with per-user rows + RLS", status: "todo" },
      { title: "Add-address sheet", detail: "Map pin + manual entry, set default", status: "todo" },
      { title: "Checkout on live data", detail: "Address, timing, COD → POST /api/orders", status: "todo" },
      { title: "Order success screen", detail: "Confirmation + hand-off to live tracking", status: "todo" },
      { title: "Live order tracking", detail: "Status stepper wired to order status changes", status: "todo" },
    ],
  },
  {
    week: 3,
    range: "Days 15–21",
    title: "Restaurant · Driver · Admin on live data",
    goal: "All three operator portals run on the real DB, not mocks.",
    tasks: [
      { title: "Restaurant order board (live)", detail: "Accept/Reject → Food ready, realtime", status: "todo" },
      { title: "Menu availability toggles", detail: "Owner-only writes via owns_restaurant()", status: "todo" },
      { title: "Driver flow", detail: "Online toggle, available → accept → picked up → delivered", status: "todo" },
      { title: "Admin orders + refunds", detail: "Audited table, refund queue on live data", status: "todo" },
      { title: "Role assignment tooling", detail: "Promote users to vendor/driver/admin safely", status: "todo" },
    ],
  },
  {
    week: 4,
    range: "Days 22–30",
    title: "Payments, hardening, QA & launch",
    goal: "Payments live, security tightened, tested, deployed.",
    tasks: [
      { title: "Online payments (UPI/cards)", detail: "Razorpay/Stripe + webhook signature verify", status: "todo" },
      { title: "Distributed rate limit", detail: "Upstash/Vercel KV so limits hold across instances", status: "todo" },
      { title: "Nonce-based CSP", detail: "Drop 'unsafe-inline' from script-src", status: "todo" },
      { title: "MFA for admin/restaurant", detail: "Supabase MFA enrolment", status: "todo" },
      { title: "E2E QA + IDOR tests", detail: "Cross-account 404 checks, ZAP on staging", status: "todo" },
      { title: "Production deploy", detail: "Vercel + Supabase prod, env + migrations", status: "todo" },
    ],
  },
];

export const STATUS_META: Record<TaskStatus, { label: string; tint: string }> = {
  done: { label: "Done", tint: "var(--green)" },
  active: { label: "In progress", tint: "var(--accent)" },
  todo: { label: "To do", tint: "var(--muted)" },
  blocked: { label: "Blocked", tint: "var(--blue)" },
};

export function planProgress() {
  const all = MILESTONES.flatMap((m) => m.tasks);
  const done = all.filter((t) => t.status === "done").length;
  const active = all.filter((t) => t.status === "active").length;
  return { done, active, total: all.length, pct: Math.round((done / all.length) * 100) };
}
