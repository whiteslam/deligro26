import { VendorProfileView } from "@/components/vendor/vendor-profile-view";
import { VendorPageHeader } from "@/components/vendor/vendor-page-header";
import { getProfile } from "@/lib/auth";
import { getVendorProfileSummary } from "@/lib/data-access/vendor-profile";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

export default async function VendorProfilePage() {
  if (!isSupabaseConfigured) {
    return (
      <div className="space-y-6">
        <VendorPageHeader
          title="Profile"
          subtitle="Connect Supabase to view your account."
        />
      </div>
    );
  }

  const role = await getProfile();
  if (role?.role !== "restaurant") {
    return (
      <div className="space-y-6">
        <VendorPageHeader
          title="Profile"
          subtitle="Restaurant access required."
        />
      </div>
    );
  }

  let profile: Awaited<ReturnType<typeof getVendorProfileSummary>>;
  try {
    profile = await getVendorProfileSummary();
  } catch {
    return (
      <div className="space-y-6">
        <VendorPageHeader
          title="Profile"
          subtitle="Could not load your profile. Try again."
        />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="space-y-6">
        <VendorPageHeader
          title="Profile"
          subtitle="Sign in to view your restaurant account."
        />
      </div>
    );
  }

  return <VendorProfileView profile={profile} live />;
}
