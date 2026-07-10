import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { HomeHeader } from "@/components/home/home-header";
import { ActiveOrderStrip } from "@/components/home/active-order-strip";
import { CategoryStrip } from "@/components/home/category-strip";
import { RestaurantCard } from "@/components/shared/restaurant-card";
import { PhotoTile } from "@/components/shared/photo-tile";
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

  const promo =
    restaurants.find((r) => r.promoted && r.open && r.offer) ??
    restaurants.find((r) => r.open) ??
    restaurants[0]!;
  const popular = [...restaurants]
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 6);
  const nearby = [...restaurants].sort((a, b) => a.etaMin - b.etaMin);

  return (
    <>
      <HomeHeader savedAddress={savedAddress} />

      <div className="space-y-7 pt-4">
        {orders.active ? (
          <div className="px-4">
            <ActiveOrderStrip order={orders.active} />
          </div>
        ) : null}

        {/* Categories */}
        <section className="space-y-3">
          <h2 className="px-4 text-heading">What are you craving?</h2>
          <CategoryStrip />
        </section>

        {/* What's popular — horizontal carousel */}
        <Section title="What's popular" href="/search">
          <div className="no-scrollbar -mx-4 flex gap-4 overflow-x-auto px-4">
            {popular.map((r) => (
              <RestaurantCard key={r.slug} restaurant={r} variant="carousel" />
            ))}
          </div>
        </Section>

        {/* Promo banner — Bolt-signature pastel card */}
        {promo.offer ? (
          <div className="px-4">
            <Link
              href={`/restaurant/${promo.slug}`}
              className="press relative flex items-center overflow-hidden rounded-2xl bg-accent-soft"
            >
              <div className="flex-1 p-5">
                <p className="text-[19px] font-extrabold leading-tight tracking-tight text-ink">
                  {promo.name}
                </p>
                <p className="mt-1 text-sm font-medium text-accent-ink">
                  {promo.offer}
                </p>
                <p className="mt-3 text-[11px] text-muted">
                  Limited-time delivery offer
                </p>
              </div>
              <PhotoTile
                tint={promo.accentTint}
                src={promo.image}
                alt={promo.name}
                className="h-32 w-32 shrink-0"
              />
            </Link>
          </div>
        ) : null}

        {/* Nearby — vertical feed */}
        <section className="space-y-3">
          <div className="flex items-end justify-between px-4">
            <div>
              <h2 className="text-heading">Nearby, fastest first</h2>
              <p className="text-xs text-muted">Sorted by delivery time</p>
            </div>
            <Link
              href="/search"
              className="flex items-center gap-0.5 text-sm font-bold text-accent-ink"
            >
              All <ChevronRight className="size-4" />
            </Link>
          </div>

          <div className="space-y-5 px-4">
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

/** Section header with an "All >" link, matching Bolt's home rows. */
function Section({
  title,
  href,
  children,
}: {
  title: string;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between px-4">
        <h2 className="text-heading">{title}</h2>
        <Link
          href={href}
          className="flex items-center gap-0.5 text-sm font-bold text-accent-ink"
        >
          All <ChevronRight className="size-4" />
        </Link>
      </div>
      {children}
    </section>
  );
}

function FooterNote() {
  return (
    <p className="px-4 pb-2 pt-2 text-center text-xs text-muted">
      Freshly made, delivered warm — usually in under 30 minutes.
    </p>
  );
}
