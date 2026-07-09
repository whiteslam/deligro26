import Link from "next/link";
import { ChevronRight, Clock } from "lucide-react";
import { HomeHeader } from "@/components/home/home-header";
import { ActiveOrderStrip } from "@/components/home/active-order-strip";
import { CategoryStrip } from "@/components/home/category-strip";
import { ReorderBlock } from "@/components/home/reorder-block";
import { AIAssistantBlock } from "@/components/home/ai-assistant-block";
import { BentoGrid, BentoBlock } from "@/components/bento/bento";
import { RestaurantCard } from "@/components/shared/restaurant-card";
import { PhotoTile } from "@/components/shared/photo-tile";
import { listRestaurants } from "@/lib/catalog";
import { getOrdersPageData } from "@/lib/orders-ui";
import { formatEta } from "@/lib/utils/format";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { listAddresses } from "@/lib/data-access/addresses";
import { ADDRESSES } from "@/lib/data";

export default async function HomePage() {
  const [restaurants, orders] = await Promise.all([
    listRestaurants(),
    getOrdersPageData(),
  ]);

  // Saved default address — the delivery header's fallback when the user hasn't
  // shared live location. Real data when signed in; mock in demo mode.
  let savedAddress: { label: string; line: string } | null = null;
  if (isSupabaseConfigured) {
    const addrs = await listAddresses().catch(() => []);
    const def = addrs.find((a) => a.isDefault) ?? addrs[0];
    savedAddress = def ? { label: def.label, line: def.line } : null;
  } else {
    const def = ADDRESSES.find((a) => a.isDefault) ?? ADDRESSES[0];
    savedAddress = def ? { label: def.label, line: def.line } : null;
  }

  const hero =
    restaurants.find((r) => r.promoted && r.open) ??
    restaurants.find((r) => r.open) ??
    restaurants[0]!;
  const nearby = [...restaurants].sort((a, b) => a.etaMin - b.etaMin);
  const reorderA = orders.past[0];
  const reorderB = orders.past[2] ?? orders.past[1];

  return (
    <>
      <HomeHeader savedAddress={savedAddress} />

      <div className="space-y-6 px-4 pt-4">
        <BentoGrid>
          <BentoBlock href={`/restaurant/${hero.slug}`} span={2} className="p-0">
            <PhotoTile
              tint={hero.accentTint}
              src={hero.image}
              alt={hero.name}
              className="h-48 w-full"
            >
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 to-transparent p-4 pt-10">
                {hero.offer ? (
                  <span className="text-label !text-white/90">
                    Today · {hero.offer}
                  </span>
                ) : null}
                <h2 className="mt-0.5 font-serif text-2xl font-medium text-white">
                  {hero.name}
                </h2>
                <p className="mt-0.5 flex items-center gap-2 text-sm text-white/85">
                  {hero.cuisines.join(" · ")}
                  <span className="opacity-60">•</span>
                  <Clock className="size-3.5" />
                  {formatEta(hero.etaMin, hero.etaMax)}
                </p>
              </div>
            </PhotoTile>
          </BentoBlock>

          <ActiveOrderStrip order={orders.active} />

          {reorderA ? (
            <ReorderBlock order={reorderA} title="The usual" />
          ) : null}
          {reorderB ? (
            <ReorderBlock order={reorderB} title="Friday biryani" />
          ) : null}

          <AIAssistantBlock />
        </BentoGrid>

        <section className="space-y-3">
          <h2 className="text-heading">What are you craving?</h2>
          <CategoryStrip />
        </section>

        <section className="space-y-3">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="text-heading">Nearby, fastest first</h2>
              <p className="text-xs text-muted">Sorted by delivery time</p>
            </div>
            <Link
              href="/search"
              className="flex items-center gap-0.5 text-sm font-semibold text-accent"
            >
              See all <ChevronRight className="size-4" />
            </Link>
          </div>

          <div className="space-y-4">
            {nearby.map((r) => (
              <RestaurantCard key={r.slug} restaurant={r} />
            ))}
          </div>
        </section>

        <FooterNote />
      </div>
    </>
  );
}

function FooterNote() {
  return (
    <p className="pb-2 pt-2 text-center text-xs text-muted">
      Freshly made, delivered warm — usually in under 30 minutes.
    </p>
  );
}
