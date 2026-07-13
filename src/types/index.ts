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
  rating: number;
  vehicle: string;
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
  veg: boolean;
}
