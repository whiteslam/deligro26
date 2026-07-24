/* ============================================================
   Mock data for the role dashboards (Driver / Restaurant / Admin).
   Phase 1 = static UI. In production these come from the SAME backend
   API as the customer app, gated by server-side role + ownership checks
   (a /driver URL is a UI convenience, not a security boundary).
   Money is whole rupees — render with formatINR().
   ============================================================ */

export interface RoleOrderLine {
  name: string;
  qty: number;
  price: number;
  description?: string | null;
  imageUrl?: string | null;
}

/* ---------- Restaurant (merchant) ---------- */
export interface KitchenOrderCustomer {
  name: string;
  phone: string | null;
  initials: string;
}

export interface KitchenOrder {
  id: string;
  code: string; // short human ref, e.g. "#D-4821"
  customer: string;
  customerProfile?: KitchenOrderCustomer;
  area: string;
  deliveryLine?: string;
  placedAgo: string; // "2 min ago"
  placedAt: string; // absolute date/time for history cards
  lines: RoleOrderLine[];
  total: number;
  note?: string;
  status?: string;
}

export const RESTAURANT_NAME = "Saffron Kitchen";

export const INCOMING_ORDERS: KitchenOrder[] = [
  {
    id: "o-4821",
    code: "#D-4821",
    customer: "Aarav M.",
    area: "Koramangala 5th Block",
    placedAgo: "just now",
    placedAt: "Tue, 21 Jul, 10:00 pm",
    lines: [
      { name: "Hyderabadi Dum Biryani", qty: 2, price: 320 },
      { name: "Garlic Naan", qty: 2, price: 70 },
    ],
    total: 780,
    note: "Less spicy please",
  },
  {
    id: "o-4822",
    code: "#D-4822",
    customer: "Priya S.",
    area: "HSR Layout Sector 2",
    placedAgo: "1 min ago",
    placedAt: "Tue, 21 Jul, 9:59 pm",
    lines: [
      { name: "Paneer Butter Masala", qty: 1, price: 260 },
      { name: "Jeera Rice", qty: 1, price: 140 },
    ],
    total: 400,
  },
  {
    id: "o-4823",
    code: "#D-4823",
    customer: "Rahul K.",
    area: "Indiranagar 12th Main",
    placedAgo: "3 min ago",
    placedAt: "Tue, 21 Jul, 9:57 pm",
    lines: [{ name: "Chicken Biryani", qty: 3, price: 300 }],
    total: 900,
  },
];

export const PREPARING_ORDERS: KitchenOrder[] = [
  {
    id: "o-4818",
    code: "#D-4818",
    customer: "Neha R.",
    area: "BTM Layout",
    placedAgo: "8 min ago",
    placedAt: "Tue, 21 Jul, 9:52 pm",
    lines: [
      { name: "Mutton Rogan Josh", qty: 1, price: 380 },
      { name: "Butter Naan", qty: 3, price: 60 },
    ],
    total: 560,
  },
];

/* ---------- Driver (rider) ---------- */
export interface DeliveryJob {
  id: string;
  code: string;
  restaurant: string;
  pickupArea: string;
  dropArea: string;
  /** Undefined when the shop or the address has no coordinates. */
  distanceKm?: number;
  payout: number;
  items: number;
  customer: string;
}

export const AVAILABLE_JOBS: DeliveryJob[] = [
  {
    id: "j-2201",
    code: "#D-4821",
    restaurant: "Saffron Kitchen",
    pickupArea: "Koramangala 6th Block",
    dropArea: "Koramangala 5th Block",
    distanceKm: 2.3,
    payout: 48,
    items: 4,
    customer: "Aarav M.",
  },
  {
    id: "j-2202",
    code: "#B-9910",
    restaurant: "Blue Tokai Cafe",
    pickupArea: "Indiranagar",
    dropArea: "Domlur",
    distanceKm: 3.1,
    payout: 62,
    items: 2,
    customer: "Karan V.",
  },
  {
    id: "j-2203",
    code: "#P-3345",
    restaurant: "Pizza Loft",
    pickupArea: "HSR Sector 1",
    dropArea: "HSR Sector 4",
    distanceKm: 1.8,
    payout: 40,
    items: 3,
    customer: "Divya N.",
  },
];

export const DRIVER_TODAY = {
  earnings: 640,
  trips: 12,
  onlineHours: 5.5,
  rating: 4.8,
};

/* ---------- Admin ---------- */
export interface AdminMetric {
  label: string;
  value: string;
  delta?: string;
  tone?: "accent" | "green" | "muted";
}

export const ADMIN_METRICS: AdminMetric[] = [
  { label: "Orders today", value: "1,284", delta: "+8.2%", tone: "green" },
  { label: "GMV today", value: "₹4.9L", delta: "+5.1%", tone: "green" },
  { label: "Active riders", value: "86", tone: "accent" },
  { label: "Avg delivery", value: "27 min", delta: "-2 min", tone: "green" },
];

export interface AdminOrderRow {
  code: string;
  customer: string;
  restaurant: string;
  status: "PLACED" | "KITCHEN" | "ON_THE_WAY" | "DELIVERED" | "CANCELLED";
  total: number;
  placedAt: string;
}

export const ADMIN_ORDERS: AdminOrderRow[] = [
  { code: "#D-4823", customer: "Rahul K.", restaurant: "Saffron Kitchen", status: "PLACED", total: 900, placedAt: "24 Jul, 8:24 PM" },
  { code: "#B-9910", customer: "Karan V.", restaurant: "Blue Tokai Cafe", status: "KITCHEN", total: 420, placedAt: "24 Jul, 8:21 PM" },
  { code: "#P-3345", customer: "Divya N.", restaurant: "Pizza Loft", status: "ON_THE_WAY", total: 660, placedAt: "24 Jul, 8:14 PM" },
  { code: "#D-4818", customer: "Neha R.", restaurant: "Saffron Kitchen", status: "ON_THE_WAY", total: 560, placedAt: "24 Jul, 8:09 PM" },
  { code: "#S-7781", customer: "Meera J.", restaurant: "South Spice", status: "DELIVERED", total: 340, placedAt: "24 Jul, 7:58 PM" },
  { code: "#D-4801", customer: "Imran H.", restaurant: "Saffron Kitchen", status: "DELIVERED", total: 720, placedAt: "24 Jul, 7:44 PM" },
  { code: "#B-9902", customer: "Sana P.", restaurant: "Blue Tokai Cafe", status: "CANCELLED", total: 210, placedAt: "24 Jul, 7:31 PM" },
];

export interface ApprovalRow {
  name: string;
  type: "Restaurant" | "Rider";
  detail: string;
  submitted: string;
}

export const PENDING_APPROVALS: ApprovalRow[] = [
  { name: "Tandoori Nights", type: "Restaurant", detail: "FSSAI + menu submitted", submitted: "2h ago" },
  { name: "Vikram S.", type: "Rider", detail: "DL + RC pending review", submitted: "40m ago" },
  { name: "The Waffle Co.", type: "Restaurant", detail: "GST verification", submitted: "5h ago" },
];

export interface RefundRow {
  code: string;
  customer: string;
  amount: number;
  reason: string;
  flagged?: boolean;
}

export const REFUND_QUEUE: RefundRow[] = [
  { code: "#B-9902", customer: "Sana P.", amount: 210, reason: "Order cancelled by restaurant" },
  { code: "#P-3301", customer: "Ajay T.", amount: 660, reason: "Coupon on near-zero total", flagged: true },
  { code: "#S-7702", customer: "Ritu D.", amount: 120, reason: "Missing item" },
];
