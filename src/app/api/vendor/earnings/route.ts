import { NextResponse } from "next/server";
import { getProfile } from "@/lib/auth";
import { hasVendorAccess } from "@/lib/auth/vendor-access";
import {
  getVendorEarningsSummary,
  isEarningsRange,
  resolveEarningsWindow,
} from "@/lib/data-access/vendor-earnings";
import { settlementEstimateFor } from "@/lib/data-access/admin-settlements";
import { resolveVendorRestaurant } from "@/lib/data-access/vendor-restaurant";
import { isSupabaseConfigured } from "@/lib/supabase/config";

/** GET /api/vendor/earnings?range=week */
export async function GET(request: Request) {
  if (!isSupabaseConfigured) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  const profile = await getProfile();
  if (!(await hasVendorAccess(profile))) {
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
    const window = resolveEarningsWindow(rangeParam);
    const [summary, settlement] = await Promise.all([
      getVendorEarningsSummary(restaurant.id, rangeParam),
      // Same authorization as the page: vendor access, own restaurant, id
      // resolved from the session rather than accepted from the caller. Soft
      // failure — the panel says so rather than quoting revenue as a payout.
      settlementEstimateFor({
        restaurantId: restaurant.id,
        from: window.start,
        to: window.end,
      }).catch(() => null),
    ]);
    return NextResponse.json({ ...summary, settlement });
  } catch {
    return NextResponse.json({ error: "load_failed" }, { status: 500 });
  }
}
