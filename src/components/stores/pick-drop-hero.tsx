import { Package, MapPin, Clock } from "lucide-react";

/**
 * Pick & Drop is an errand service, not a storefront, so the category has no
 * shops to list. Instead of a bare empty state, it gets this hero — the splash
 * rider (background keyed out) over a brand-orange card.
 */
export function PickDropHero() {
  return (
    <section className="px-4">
      <div className="relative overflow-hidden rounded-3xl bg-[linear-gradient(150deg,#f2a71b_0%,#e59a01_55%,#d98600_100%)] p-5 pb-40 text-white">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-[11px] font-bold uppercase tracking-wide">
          <Package className="size-3.5" /> Errand service · Coming soon
        </span>
        <h2 className="mt-3 text-[26px] font-extrabold leading-tight tracking-tight">
          Pick &amp; Drop
        </h2>
        <p className="mt-2 max-w-[62%] text-[13.5px] font-medium leading-snug text-white/90">
          Need something moved across town? Our rider picks it up and drops it at
          the door — parcels, documents, forgotten keys, all of it.
        </p>

        <ul className="mt-4 space-y-2 text-[13px] font-semibold">
          <li className="flex items-center gap-2">
            <MapPin className="size-4 shrink-0" /> Anywhere within Bemetara
          </li>
          <li className="flex items-center gap-2">
            <Clock className="size-4 shrink-0" /> Same-hour door-to-door pickup
          </li>
        </ul>

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/pickdrop-rider.webp"
          alt=""
          aria-hidden
          decoding="async"
          className="pointer-events-none absolute -bottom-2 right-[-8px] w-[62%] max-w-[280px]"
        />
      </div>

      <p className="mt-4 text-center text-sm font-semibold text-ink">
        Coming soon — Pick &amp; Drop will be rolling out in Bemetara soon.
      </p>
    </section>
  );
}
