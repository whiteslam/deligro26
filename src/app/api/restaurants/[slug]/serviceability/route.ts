import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getSettings } from "@/lib/settings";
import { checkServiceArea, type ServiceArea } from "@/lib/geo/service-area";

/**
 * GET /api/restaurants/:slug/serviceability?lat=&lng=
 *
 * Whether this shop delivers to that pin. The checkout screen only learns which
 * restaurant the basket belongs to on the client (it lives in the cart store),
 * and the pin changes as the customer picks addresses — so this is a read
 * endpoint for the same reason `payment-options` next door is one.
 *
 * Advisory, exactly like that endpoint: `createOrder` re-runs `checkServiceArea`
 * against the address actually submitted and refuses the order itself, so a
 * stale or tampered answer here changes what the customer is SHOWN, never what
 * they are allowed to do.
 *
 * Writes nothing, so no rate limit (AGENTS.md §6). It reveals only whether one
 * point is within a published radius of a public shop.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const url = new URL(request.url);
  const lat = Number(url.searchParams.get("lat"));
  const lng = Number(url.searchParams.get("lng"));

  const unknown = (radiusKm = 0): ServiceArea => ({
    status: "unknown",
    distanceKm: null,
    radiusKm,
  });

  if (!isSupabaseConfigured || !slug) {
    return NextResponse.json({ area: unknown() });
  }
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ area: unknown() });
  }

  try {
    const supabase = await createClient();
    const [{ data: restaurant }, settings] = await Promise.all([
      supabase
        .from("restaurants")
        .select("lat, lng")
        .eq("slug", slug)
        .eq("approved", true)
        .maybeSingle(),
      getSettings(),
    ]);

    return NextResponse.json({
      area: checkServiceArea({
        shop: restaurant,
        destination: { lat, lng },
        radiusKm: settings.deliveryRadiusKm,
      }),
    });
  } catch {
    // "We couldn't check" is not "you're out of range". Saying the latter would
    // talk a customer out of an order they could have had; the order API is the
    // gate that actually decides, and it re-checks with data it can read.
    return NextResponse.json({ area: unknown() });
  }
}
