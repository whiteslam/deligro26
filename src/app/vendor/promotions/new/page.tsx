import { requireVendorAccess } from "@/lib/auth/vendor-access";
import { resolveVendorRestaurant } from "@/lib/data-access/vendor-restaurant";
import { VendorPageHeader } from "@/components/vendor/vendor-page-header";
import { PromotionForm } from "@/components/promotions/promotion-form";
import { saveVendorPromotionAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function NewVendorPromotionPage() {
  await requireVendorAccess();
  const restaurant = await resolveVendorRestaurant();

  if (!restaurant) {
    return (
      <div className="space-y-6">
        <VendorPageHeader
          title="New promotion"
          subtitle="No shop is linked to this account yet."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <VendorPageHeader
        title="New promotion"
        subtitle={`A code customers type at checkout for ${restaurant.name}`}
      />
      {/* No shop picker and no funding choice: the server pins both from the
          session, and the RLS policies refuse anything else. */}
      <PromotionForm
        action={saveVendorPromotionAction.bind(null, "")}
        fixedRestaurant={{ id: restaurant.id, name: restaurant.name }}
        cancelHref="/vendor/promotions"
      />
    </div>
  );
}
