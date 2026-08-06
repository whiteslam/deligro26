import type { Role } from "@/lib/auth";
import { landingFor } from "@/lib/auth/role-home";

/**
 * Client helper: after a session is established, ask the server for our role and
 * resolve the correct landing path. Falls back to `next` if the lookup fails, so
 * a transient error degrades to the old behaviour rather than blocking sign-in.
 */
export async function resolveLanding(next: string): Promise<string> {
  try {
    const res = await fetch("/api/me", { cache: "no-store" });
    const data = (await res.json()) as { role?: Role | null };
    if (data?.role) return landingFor(data.role, next);
  } catch {
    // fall through to `next`
  }
  return next;
}
