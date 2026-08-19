import Link from "next/link";
import { Store, TriangleAlert } from "lucide-react";
import { HomeHeader } from "@/components/home/home-header";
import { RestaurantCard } from "@/components/shared/restaurant-card";
import { PhotoTile } from "@/components/shared/photo-tile";
import { EmptyState } from "@/components/shared/empty-state";
import { StoreCategoryStrip } from "@/components/stores/store-category-strip";
import { PickDropHero } from "@/components/stores/pick-drop-hero";
import { GroceryListHero } from "@/components/stores/grocery-list-hero";
import { listRestaurantsResult } from "@/lib/catalog";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { listAddresses } from "@/lib/data-access/addresses";
import { getSettings } from "@/lib/settings";
import { enabledStoreCategories } from "@/lib/store-categories";
import { ADDRESSES } from "@/lib/data";

export default async function StoresPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const [{ category }, catalog, settings] = await Promise.all([
    searchParams,
    listRestaurantsResult(),
    getSettings(),
  ]);
  const { restaurants } = catalog;

  // Which storefront types the admin has switched on. The Settings toggles used
  // to be stored, validated, displayed — and read by nothing: switching
  // Groceries off to handle a supplier outage left the category, the hero and
  // the WhatsApp CTA fully live to customers, while the Settings page confirmed
  // the save.
  const categories = enabledStoreCategories(settings);

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
  // a stale link shouldn't land the user on an empty tab. A switched-off
  // category is unknown by the same rule, so a bookmarked /stores?category=
  // groceries link stops working the moment an admin turns it off, rather than
  // reaching a hero the platform is no longer serving.
  const active = categories.find((c) => c.id === category) ?? null;
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
          <StoreCategoryStrip active={active?.id} categories={categories} />
        </section>

        {!catalog.ok ? (
          <div className="mx-4 flex items-start gap-2.5 rounded-2xl border border-deal/30 bg-deal-soft px-3 py-2.5 text-sm font-medium text-deal">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            <span>
              We couldn&apos;t load stores just now. This is a problem on our
              side — try again in a moment.
            </span>
          </div>
        ) : null}

        {active?.id === "groceries" ? (
          // The number is the admin's, not a constant: a change of business
          // number or an ops handover used to leave grocery orders arriving at
          // a WhatsApp nobody was watching, with no way to redirect them.
          <GroceryListHero
            savedAddress={savedAddress}
            whatsappNumber={settings.supportWhatsapp}
          />
        ) : null}

        {active?.id === "pick-drop" ? (
          <PickDropHero />
        ) : all.length === 0 ? (
          <EmptyState
            icon={<Store className="size-7" />}
            title={`No ${active?.label.toLowerCase() ?? "stores"} yet`}
            description={`We haven't onboarded a ${
              active?.label.toLowerCase() ?? "store"
            } near you. Browse everything else in the meantime.`}
            action={
              <Link
                href="/stores"
                className="press rounded-full bg-accent px-5 py-2.5 text-sm font-bold text-[var(--on-accent)] shadow-[var(--glow-accent)]"
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
