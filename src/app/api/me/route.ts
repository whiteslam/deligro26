import { NextResponse } from "next/server";
import { getProfile } from "@/lib/auth";

/**
 * The signed-in user's identity, used by clients for role-aware routing right
 * after a session is established (and by the separate mobile clients to reject a
 * mismatched role at their own login screen). `role` is null when signed out.
 */
export async function GET() {
  const profile = await getProfile();
  if (!profile) {
    return NextResponse.json({ role: null }, { status: 200 });
  }
  return NextResponse.json({ id: profile.id, role: profile.role });
}
