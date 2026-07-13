import { HomeView } from "@/components/home/home-view";
import { listRestaurants } from "@/lib/catalog";
import { getOrdersPageData } from "@/lib/orders-ui";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { listAddresses } from "@/lib/data-access/addresses";
import { ADDRESSES } from "@/lib/data";

export default async function HomePage() {
  const [restaurants, orders] = await Promise.all([
    listRestaurants(),
    getOrdersPageData(),
  ]);

  let savedAddress: { label: string; line: string } | null = null;
  if (isSupabaseConfigured) {
    const addrs = await listAddresses().catch(() => []);
    const def = addrs.find((a) => a.isDefault) ?? addrs[0];
    savedAddress = def ? { label: def.label, line: def.line } : null;
  } else {
    const def = ADDRESSES.find((a) => a.isDefault) ?? ADDRESSES[0];
    savedAddress = def ? { label: def.label, line: def.line } : null;
  }

  // `restaurants[0]!` — the non-null assertion was a lie whenever the catalog
  // read failed: listRestaurants() returns [] on error, so `promo` was undefined
  // and the feed threw on `promo.offer`. An empty catalog is a normal failure,
  // not a crash.
  const promo =
    restaurants.find((r) => r.promoted && r.open && r.offer) ??
    restaurants.find((r) => r.open) ??
    restaurants[0] ??
    null;
  const popular = [...restaurants]
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 6);
  const nearby = [...restaurants].sort((a, b) => a.etaMin - b.etaMin);

  return (
    <HomeView
      savedAddress={savedAddress}
      restaurants={restaurants}
      activeOrder={orders.active}
      promo={promo}
      popular={popular}
      nearby={nearby}
    />
  );
}
