import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import {
  getPromotion,
  listPromotableRestaurants,
} from "@/lib/data-access/promotions";
import { AdminHero, BackLink } from "@/components/admin/admin-ui";
import { PromotionForm } from "@/components/promotions/promotion-form";
import { formatINR } from "@/lib/utils/format";
import { saveCouponAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function EditCouponPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  await requireRole("admin");
  const { code } = await params;
  const [promotion, restaurants] = await Promise.all([
    getPromotion(decodeURIComponent(code)),
    listPromotableRestaurants(),
  ]);
  if (!promotion) notFound();

  return (
    <>
      <BackLink href="/admin/coupons">Promo codes</BackLink>
      <AdminHero
        title={promotion.code}
        tag={`${promotion.redemptions} claimed`}
        subtitle={`${formatINR(promotion.discountGiven)} given away · ${
          promotion.restaurantName ?? "every shop"
        }`}
      />
      <PromotionForm
        action={saveCouponAction.bind(null, promotion.code)}
        promotion={promotion}
        restaurants={restaurants}
        cancelHref="/admin/coupons"
      />
    </>
  );
}
