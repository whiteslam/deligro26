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
  distanceKm: number;
  offer?: string;
  promoted?: boolean;
  open: boolean;
  categories: string[];
  menu: MenuItem[];
  accentTint: string; // photo fallback gradient (shows while the image loads)
  image: string; // cover photography
}

export interface Category {
  id: string;
  label: string;
  emoji: string;
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
