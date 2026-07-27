import { NextResponse } from "next/server";
import { getProfile } from "@/lib/auth";
import {
  getVendorEarningsSummary,
  isEarningsRange,
} from "@/lib/data-access/vendor-earnings";
import { resolveVendorRestaurant } from "@/lib/data-access/vendor-restaurant";
import { isSupabaseConfigured } from "@/lib/supabase/config";

/** GET /api/vendor/earnings?range=week */
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

  const rangeParam = new URL(request.url).searchParams.get("range") ?? "week";
  if (!isEarningsRange(rangeParam)) {
    return NextResponse.json({ error: "invalid_range" }, { status: 400 });
  }

  try {
    const summary = await getVendorEarningsSummary(restaurant.id, rangeParam);
    return NextResponse.json(summary);
  } catch {
    return NextResponse.json({ error: "load_failed" }, { status: 500 });
  }
}
