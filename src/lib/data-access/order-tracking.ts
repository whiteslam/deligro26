import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { DEFAULT_CENTER } from "@/lib/maps/config";
import {
  computeRiderPosition,
  restaurantPointForOrder,
  type TrackPoint,
} from "@/lib/tracking/rider-position";
import { dbStatusToUi } from "@/lib/utils/order-map";
import type { OrderStatus, Rider } from "@/types";

export interface OrderTrackingSnapshot {
  status: OrderStatus;
  etaMinutes: number;
  rider: Rider | null;
  restaurant: TrackPoint;
  destination: TrackPoint;
  riderPosition: TrackPoint | null;
  deliveryStatus: string | null;
  /** Fields for client-side smooth rider animation between polls. */
  interp: {
    orderStatus: string;
    deliveryStatus: string | null;
    assignedAt: string | null;
    pickedUpAt: string | null;
    storedRider: (TrackPoint & { at: string | null }) | null;
  };
}

interface AddressJson {
  label?: string;
  line?: string;
  lat?: number;
  lng?: number;
}

function parseDestination(address: unknown): TrackPoint {
  const a = (address ?? {}) as AddressJson;
  if (typeof a.lat === "number" && typeof a.lng === "number") {
    return { lat: a.lat, lng: a.lng };
  }
  return DEFAULT_CENTER;
}

function one<T>(v: T | T[] | null | undefined): T | null {
  return Array.isArray(v) ? (v[0] ?? null) : (v ?? null);
}

/** Live tracking payload for the customer order screen (RLS-scoped). */
export async function getOrderTrackingSnapshot(
  orderId: string
): Promise<OrderTrackingSnapshot | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: order, error } = await supabase
    .from("orders")
    .select(
      "id, status, address, restaurant_id, restaurants ( eta_min, eta_max )"
    )
    .eq("id", orderId)
    .maybeSingle();

  if (error) throw error;
  if (!order) return null;

  const restaurant = one(
    order.restaurants as { eta_min?: number; eta_max?: number } | null
  );
  const etaMinutes = restaurant?.eta_min ?? 25;
  const destination = parseDestination(order.address);
  const restaurantPoint = restaurantPointForOrder(
    order.restaurant_id as string,
    destination,
    {
      lat: DEFAULT_CENTER.lat + 0.012,
      lng: DEFAULT_CENTER.lng - 0.008,
    }
  );

  const admin = createAdminClient();
  const { data: delivery } = await admin
    .from("deliveries")
    .select(
      "status, assigned_at, picked_up_at, driver_lat, driver_lng, driver_location_at, driver_id"
    )
    .eq("order_id", orderId)
    .maybeSingle();

  let rider: Rider | null = null;
  if (delivery?.driver_id) {
    const { data: driver } = await admin
      .from("profiles")
      .select("full_name, phone")
      .eq("id", delivery.driver_id)
      .maybeSingle();
    if (driver) {
      rider = {
        name: driver.full_name?.trim() || "Your courier",
        rating: 4.9,
        vehicle: "Bike",
        phone: driver.phone?.trim() || "",
      };
    }
  }

  const riderPosition = computeRiderPosition({
    orderStatus: order.status as string,
    deliveryStatus: delivery?.status ?? null,
    assignedAt: delivery?.assigned_at ?? null,
    pickedUpAt: delivery?.picked_up_at ?? null,
    restaurant: restaurantPoint,
    destination,
    storedRider:
      delivery?.driver_lat != null && delivery?.driver_lng != null
        ? {
            lat: delivery.driver_lat,
            lng: delivery.driver_lng,
            at: delivery.driver_location_at,
          }
        : null,
    etaMinutes,
  });

  return {
    status: dbStatusToUi(order.status as string),
    etaMinutes,
    rider,
    restaurant: restaurantPoint,
    destination,
    riderPosition,
    deliveryStatus: delivery?.status ?? null,
    interp: {
      orderStatus: order.status as string,
      deliveryStatus: delivery?.status ?? null,
      assignedAt: delivery?.assigned_at ?? null,
      pickedUpAt: delivery?.picked_up_at ?? null,
      storedRider:
        delivery?.driver_lat != null && delivery?.driver_lng != null
          ? {
              lat: delivery.driver_lat,
              lng: delivery.driver_lng,
              at: delivery.driver_location_at,
            }
          : null,
    },
  };
}
