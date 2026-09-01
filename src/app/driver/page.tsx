import Link from "next/link";
import { Bike } from "lucide-react";
import { DriverBoard } from "@/components/driver/driver-board";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { getProfile } from "@/lib/auth";
import { getDriverBoard, type DriverBoardData } from "@/lib/data-access/driver-orders";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getSettings } from "@/lib/settings";
import { AVAILABLE_JOBS, DRIVER_TODAY } from "@/lib/roles-data";

const DEMO_BOARD: DriverBoardData = {
  // Nothing is reserved in the demo: there is no dispatch without a backend to
  // dispatch from, so every card reads as open to everyone — which is what a
  // no-backend install actually is.
  available: AVAILABLE_JOBS.map((job) => ({ ...job, reservedForYou: false })),
  upcoming: [],
  active: null,
  today: { trips: DRIVER_TODAY.trips },
};

export default async function DriverPage() {
  // Demo jobs only when there is no backend at all. They used to also stand in
  // whenever the live query threw — fabricated jobs ("Blue Tokai Cafe", ₹62)
  // that look identical to real ones, offered to a real rider.
  if (!isSupabaseConfigured) {
    return <DriverBoard initial={DEMO_BOARD} live={false} />;
  }

  const profile = await getProfile();
  if (profile?.role !== "driver") {
    // Not a driver. This used to fall through to DEMO_BOARD as well, so any
    // signed-in customer opening /driver was shown invented delivery offers —
    // ₹62 from "Blue Tokai Cafe" in Indiranagar, a city Deligro does not operate
    // in — plus a fabricated ₹640 of earnings across 12 trips they had never
    // made. The "Demo data" label carried the whole weight of that, on a screen
    // whose entire content was otherwise indistinguishable from real work.
    //
    // The demo board earns its place when there is no backend to contradict it.
    // Here there is one, and it says this person is not a rider.
    return (
      <div className="space-y-6">
        <EmptyState
          className="mt-12"
          icon={<Bike className="size-7" />}
          title="This is the courier app"
          description="Your account isn't set up as a Deligro rider, so there are no deliveries to show. If you're meant to have rider access, ask Deligro ops to enable it."
          action={
            <Link href="/">
              <Button>Back to Deligro</Button>
            </Link>
          }
        />
      </div>
    );
  }

  const [board, settings] = await Promise.all([
    getDriverBoard(profile.id),
    getSettings(),
  ]);
  return (
    <DriverBoard
      initial={board}
      live
      alertSoundPreset={settings.riderAlertSoundPreset}
      alertSoundUrl={settings.riderAlertSoundUrl}
    />
  );
}
