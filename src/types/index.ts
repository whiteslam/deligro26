/** Domain types for the Deligro customer app (static / mock phase). */

export type Cuisine =
  | "North Indian"
  | "South Indian"
  | "Chinese"
  | "Italian"
  | "Fast Food"
  | "Healthy"
  | "Desserts"
  | "Biryani";

export type PriceTier = 1 | 2 | 3; // ₹ / ₹₹ / ₹₹₹

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  veg: boolean;
  image?: string;
  soldOut?: boolean;
  popular?: boolean;
  bestseller?: boolean;
  /** Units ordered in the popularity window — what the Popular rank is built on. */
  unitsSold?: number;
}

export interface Restaurant {
  slug: string;
  name: string;
  tagline: string;
  cuisines: Cuisine[];
  rating: number;
  ratingCount: number;
  etaMin: number;
  etaMax: number;
  priceTier: PriceTier;
  costForTwo: number;
  /**
   * Seeded, customer-independent distance. Only a fallback now: when the shop
   * has been pinned (lat/lng below) the UI measures the real distance from the
   * customer instead. Kept so shops that haven't pinned yet still show
   * something.
   */
  distanceKm: number;
  /** Where the shop actually is — null until the vendor pins it on the map. */
  lat?: number | null;
  lng?: number | null;
  address?: string | null;
  offer?: string;
  promoted?: boolean;
  open: boolean;
  categories: string[];
  menu: MenuItem[];
  /**
   * How this menu's Popular list was arrived at: "orders" = ranked by units sold
   * in the last 30 days, "picks" = too little order history to rank, so the
   * hand-picked flags stand in. The UI captions itself from this, so it never
   * calls a pick a bestseller.
   */
  popularBasis?: "orders" | "picks";
  accentTint: string; // photo fallback gradient (shows while the image loads)
  image: string; // cover photography
}

export interface Category {
  id: string;
  label: string;
  emoji: string;
}

/**
 * A storefront type on the Stores tab (bakery, dairy, …) — not a food cuisine.
 * `tags` are the vendor cuisine tags that belong to the category, so a store
 * shows up under it as soon as it carries one of them.
 */
export interface StoreCategory extends Category {
  tags: string[];
}

export type OrderStatus =
  | "PLACED"
  | "KITCHEN"
  | "ON_THE_WAY"
  | "DELIVERED"
  | "CANCELLED";

export interface OrderLine {
  itemId: string;
  name: string;
  qty: number;
  price: number;
  /** Undefined = unknown (the dish is no longer on the menu). Never assume veg. */
  veg?: boolean;
}

export interface Order {
  id: string;
  restaurantSlug: string;
  restaurantName: string;
  /** Populated from DB for order cards when mock getRestaurant() isn't available. */
  restaurantImage?: string;
  restaurantAccent?: string;
  status: OrderStatus;
  placedAt: string; // human label e.g. "Today, 8:24 PM"
  etaMinutes?: number;
  lines: OrderLine[];
  total: number;
  rider?: Rider;
}

export interface Rider {
  name: string;
  /** We don't rate riders yet. Undefined = unknown, never a flattering guess. */
  rating?: number;
  vehicle?: string;
  phone: string;
}

export interface Address {
  id: string;
  label: string;
  line: string;
  isDefault?: boolean;
}

export interface CartLine {
  itemId: string;
  name: string;
  price: number;
  qty: number;
  /** Undefined = unknown. A wrong veg mark is a dietary claim, so we show none. */
  veg?: boolean;
}

/* ============================================================
   Promotional banners / ad campaigns.

   The home screen (and other surfaces) never hardcode promos: they ask the
   backend for the active campaigns at a placement and render whatever comes
   back. Everything below is what the Admin Panel writes and the app reads.
   ============================================================ */

/**
 * Surfaces a banner can be pinned to. The app asks for one placement at a time;
 * a campaign can be attached to several. Adding a surface = adding a value here.
 */
export type BannerPlacement =
  | "home_hero" // the carousel under "Popular right now" on the food home
  | "home_food"
  | "stores_top" // top of the Stores tab
  | "grocery_top"
  | "pharmacy_top"
  | "checkout";

/**
 * Internal = a Deligro feature promo (Grocery, Pick & Drop, Membership…).
 * Sponsored = a paid campaign from a partner; it wears the "Sponsored" badge.
 */
export type BannerKind = "internal" | "sponsored";

/** Lifecycle. Only `active` (and in-window) campaigns are ever served. */
export type BannerStatus = "draft" | "active" | "paused" | "archived";

/**
 * Where the CTA takes the user. `value` is interpreted per type — a slug for
 * `restaurant`/`store`/`product`/`category`, a full URL for `external`, and is
 * ignored for the section shortcuts (they route to a fixed path).
 */
export type BannerTargetType =
  | "food"
  | "grocery"
  | "pick_drop"
  | "shops"
  | "pharmacy"
  | "membership"
  | "refer"
  | "restaurant"
  | "store"
  | "product"
  | "category"
  | "external";

export interface BannerTarget {
  type: BannerTargetType;
  /** Slug / URL / category id, depending on `type`. */
  value?: string;
}

/** Optional audience narrowing. Empty arrays / undefined = everyone. */
export interface BannerTargeting {
  cities?: string[];
  zones?: string[];
  categories?: string[];
  /** e.g. "new", "returning", "vip" — matched against the viewer's segment. */
  segments?: string[];
}

/** Rolled-up performance for the Admin list. */
export interface BannerAnalytics {
  impressions: number;
  clicks: number;
  /** Click-through rate as a fraction (clicks / impressions), 0 when no views. */
  ctr: number;
  conversions: number;
  orders: number;
}

export interface Banner {
  id: string;
  /** Admin-facing campaign name; also the default headline fallback. */
  name: string;
  headline: string;
  /** Max ~2 lines in the UI — kept short at author time, truncated at render. */
  description: string;
  ctaLabel: string; // "Order Now", "Shop Now", "Explore"…
  kind: BannerKind;
  status: BannerStatus;
  target: BannerTarget;
  placements: BannerPlacement[];
  /** Higher wins ordering within a placement; ties break on `displayOrder`. */
  priority: number;
  displayOrder: number;
  /** Per-banner auto-advance, milliseconds. Clamped to 3–8s at render. */
  autoSlideMs: number;
  /** Landscape/desktop art. */
  imageUrl?: string;
  /** Portrait/mobile art; falls back to `imageUrl`. */
  mobileImageUrl?: string;
  /** Gradient shown under the image while it loads (and if it never does). */
  tint: string;
  /** Small emoji/badge glyph on the art, à la PhotoTile `label`. */
  glyph?: string;
  /** Paid campaigns show "Sponsored · {sponsorName}". */
  sponsorName?: string;
  targeting?: BannerTargeting;
  /** ISO timestamps; undefined = open-ended on that side. */
  startsAt?: string | null;
  endsAt?: string | null;
  analytics?: BannerAnalytics;
}
