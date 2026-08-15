import { Clock, EyeOff } from "lucide-react";
import { PhotoTile } from "@/components/shared/photo-tile";
import { formatEta } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import type { FeaturedSlot, SlotVendor } from "@/lib/data-access/vendor-positions";

/**
 * A phone-width sketch of the top of the customer feed, beside the board.
 *
 * Deliberately a sketch and not the real `RestaurantCard`: that card is a Link
 * into the storefront, measures a distance from the viewer's own location and
 * quotes a delivery fee, none of which mean anything inside the console. What it
 * borrows is the part the operator is actually judging — the same PhotoTile, the
 * same order, the same name/cuisine/ETA lines — at about a third of the size.
 *
 * It shows what pinning decides, and nothing it doesn't. The customer's feed
 * also carries banners, categories and every unpinned shop underneath; those are
 * not this screen's business, so the strip ends where the pinned shops do.
 */
const FALLBACK_TINT = "linear-gradient(135deg,#f6c453,#e8552d)";

export function FeedPreview({ slots }: { slots: FeaturedSlot[] }) {
  // One shop per slot, in rank order — exactly what applyVendorOrder floats to
  // the top of the catalogue. Collision extras stay on the board; showing two
  // shops in one position would misrepresent a feed that can only show one.
  const pinned = slots
    .map((slot) => ({ position: slot.position, vendor: slot.vendors[0] }))
    .filter((row): row is { position: number; vendor: SlotVendor } =>
      Boolean(row.vendor)
    );

  const hidden = pinned.filter((row) => !row.vendor.approved).length;

  return (
    <aside className="@4xl:sticky @4xl:top-4 @4xl:self-start">
      <div className="rounded-xl border border-line bg-surface-2 p-3">
        <div className="mb-2.5 flex items-baseline justify-between gap-2">
          <p className="text-[11px] font-bold uppercase tracking-[0.07em] text-muted">
            Customer feed
          </p>
          <p className="text-[10.5px] text-muted">Top of the list</p>
        </div>

        {pinned.length === 0 ? (
          <div className="rounded-lg border border-dashed border-line px-3 py-8 text-center">
            <p className="text-[12px] font-semibold">Nothing pinned</p>
            <p className="mt-1 text-[11px] text-muted">
              Fill a slot and it appears here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {pinned.map(({ position, vendor }) => (
              <PreviewCard key={vendor.id} position={position} vendor={vendor} />
            ))}
          </div>
        )}

        <p className="mt-3 border-t border-[color:var(--c-divider)] pt-2.5 text-[10.5px] leading-snug text-muted">
          {hidden > 0
            ? `${hidden} pinned shop${hidden === 1 ? " is" : "s are"} not approved — ${hidden === 1 ? "it holds a slot but never appears" : "they hold slots but never appear"} on the feed.`
            : "Everything below these keeps the feed's usual order."}
        </p>
      </div>
    </aside>
  );
}

function PreviewCard({
  position,
  vendor,
}: {
  position: number;
  vendor: SlotVendor;
}) {
  // Two ways a pinned shop shows the customer nothing, and they are different
  // problems: unapproved means it is absent from the feed entirely; closed means
  // it is there, dimmed, wearing "Opens soon" — which is the storefront working.
  const invisible = !vendor.approved;
  const subtitle = vendor.cuisines.length
    ? vendor.cuisines.join(" · ")
    : (vendor.category ?? "Uncategorised");

  return (
    <div className={cn("relative", invisible && "opacity-45")}>
      <div className="relative overflow-hidden rounded-xl">
        <PhotoTile
          tint={vendor.accentTint ?? FALLBACK_TINT}
          src={vendor.imageUrl ?? undefined}
          alt={vendor.name}
          className="h-[74px] w-full"
        />
        <span className="text-data absolute left-1.5 top-1.5 grid size-5 place-items-center rounded-md bg-ink/85 text-[10px] font-bold tabular-nums text-white">
          {position}
        </span>
        {!vendor.isOpen && !invisible ? (
          <span className="absolute bottom-1.5 right-1.5 rounded-full bg-ink px-1.5 py-0.5 text-[9px] font-semibold text-white">
            Opens soon
          </span>
        ) : null}
      </div>

      <div className="px-0.5 pt-1.5">
        <p className="truncate text-[12px] font-extrabold leading-tight tracking-tight">
          {vendor.name}
        </p>
        <p className="truncate text-[10.5px] leading-tight text-muted">
          {subtitle}
        </p>
        <p className="mt-1 inline-flex items-center gap-1 text-[10.5px] font-medium text-muted">
          <Clock className="size-3" />
          {formatEta(vendor.etaMin, vendor.etaMax)}
        </p>
      </div>

      {invisible ? (
        <p className="mt-1 inline-flex items-center gap-1 rounded-md bg-surface px-1.5 py-0.5 text-[10px] font-semibold text-accent-ink">
          <EyeOff className="size-3" />
          Not approved — hidden
        </p>
      ) : null}
    </div>
  );
}
