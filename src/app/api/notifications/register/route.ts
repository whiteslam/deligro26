import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";

/**
 * Save the signed-in user's OneSignal player id to their profile.
 * The browser SDK subscribes, then POSTs { playerId } here. Writes go through
 * the RLS server client, so a user can only ever update their own row.
 */
export async function POST(req: Request) {
  if (!isSupabaseConfigured) {
    return NextResponse.json({ ok: false, error: "not_configured" }, { status: 503 });
  }

  let playerId: unknown;
  try {
    ({ playerId } = await req.json());
  } catch {
    return NextResponse.json({ ok: false, error: "bad_body" }, { status: 400 });
  }
  if (typeof playerId !== "string" || playerId.length < 8 || playerId.length > 100) {
    return NextResponse.json({ ok: false, error: "bad_player_id" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const limit = await rateLimit(`push-register:${user.id}`, 20, 60_000);
  if (!limit.ok) return tooManyRequests(limit);

  const { error } = await supabase
    .from("profiles")
    .update({ onesignal_id: playerId })
    .eq("id", user.id);
  if (error) {
    return NextResponse.json({ ok: false, error: "save_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
