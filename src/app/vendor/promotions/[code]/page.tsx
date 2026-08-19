import { notFound } from "next/navigation";
import { requireVendorAccess } from "@/lib/auth/vendor-access";
import { resolveVendorRestaurant } from "@/lib/data-access/vendor-restaurant";
import { getPromotion } from "@/lib/data-access/promotions";
import { VendorPageHeader } from "@/components/vendor/vendor-page-header";
import { PromotionForm } from "@/components/promotions/promotion-form";
import { formatINR } from "@/lib/utils/format";
import { saveVendorPromotionAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function EditVendorPromotionPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  await requireVendorAccess();
  const { code } = await params;
  const [restaurant, promotion] = await Promise.all([
    resolveVendorRestaurant(),
    getPromotion(decodeURIComponent(code)),
  ]);

  // Someone else's code reads as no code at all. The RLS policy already returns
  // nothing for it; this is what turns that into the right page.
  if (!restaurant || !promotion || promotion.restaurantId !== restaurant.id) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <VendorPageHeader
        title={promotion.code}
        subtitle={`${promotion.redemptions} claimed · ${formatINR(
          promotion.discountGiven
        )} off customer bills`}
      />
      <PromotionForm
        action={saveVendorPromotionAction.bind(null, promotion.code)}
        promotion={promotion}
        fixedRestaurant={{ id: restaurant.id, name: restaurant.name }}
        cancelHref="/vendor/promotions"
      />
    </div>
  );
}
