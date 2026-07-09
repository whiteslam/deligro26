/**
 * Build plan + live delivery tracker — single source of truth for `/build`.
 *
 * A 5-week (~35 day) plan to take Deligro from "static UI + partial backend"
 * to a shippable v1. Update `status` as tasks land; the tracker route renders
 * straight from this file, so the page is always in sync with reality.
 *
 * status: "done" | "active" | "todo" | "blocked"
 */

export type TaskStatus = "done" | "active" | "todo" | "blocked";

export type BuildTab = "customer" | "vendor" | "driver" | "admin";

export interface Task {
  title: string;
  detail?: string;
  /** Postgres table / column this task touches — shown on `/build`. */
  db?: string;
  status: TaskStatus;
}

export interface Milestone {
  week: number;
  range: string; // human dates within the 1-month window
  title: string;
  goal: string;
  tasks: Task[];
}

export interface BuildTabConfig {
  id: BuildTab;
  label: string;
  portal: string;
  summary: string;
}

export const BUILD_TABS: BuildTabConfig[] = [
  {
    id: "customer",
    label: "Customer",
    portal: "/",
    summary: "Browse, OTP login, checkout, tracking",
  },
  {
    id: "vendor",
    label: "Vendor",
    portal: "/vendor",
    summary: "Restaurant owners — orders, menu, earnings",
  },
  {
    id: "driver",
    label: "Driver",
    portal: "/driver",
    summary: "Delivery partners — accept, pickup, deliver",
  },
  {
    id: "admin",
    label: "Admin",
    portal: "/admin",
    summary: "Platform ops — approvals, orders, refunds",
  },
];

/** Project window — set these to your real start date. */
export const PROJECT = {
  name: "Deligro",
  tagline: "Craving to doorstep",
  start: "2026-07-07",
  ship: "2026-08-06",
  durationLabel: "5 weeks · ~35 days",
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
    range: "Days 1–10",
    title: "Legacy DB → Supabase",
    goal: "Move real Bemetara data off the old MySQL export into the new app — catalog first, then customers & history.",
    tasks: [
      {
        title: "Legacy DB audit",
        detail: "docs/LEGACY_DB_AUDIT.md — 49 tables, 5 active shops, security findings",
        status: "done",
      },
      {
        title: "Catalog ETL + SQL seed generator",
        detail: "import-legacy-catalog.ts, generate-legacy-seed-sql.ts, legacy_catalog.sql",
        status: "done",
      },
      {
        title: "Pexels images for migrated catalog",
        detail: "Category-based CDN URLs when legacy storage paths are unavailable",
        status: "done",
      },
      {
        title: "Seed catalog in Supabase",
        detail: "All 62 Bemetara shops + ~4k menu items — active & inactive (is_open from legacy status)",
        db: "restaurants · menu_items",
        status: "active",
      },
      {
        title: "Legacy delivery rules in app",
        detail: "Min order ₹49, free delivery above ₹499, radius from settings row",
        status: "todo",
      },
      {
        title: "Per-restaurant vendor accounts",
        detail: "One owner per migrated shop — not all under vendor@deligro.demo",
        db: "auth.users · profiles.role = restaurant · restaurants.owner_id",
        status: "done",
      },
      {
        title: "Customer import (phone OTP)",
        detail: "3,577 unique phones imported — no plaintext passwords; OTP re-verify",
        db: "auth.users · profiles.role = customer · profiles.phone",
        status: "done",
      },
      {
        title: "Order history import",
        detail: "13k orders — parse pname HTML into order_items rows",
        status: "todo",
      },
      {
        title: "Reviews import",
        detail: "491 reviews → ratings aggregate + optional reviews table",
        status: "todo",
      },
    ],
  },
  {
    week: 2,
    range: "Days 11–17",
    title: "Guest browse + phone-OTP order gate",
    goal: "Anyone can explore without an account; login is demanded only at order — via phone OTP.",
    tasks: [
      { title: "Skip onboarding for signed-in users", detail: "Gate the 3-slide carousel on auth, not just localStorage", status: "done" },
      { title: "Phone-number OTP login", detail: "Supabase phone auth (MSG91/Twilio provider); replace email+password form", status: "todo" },
      { title: "OTP verify screen", detail: "6-digit code entry, resend timer, rate-limited", status: "todo" },
      { title: "\"Order\" triggers auth", detail: "Guest hits checkout → OTP sheet → returns to checkout", status: "todo" },
      { title: "Post-login profile bootstrap", detail: "First name + save on first order", status: "todo" },
    ],
  },
  {
    week: 3,
    range: "Days 15–21",
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
    week: 4,
    range: "Days 22–28",
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
    week: 5,
    range: "Days 29–35",
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

/** Role-specific trackers — vendor / driver / admin portals + DB wiring. */
export const ROLE_MILESTONES: Record<Exclude<BuildTab, "customer">, Milestone[]> = {
  vendor: [
    {
      week: 0,
      range: "Shipped",
      title: "Vendor portal foundation",
      goal: "Restaurant owners can sign in and see their kitchen board scaffold.",
      tasks: [
        {
          title: "Portal routes + nav",
          detail: "/vendor · /vendor/menu · /vendor/earnings",
          db: "—",
          status: "done",
        },
        {
          title: "Role gate (restaurant only)",
          detail: "requireRole('restaurant') in vendor layout",
          db: "profiles.role = 'restaurant'",
          status: "done",
        },
        {
          title: "Kitchen order board UI",
          detail: "Incoming / preparing columns — VendorOrdersBoard",
          db: "orders.status · order_items",
          status: "done",
        },
        {
          title: "Live board from Supabase",
          detail: "listKitchenOrders() when configured; mock fallback",
          db: "orders WHERE restaurant_id = owns_restaurant()",
          status: "active",
        },
      ],
    },
    {
      week: 1,
      range: "Legacy migration",
      title: "Vendor data in Postgres",
      goal: "Every Bemetara shop has a listing, menu, and its own owner account.",
      tasks: [
        {
          title: "Legacy restaurant catalog",
          detail: "62 Bemetara shops + ~3.7k menu items seeded",
          db: "restaurants · menu_items.external_id LIKE 'legacy-%'",
          status: "done",
        },
        {
          title: "Per-shop owner accounts",
          detail: "62 auth users linked via restaurants.owner_id",
          db: "auth.users · profiles.role = restaurant · restaurants.owner_id",
          status: "done",
        },
        {
          title: "Owner login credentials",
          detail: "Temp passwords in .local/legacy-vendor-credentials.json",
          db: "auth.users (email + phone_confirm)",
          status: "done",
        },
        {
          title: "Menu availability toggles (live)",
          detail: "Owner writes menu_items.available via RLS",
          db: "menu_items.available · owns_restaurant()",
          status: "todo",
        },
        {
          title: "Restaurant open/closed toggle",
          detail: "Owner updates restaurants.is_open",
          db: "restaurants.is_open",
          status: "todo",
        },
      ],
    },
    {
      week: 2,
      range: "Operations",
      title: "Vendor on live orders",
      goal: "Accept → prepare → ready flows hit real rows, not mocks.",
      tasks: [
        {
          title: "Accept / reject incoming orders",
          detail: "Status placed → kitchen or cancelled",
          db: "orders.status",
          status: "todo",
        },
        {
          title: "Mark food ready",
          detail: "kitchen → ready; triggers driver queue",
          db: "orders.status · deliveries.status",
          status: "todo",
        },
        {
          title: "Realtime order updates",
          detail: "Supabase realtime on orders for owned restaurants",
          db: "orders (realtime)",
          status: "todo",
        },
        {
          title: "Earnings from real orders",
          detail: "/vendor/earnings aggregates order_items",
          db: "orders · order_items",
          status: "todo",
        },
      ],
    },
  ],
  driver: [
    {
      week: 0,
      range: "Shipped",
      title: "Driver portal foundation",
      goal: "Delivery partner UI scaffold with demo jobs.",
      tasks: [
        {
          title: "Portal route + layout",
          detail: "/driver — DriverBoard component",
          db: "—",
          status: "done",
        },
        {
          title: "Role gate (driver only)",
          detail: "requireRole('driver') in driver layout",
          db: "profiles.role = 'driver'",
          status: "done",
        },
        {
          title: "Demo job board",
          detail: "AVAILABLE_JOBS mock when Supabase unavailable",
          db: "—",
          status: "done",
        },
        {
          title: "Live board from Supabase",
          detail: "getDriverBoard() for assigned driver",
          db: "deliveries · orders",
          status: "active",
        },
      ],
    },
    {
      week: 1,
      range: "Schema",
      title: "Driver data model",
      goal: "Deliveries table links orders to drivers with status machine.",
      tasks: [
        {
          title: "Deliveries table + RLS",
          detail: "unassigned → assigned → picked_up → delivered",
          db: "deliveries.status · deliveries.driver_id",
          status: "done",
        },
        {
          title: "Driver profile seed",
          detail: "Demo driver@deligro.demo from db:seed-users",
          db: "profiles.role = 'driver'",
          status: "done",
        },
        {
          title: "Legacy driver import",
          detail: "No driver table in legacy MySQL — onboard fresh",
          db: "—",
          status: "done",
        },
      ],
    },
    {
      week: 2,
      range: "Operations",
      title: "Driver on live deliveries",
      goal: "Accept jobs, pickup OTP, delivery OTP, earnings.",
      tasks: [
        {
          title: "Online / offline toggle (persisted)",
          detail: "Driver availability flag on profile or separate table",
          db: "profiles (TBD)",
          status: "todo",
        },
        {
          title: "Accept available delivery",
          detail: "deliveries.status unassigned → assigned",
          db: "deliveries",
          status: "todo",
        },
        {
          title: "Pickup OTP verification",
          detail: "Restaurant reads orders.pickup_otp at handover",
          db: "orders.pickup_otp",
          status: "todo",
        },
        {
          title: "Delivery OTP verification",
          detail: "Customer reads orders.delivery_otp to rider",
          db: "orders.delivery_otp",
          status: "todo",
        },
        {
          title: "Trip history + earnings",
          detail: "Aggregate delivered deliveries per driver",
          db: "deliveries.delivered_at",
          status: "todo",
        },
      ],
    },
  ],
  admin: [
    {
      week: 0,
      range: "Shipped",
      title: "Admin portal foundation",
      goal: "Platform operator dashboards and navigation.",
      tasks: [
        {
          title: "Portal routes + nav",
          detail: "/admin · /admin/orders · /admin/refunds",
          db: "—",
          status: "done",
        },
        {
          title: "Role gate (admin only)",
          detail: "requireRole('admin') in admin layout",
          db: "profiles.role = 'admin' · is_admin()",
          status: "done",
        },
        {
          title: "Overview dashboard UI",
          detail: "Metrics cards — currently mock ADMIN_METRICS",
          db: "—",
          status: "done",
        },
      ],
    },
    {
      week: 1,
      range: "Data oversight",
      title: "Admin on live platform data",
      goal: "Metrics and queues reflect real Postgres rows.",
      tasks: [
        {
          title: "Live platform metrics",
          detail: "Orders today, GMV, active restaurants from DB",
          db: "orders · restaurants · profiles",
          status: "todo",
        },
        {
          title: "Restaurant approval queue",
          detail: "Toggle restaurants.approved for new vendors",
          db: "restaurants.approved",
          status: "todo",
        },
        {
          title: "All-orders list (live)",
          detail: "/admin/orders on orders + profiles join",
          db: "orders · profiles · restaurants",
          status: "active",
        },
        {
          title: "Refund queue (live)",
          detail: "/admin/refunds on refunds table",
          db: "refunds.status",
          status: "active",
        },
      ],
    },
    {
      week: 2,
      range: "Governance",
      title: "User & role management",
      goal: "Safely promote users to vendor / driver / admin.",
      tasks: [
        {
          title: "Role assignment tooling",
          detail: "Service-role script or admin UI — never client-writable",
          db: "profiles.role · lock_role() trigger",
          status: "todo",
        },
        {
          title: "Audit log for admin actions",
          detail: "refunds.decided_by already references profiles",
          db: "refunds.decided_by",
          status: "todo",
        },
        {
          title: "MFA enforcement for admin",
          detail: "Supabase MFA enrolment before sensitive actions",
          db: "auth.mfa_factors",
          status: "todo",
        },
        {
          title: "Legacy order history import",
          detail: "~13k orders from MySQL export",
          db: "orders · order_items",
          status: "todo",
        },
      ],
    },
  ],
};

export function isBuildTab(value: string | undefined): value is BuildTab {
  return BUILD_TABS.some((t) => t.id === value);
}

export function milestonesForTab(tab: BuildTab): Milestone[] {
  if (tab === "customer") return MILESTONES;
  return ROLE_MILESTONES[tab];
}

export const STATUS_META: Record<TaskStatus, { label: string; tint: string }> = {
  done: { label: "Done", tint: "var(--green)" },
  active: { label: "In progress", tint: "var(--accent)" },
  todo: { label: "To do", tint: "var(--muted)" },
  blocked: { label: "Blocked", tint: "var(--blue)" },
};

export function planProgress(milestones: Milestone[] = MILESTONES) {
  const all = milestones.flatMap((m) => m.tasks);
  const done = all.filter((t) => t.status === "done").length;
  const active = all.filter((t) => t.status === "active").length;
  return { done, active, total: all.length, pct: Math.round((done / all.length) * 100) };
}
