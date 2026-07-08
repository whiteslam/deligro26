import { DriverBoard } from "@/components/driver/driver-board";
import { getProfile } from "@/lib/auth";
import { getDriverBoard, type DriverBoardData } from "@/lib/data-access/driver-orders";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { AVAILABLE_JOBS, DRIVER_TODAY } from "@/lib/roles-data";

const DEMO_BOARD: DriverBoardData = {
  available: AVAILABLE_JOBS,
  active: null,
  today: {
    trips: DRIVER_TODAY.trips,
    earnings: DRIVER_TODAY.earnings,
    onlineHours: DRIVER_TODAY.onlineHours,
    rating: DRIVER_TODAY.rating,
  },
};

export default async function DriverPage() {
  let board = DEMO_BOARD;
  let live = false;

  if (isSupabaseConfigured) {
    const profile = await getProfile();
    if (profile?.role === "driver") {
      try {
        board = await getDriverBoard(profile.id);
        live = true;
      } catch {
        // fall back to demo data
      }
    }
  }

  return <DriverBoard initial={board} live={live} />;
}
