import { DriverBoard } from "@/components/driver/driver-board";
import { getProfile } from "@/lib/auth";
import { getDriverBoard, type DriverBoardData } from "@/lib/data-access/driver-orders";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { AVAILABLE_JOBS, DRIVER_TODAY } from "@/lib/roles-data";

const DEMO_BOARD: DriverBoardData = {
  available: AVAILABLE_JOBS,
  active: null,
  today: { trips: DRIVER_TODAY.trips, earnings: DRIVER_TODAY.earnings },
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
    return <DriverBoard initial={DEMO_BOARD} live={false} />;
  }

  const board = await getDriverBoard(profile.id);
  return <DriverBoard initial={board} live />;
}
