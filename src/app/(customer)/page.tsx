import { HomeView } from "@/components/home/home-view";
import { listRestaurants } from "@/lib/catalog";
import { listActiveBanners } from "@/lib/banners";
import { getOrdersPageData } from "@/lib/orders-ui";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { listAddresses } from "@/lib/data-access/addresses";
import { ADDRESSES } from "@/lib/data";

export default async function HomePage() {
  const [restaurants, orders, banners] = await Promise.all([
    listRestaurants(),
    getOrdersPageData(),
    // The home carousel: whatever campaigns the Admin Panel has running here.
    listActiveBanners("home_hero"),
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

  const popular = [...restaurants]
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 6);
  const nearby = [...restaurants].sort((a, b) => a.etaMin - b.etaMin);

  return (
    <HomeView
      savedAddress={savedAddress}
      restaurants={restaurants}
      activeOrder={orders.active}
      banners={banners}
      popular={popular}
      nearby={nearby}
    />
  );
}
