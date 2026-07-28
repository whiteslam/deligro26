import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { legiblePassword } from "@/lib/utils/password";
import { toE164 } from "@/lib/auth/phone";

/**
 * Platform staff accounts, created by an operator from Settings → Team.
 *
 * The app's `user_role` enum has no "manager" — a manager IS a platform admin.
 * So the two UI roles map onto the real profile roles: manager → admin (full
 * admin panel) and driver → driver (delivery portal). Account creation reaches
 * for the service-role client because it must create an auth user and set a
 * privileged role past the `lock_role` trigger, which RLS can't express.
 */

export type EmployeeRole = "manager" | "driver";

export const EMPLOYEE_ROLES: readonly EmployeeRole[] = ["manager", "driver"];

/** UI role → real profile role. Manager == platform admin. */
const TO_PROFILE_ROLE: Record<EmployeeRole, "admin" | "driver"> = {
  manager: "admin",
  driver: "driver",
};

/** Real profile role → UI role, for listing existing staff. */
function toEmployeeRole(role: string): EmployeeRole {
  return role === "admin" ? "manager" : "driver";
}

export interface EmployeeInput {
  fullName: string;
  email: string;
  phone?: string | null;
  role: EmployeeRole;
  /** Operator-chosen password; auto-generated when absent or too short. */
  password?: string | null;
}

export interface EmployeeListItem {
  id: string;
  fullName: string | null;
  phone: string | null;
  role: EmployeeRole;
  createdAt: string | null;
}

export interface CreateEmployeeResult {
  userId: string;
  /** The initial login password to hand off. */
  password: string;
}

export class EmployeeEmailTakenError extends Error {
  constructor() {
    super("email_taken");
    this.name = "EmployeeEmailTakenError";
  }
}

export class EmployeePhoneTakenError extends Error {
  constructor() {
    super("phone_taken");
    this.name = "EmployeePhoneTakenError";
  }
}

type AdminClient = ReturnType<typeof createAdminClient>;

/** Page through auth.users to find an email (one listUsers call is one page). */
async function findUserId(
  admin: AdminClient,
  email: string
): Promise<string | undefined> {
  const target = email.toLowerCase();
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const hit = data.users.find((u) => u.email?.toLowerCase() === target);
    if (hit) return hit.id;
    if (data.users.length < 1000) break;
  }
  return undefined;
}

/**
 * Create a staff login: an auth user plus a profile with the privileged role.
 * Auth + SQL aren't one transaction, so the auth user is created first and
 * deleted again if the profile write fails (leaving nothing behind).
 */
export async function createEmployee(
  input: EmployeeInput
): Promise<CreateEmployeeResult> {
  const email = input.email?.trim();
  const fullName = input.fullName?.trim();
  if (!email) throw new Error("email_required");
  if (!fullName) throw new Error("name_required");
  const profileRole = TO_PROFILE_ROLE[input.role];
  if (!profileRole) throw new Error("invalid_role");

  const admin = createAdminClient();

  // A pre-existing account isn't silently hijacked — the operator picks another
  // email (linking an existing user to a staff role is a separate concern).
  const existing = await findUserId(admin, email);
  if (existing) throw new EmployeeEmailTakenError();

  const password =
    input.password && input.password.length >= 8
      ? input.password
      : legiblePassword();

  // Store the mobile in E.164 on the profile so OTP login can resolve this staff
  // member. We deliberately do NOT set `phone` on the auth user: auth.users.phone
  // is globally unique and a number already used for a customer OTP would collide
  // and fail the whole account creation.
  const phoneToStore = input.phone
    ? toE164(input.phone) ?? (input.phone.trim() || null)
    : null;

  // profiles.phone carries a partial UNIQUE index (migration 0005). A mobile
  // already on another profile — often an existing customer — would fail the
  // upsert with a 23505 that surfaces only as a generic error. Check up front so
  // the operator gets an actionable message and we don't create+roll back a user.
  if (phoneToStore) {
    const { data: clash } = await admin
      .from("profiles")
      .select("id")
      .eq("phone", phoneToStore)
      .maybeSingle();
    if (clash) throw new EmployeePhoneTakenError();
  }

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (createErr) throw createErr;
  const userId = created.user.id;

  try {
    // The signup trigger already inserted a `customer` profile row; upsert lifts
    // it to the staff role (service-role bypasses the lock_role trigger).
    const { error: profErr } = await admin.from("profiles").upsert(
      {
        id: userId,
        role: profileRole,
        full_name: fullName,
        phone: phoneToStore,
      },
      { onConflict: "id" }
    );
    // Belt-and-suspenders: a phone can be claimed between the check above and
    // here — map the unique violation to the same clear error.
    if (profErr) {
      if (profErr.code === "23505") throw new EmployeePhoneTakenError();
      throw profErr;
    }
    return { userId, password };
  } catch (err) {
    // Roll back the auth user so a failed write leaves nothing behind.
    await admin.auth.admin.deleteUser(userId).catch(() => {});
    throw err;
  }
}

/** Every manager (admin) and driver on the platform, newest first. */
export async function listEmployees(): Promise<EmployeeListItem[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .select("id, role, full_name, phone, created_at")
    .in("role", ["admin", "driver"])
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => {
    const row = r as {
      id: string;
      role: string;
      full_name: string | null;
      phone: string | null;
      created_at: string | null;
    };
    return {
      id: row.id,
      fullName: row.full_name,
      phone: row.phone,
      role: toEmployeeRole(row.role),
      createdAt: row.created_at,
    };
  });
}
