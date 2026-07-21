import { NextResponse } from "next/server";
import { getProfile } from "@/lib/auth";
import {
  listVendorOrderArchive,
  type VendorHistoryKind,
  type VendorHistoryRange,
} from "@/lib/data-access/vendor-orders";
import { resolveVendorRestaurant } from "@/lib/data-access/vendor-restaurant";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export async function GET(request: Request) {
  if (!isSupabaseConfigured) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  const profile = await getProfile();
  if (profile?.role !== "restaurant") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const restaurant = await resolveVendorRestaurant();
  if (!restaurant) {
    return NextResponse.json({ error: "no_restaurant" }, { status: 404 });
  }

  const url = new URL(request.url);
  const kind = (url.searchParams.get("kind") ?? "cancelled") as VendorHistoryKind;
  if (kind !== "cancelled" && kind !== "completed") {
    return NextResponse.json({ error: "invalid_kind" }, { status: 400 });
  }

  const range = (url.searchParams.get("range") ?? "all") as VendorHistoryRange;
  const allowed: VendorHistoryRange[] = [
    "all",
    "this_month",
    "previous_month",
    "date",
  ];
  if (!allowed.includes(range)) {
    return NextResponse.json({ error: "invalid_range" }, { status: 400 });
  }

  const date = url.searchParams.get("date") ?? undefined;
  const search = url.searchParams.get("search") ?? undefined;
  const limit = Number(url.searchParams.get("limit") ?? "100");

  try {
    const result = await listVendorOrderArchive({
      restaurantId: restaurant.id,
      kind,
      range,
      date,
      search,
      limit: Number.isFinite(limit) ? limit : 100,
    });
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "load_failed" }, { status: 500 });
  }
}
