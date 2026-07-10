import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { GUEST_COOKIE } from "@/lib/auth/guest";

export type Role = "customer" | "restaurant" | "driver" | "admin";

export interface Profile {
  id: string;
  role: Role;
  full_name: string | null;
  phone: string | null;
}

/** Current user's profile, or null if signed out / not configured. */
export async function getProfile(): Promise<Profile | null> {
  if (!isSupabaseConfigured) return null;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("id, role, full_name, phone")
    .eq("id", user.id)
    .single();

  return (data as Profile) ?? null;
}

/** True when this visitor chose "Explore as guest" (cookie set, no session). */
export async function isGuest(): Promise<boolean> {
  const store = await cookies();
  return store.get(GUEST_COOKIE)?.value === "1";
}

export type AccessState = "user" | "guest" | "anon";

/**
 * The three-way access state used by guest-aware UI. A real session always
 * wins over the guest flag — so a signed-in visitor never reads as a guest.
 */
export async function getAccess(): Promise<{
  profile: Profile | null;
  state: AccessState;
}> {
  const profile = await getProfile();
  if (profile) return { profile, state: "user" };
  return { profile: null, state: (await isGuest()) ? "guest" : "anon" };
}

/** Require a signed-in user, else send to login. */
export async function requireUser(): Promise<Profile> {
  if (!isSupabaseConfigured) return DEMO_PROFILE("customer");
  const profile = await getProfile();
  if (!profile) redirect("/login");
  return profile;
}

/**
 * Require a signed-in user whose role is allowed here. This is the server-side
 * role check (check #2 of authenticated -> role -> ownership). Wrong role gets a
 * consistent redirect — the UI never decides access on its own.
 *
 * In demo mode (no Supabase keys) it passes through so the static UI renders.
 */
export async function requireRole(role: Role | Role[]): Promise<Profile> {
  const allowed = Array.isArray(role) ? role : [role];
  if (!isSupabaseConfigured) return DEMO_PROFILE(allowed[0]);

  const profile = await requireUser();
  if (!allowed.includes(profile.role)) {
    redirect("/login?denied=1");
  }
  return profile;
}

function DEMO_PROFILE(role: Role): Profile {
  return { id: "demo-user", role, full_name: "Demo user", phone: null };
}
