import { requireRole } from "@/lib/auth";
import { listPromotableRestaurants } from "@/lib/data-access/promotions";
import { AdminHero, BackLink } from "@/components/admin/admin-ui";
import { PromotionForm } from "@/components/promotions/promotion-form";
import { saveCouponAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function NewCouponPage() {
  // The action checks the role again — this is the page's own gate, so a
  // non-admin never renders the form in the first place.
  await requireRole("admin");
  const restaurants = await listPromotableRestaurants();

  return (
    <>
      <BackLink href="/admin/coupons">Promo codes</BackLink>
      <AdminHero
        title="New promo code"
        subtitle="What it takes off, where it works, and who pays for it"
      />
      <PromotionForm
        action={saveCouponAction.bind(null, "")}
        restaurants={restaurants}
        cancelHref="/admin/coupons"
      />
    </>
  );
}
