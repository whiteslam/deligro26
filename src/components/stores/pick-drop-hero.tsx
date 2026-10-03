import { Package, MapPin, Clock } from "lucide-react";
import { getT } from "@/lib/i18n/server";

/**
 * Pick & Drop is an errand service, not a storefront, so the category has no
 * shops to list. Instead of a bare empty state, it gets this hero — the splash
 * rider (background keyed out) over a brand-orange card.
 */
export async function PickDropHero() {
  const t = await getT();
  return (
    <section className="px-4">
      <div className="relative overflow-hidden rounded-3xl bg-[linear-gradient(150deg,#f2a71b_0%,#e59a01_55%,#d98600_100%)] p-5 pb-40 text-white">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-[11px] font-bold uppercase tracking-wide">
          <Package className="size-3.5" />{" "}
          {t(
            "Errand service · Coming soon",
            "सामान पहुंचाने की सेवा · जल्द आ रही है",
          )}
        </span>
        <h2 className="mt-3 text-[26px] font-extrabold leading-tight tracking-tight">
          {t("Pick & Drop", "पिक और ड्रॉप")}
        </h2>
        <p className="mt-2 max-w-[62%] text-[13.5px] font-medium leading-snug text-white/90">
          {t(
            "Need something moved across town? Our rider picks it up and drops it at the door — parcels, documents, forgotten keys, all of it.",
            "शहर में कुछ भेजना है? हमारा राइडर सामान उठाकर दरवाज़े तक पहुंचाएगा — पार्सल, कागज़, भूली हुई चाबी, सब कुछ।",
          )}
        </p>

        <ul className="mt-4 space-y-2 text-[13px] font-semibold">
          <li className="flex items-center gap-2">
            <MapPin className="size-4 shrink-0" />{" "}
            {t("Anywhere within Bemetara", "बेमेतरा में कहीं भी")}
          </li>
          <li className="flex items-center gap-2">
            <Clock className="size-4 shrink-0" />{" "}
            {t("Same-hour door-to-door pickup", "एक घंटे के अंदर घर से घर तक")}
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
        {t(
          "Coming soon — Pick & Drop will be rolling out in Bemetara soon.",
          "जल्द आ रहा है — पिक और ड्रॉप बेमेतरा में जल्द शुरू होगा।",
        )}
      </p>
    </section>
  );
}
