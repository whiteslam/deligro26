import Link from "next/link";
import { Store } from "lucide-react";
import { HomeHeader } from "@/components/home/home-header";
import { RestaurantCard } from "@/components/shared/restaurant-card";
import { PhotoTile } from "@/components/shared/photo-tile";
import { EmptyState } from "@/components/shared/empty-state";
import { StoreCategoryStrip } from "@/components/stores/store-category-strip";
import { listRestaurants } from "@/lib/catalog";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { listAddresses } from "@/lib/data-access/addresses";
import { ADDRESSES, STORE_CATEGORIES } from "@/lib/data";

export default async function StoresPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const [{ category }, restaurants] = await Promise.all([
    searchParams,
    listRestaurants(),
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

  // An unknown ?category= reads as "no filter" rather than "nothing matches" —
  // a stale link shouldn't land the user on an empty tab.
  const active = STORE_CATEGORIES.find((c) => c.id === category) ?? null;
  const inCategory = active
    ? restaurants.filter((r) =>
        r.cuisines.some((c) =>
          active.tags.some((t) => t.toLowerCase() === c.toLowerCase())
        )
      )
    : restaurants;

  const featured = [...inCategory]
    .filter((r) => r.open)
    .sort((a, b) => b.rating - a.rating);
  const all = [...inCategory].sort((a, b) => a.etaMin - b.etaMin);

  return (
    <>
      <HomeHeader savedAddress={savedAddress} />

      <div className="space-y-7 pt-3">
        <section className="space-y-3">
          <h2 className="px-4 text-heading">Categories</h2>
          <StoreCategoryStrip active={active?.id} />
        </section>

        {all.length === 0 ? (
          <EmptyState
            icon={<Store className="size-7" />}
            title={`No ${active?.label.toLowerCase() ?? "stores"} yet`}
            description={`We haven't onboarded a ${
              active?.label.toLowerCase() ?? "store"
            } near you. Browse everything else in the meantime.`}
            action={
              <Link
                href="/stores"
                className="press rounded-full bg-accent px-5 py-2.5 text-sm font-bold text-white shadow-[var(--glow-accent)]"
              >
                Show all stores
              </Link>
            }
          />
        ) : (
          <>
            {featured.length ? (
              <section className="space-y-3">
                <h2 className="px-4 text-heading">
                  {active ? active.label : "Open now"}
                </h2>
                <div className="no-scrollbar flex gap-3 overflow-x-auto px-4">
                  {featured.map((r) => (
                    <Link
                      key={r.slug}
                      href={`/restaurant/${r.slug}`}
                      className="press flex w-[88px] shrink-0 flex-col items-center gap-2"
                    >
                      <PhotoTile
                        tint={r.accentTint}
                        src={r.image}
                        alt={r.name}
                        className="size-[72px] rounded-2xl"
                      />
                      <span className="w-full truncate text-center text-[12px] font-semibold text-ink">
                        {r.name}
                      </span>
                    </Link>
                  ))}
                </div>
              </section>
            ) : null}

            <section className="space-y-3">
              <h2 className="px-4 text-heading">
                {active ? `All ${active.label.toLowerCase()}` : "All stores"}
              </h2>
              <div className="space-y-5 px-4">
                {all.map((r) => (
                  <RestaurantCard key={r.slug} restaurant={r} />
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </>
  );
}
