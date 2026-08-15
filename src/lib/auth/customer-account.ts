import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { phoneToSyntheticEmail } from "@/lib/auth/phone";

/**
 * Turning a phone number into a Supabase account.
 *
 * There is exactly one way an account comes into existence from a bare mobile
 * number, and this is it. That matters more than the code is long: the rules
 * here — an existing profile wins whatever its role, a new account is a
 * phone-only synthetic user, the profile is backfilled with the number so the
 * next lookup finds it — are the difference between "the customer who rang is
 * the account that ordered" and two half-accounts for the same person, one made
 * by OTP login and one made by the phone-order desk.
 *
 * Both callers are here for that reason:
 *   * OTP verify (`data-access/otp.ts`) — the customer signing themselves in.
 *   * Phone orders (`data-access/manager-phone-orders.ts`) — an operator taking
 *     an order for someone who has never opened the app.
 *
 * Everything runs on the service-role client: creating an auth user and writing
 * a profile row are both past what any RLS policy can express. Neither caller
 * reaches this file without an authorization check of its own first.
 */

export interface ResolvedAccount {
  /** profiles.id === auth.users.id. */
  id: string;
  /**
   * The auth email. A real one when the account already had it, otherwise the
   * synthetic `p<digits>@phone.deligro.app` form. OTP needs it to mint a
   * magic-link token; the phone-order path ignores it.
   */
  email: string;
  isNewUser: boolean;
}

export interface ResolveOptions {
  /**
   * A name to put on the profile — used when an operator takes a name over the
   * phone. Applied ONLY when the profile has no name yet. A phone order is not
   * an identity edit: the caller may be a family member, a colleague ordering
   * for the office, or a mis-typed digit away from someone else's account, and
   * none of those are grounds to rename a real customer.
   */
  fullName?: string | null;
}

/**
 * Find an auth user by exact email, paging until found. Supabase's admin API
 * has no direct get-by-email, so we walk pages — but we walk *all* of them
 * instead of assuming everyone fits on the first.
 */
async function findUserByEmail(email: string): Promise<{ id: string } | null> {
  const supabase = createAdminClient();
  const target = email.toLowerCase();
  const perPage = 200;

  for (let page = 1; page <= 50; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error || !data?.users?.length) return null;

    const hit = data.users.find((u) => u.email?.toLowerCase() === target);
    if (hit) return { id: hit.id };

    if (data.users.length < perPage) return null; // last page
  }
  return null;
}

/**
 * The account that owns this number, creating a phone-only customer if none
 * does. `phone` must already be E.164 — see `toE164()`; every profile and every
 * OTP row stores that form, so a raw "9876543210" here silently matches nobody
 * and creates a duplicate account.
 *
 * Returns null only when the account could neither be found nor created.
 */
export async function resolveAccountByPhone(
  phone: string,
  options: ResolveOptions = {}
): Promise<ResolvedAccount | null> {
  const supabase = createAdminClient();
  const fullName = options.fullName?.trim() || null;

  // 1. Existing profile with this phone? Any role wins, so an operator or a
  //    vendor who rings up for their own dinner gets their real account rather
  //    than a second, customer-shaped one.
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("phone", phone)
    .maybeSingle();

  if (profile?.id) {
    const { data } = await supabase.auth.admin.getUserById(profile.id);
    const existingEmail = data.user?.email;
    if (existingEmail) {
      await nameIfBlank(supabase, profile.id, profile.full_name, fullName);
      return { id: profile.id, email: existingEmail, isNewUser: false };
    }
    // A profile whose auth user has no email cannot be sent a magic link and
    // cannot be looked up again; fall through and let the synthetic branch
    // establish one.
  }

  // 2. Phone-only synthetic user (create if needed).
  const email = phoneToSyntheticEmail(phone);
  const { data: created, error } = await supabase.auth.admin.createUser({
    email,
    phone,
    email_confirm: true,
    phone_confirm: true,
    user_metadata: { phone },
  });

  if (error) {
    // Almost certainly "already registered". Look the account up directly
    // rather than paging the user list — the previous `listUsers({perPage: 200})`
    // silently stopped finding anyone past the 200th user, turning a normal
    // repeat login into an unexplained failure once the app grew.
    const found = await findUserByEmail(email);
    if (!found) return null;

    // The profile is missing the number (that is why step 1 missed it), so
    // write it back — this is the repair that stops the same account being
    // re-resolved from scratch on every future call.
    const { data: repaired } = await supabase
      .from("profiles")
      .update({ phone })
      .eq("id", found.id)
      .select("full_name")
      .maybeSingle();
    await nameIfBlank(supabase, found.id, repaired?.full_name ?? null, fullName);
    return { id: found.id, email, isNewUser: false };
  }

  // Backfill onto the auto-created profile (the signup trigger made it, with
  // role 'customer' and no phone).
  await supabase
    .from("profiles")
    .update({ phone, ...(fullName ? { full_name: fullName } : {}) })
    .eq("id", created.user.id);

  return { id: created.user.id, email, isNewUser: true };
}

/** Fill in a missing name; never overwrite one the customer already has. */
async function nameIfBlank(
  supabase: ReturnType<typeof createAdminClient>,
  id: string,
  current: string | null,
  proposed: string | null
): Promise<void> {
  if (!proposed || current?.trim()) return;
  await supabase.from("profiles").update({ full_name: proposed }).eq("id", id);
}
