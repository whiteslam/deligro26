import "server-only";
import { createClient } from "@/lib/supabase/server";
import {
  listOwnedRestaurants,
  resolveVendorRestaurant,
  type OwnedRestaurant,
} from "@/lib/data-access/vendor-restaurant";

export interface VendorRestaurantDetail extends OwnedRestaurant {
  tagline: string | null;
  approved: boolean;
  cuisines: string[];
  rating: number;
  ratingCount: number;
  offer: string | null;
  imageUrl: string | null;
  etaMin: number | null;
  etaMax: number | null;
  costForTwo: number | null;
  priceTier: number;
  promoted: boolean;
}

export interface VendorProfileSummary {
  ownerName: string;
  ownerPhone: string | null;
  ownerEmail: string | null;
  memberSince: string;
  initials: string;
  ownedRestaurants: OwnedRestaurant[];
  restaurant: VendorRestaurantDetail | null;
  stats: {
    menuItems: number;
    menuAvailable: number;
    totalOrders: number;
    activeOrders: number;
    deliveredOrders: number;
    lifetimeRevenue: number;
  };
}

function initialsFrom(name: string, phone: string | null): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  const digits = (phone ?? "").replace(/\D/g, "");
  return digits.slice(-2) || "VR";
}

/** Full vendor + active restaurant profile for `/vendor/profile`. */
export async function getVendorProfileSummary(): Promise<VendorProfileSummary | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: profile }, owned] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, phone, created_at")
      .eq("id", user.id)
      .maybeSingle(),
    listOwnedRestaurants(),
  ]);

  const ownerName = profile?.full_name?.trim() || "Restaurant Owner";
  const ownerPhone = profile?.phone ?? user.phone ?? null;
  const memberSince = profile?.created_at
    ? new Date(profile.created_at).getFullYear().toString()
    : new Date(user.created_at).getFullYear().toString();

  const active = await resolveVendorRestaurant();
  let restaurant: VendorRestaurantDetail | null = null;
  let stats = {
    menuItems: 0,
    menuAvailable: 0,
    totalOrders: 0,
    activeOrders: 0,
    deliveredOrders: 0,
    lifetimeRevenue: 0,
  };

  if (active) {
    const { data: row } = await supabase
      .from("restaurants")
      .select(
        "id, slug, name, tagline, is_open, approved, cuisines, rating, rating_count, offer, image_url, eta_min, eta_max, cost_for_two, price_tier, promoted"
      )
      .eq("id", active.id)
      .maybeSingle();

    if (row) {
      restaurant = {
        id: row.id,
        slug: row.slug,
        name: row.name,
        isOpen: row.is_open,
        tagline: row.tagline,
        approved: row.approved,
        cuisines: row.cuisines ?? [],
        rating: Number(row.rating),
        ratingCount: row.rating_count,
        offer: row.offer,
        imageUrl: row.image_url,
        etaMin: row.eta_min,
        etaMax: row.eta_max,
        costForTwo: row.cost_for_two,
        priceTier: row.price_tier,
        promoted: row.promoted,
      };
    }

    const [
      { count: menuItems },
      { count: menuAvailable },
      { data: orders },
    ] = await Promise.all([
      supabase
        .from("menu_items")
        .select("id", { count: "exact", head: true })
        .eq("restaurant_id", active.id),
      supabase
        .from("menu_items")
        .select("id", { count: "exact", head: true })
        .eq("restaurant_id", active.id)
        .eq("available", true),
      supabase
        .from("orders")
        .select("status, total")
        .eq("restaurant_id", active.id),
    ]);

    const rows = orders ?? [];
    stats = {
      menuItems: menuItems ?? 0,
      menuAvailable: menuAvailable ?? 0,
      totalOrders: rows.length,
      activeOrders: rows.filter((o) =>
        ["placed", "kitchen", "ready", "on_the_way"].includes(o.status)
      ).length,
      deliveredOrders: rows.filter((o) => o.status === "delivered").length,
      lifetimeRevenue: rows
        .filter((o) => o.status === "delivered")
        .reduce((s, o) => s + Number(o.total), 0),
    };
  }

  return {
    ownerName,
    ownerPhone,
    ownerEmail: user.email ?? null,
    memberSince,
    initials: initialsFrom(ownerName, ownerPhone),
    ownedRestaurants: owned,
    restaurant,
    stats,
  };
}
