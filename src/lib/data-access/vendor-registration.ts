import "server-only";
import { randomBytes } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { slugify } from "@/lib/data-access/vendor-categories";

/**
 * The vendor registration wizard's backend (migration 0018). Drafts are stored
 * as JSON and read/written through the admin-gated `is_admin()` RLS via the
 * cookie-bound client. The final account creation reaches for the service-role
 * client — it must create an auth user and set role='restaurant' past the
 * `lock_role` trigger, which RLS cannot express.
 */

export interface DraftMenuItem {
  name: string;
  category?: string | null;
  description?: string | null;
  price: number;
  veg: boolean;
  available: boolean;
}

/** The whole wizard form, as persisted (minus the password, which is stripped). */
export interface VendorDraftData {
  shopName?: string;
  ownerName?: string;
  mobile?: string;
  altMobile?: string;
  email?: string;
  /** Only present in-flight from the client; never saved to a draft. */
  password?: string;
  logoUrl?: string;
  coverUrl?: string;
  category?: string;
  description?: string;
  openingTime?: string;
  closingTime?: string;
  weeklyOff?: string[];
  deliveryAvailable?: boolean;
  selfPickup?: boolean;
  minOrder?: number;
  address?: string;
  landmark?: string;
  pincode?: string;
  lat?: number | null;
  lng?: number | null;
  upiId?: string;
  bankAccountName?: string;
  bankName?: string;
  bankAccountNumber?: string;
  bankIfsc?: string;
  commissionPct?: number;
  fssaiNumber?: string;
  gstNumber?: string;
  panNumber?: string;
  menuItems?: DraftMenuItem[];
  tcAccepted?: boolean;
  tcVersion?: string;
}

export interface RegistrationDraft {
  id: string;
  data: VendorDraftData;
  step: number;
  updatedAt: string;
}

export interface DraftSummary {
  id: string;
  shopName: string;
  step: number;
  updatedAt: string;
}

function isMissingTable(
  error: { code?: string; message?: string } | null
): boolean {
  if (!error) return false;
  const code = error.code ?? "";
  const msg = (error.message ?? "").toLowerCase();
  return (
    code === "42P01" ||
    code === "PGRST205" ||
    msg.includes("schema cache") ||
    msg.includes("does not exist")
  );
}

/** Passwords never touch the draft — strip them before persisting. */
function stripSecrets(data: VendorDraftData): VendorDraftData {
  const clone = { ...data };
  delete clone.password;
  return clone;
}

/** Create (id null) or update a draft; returns the draft id for resume. */
export async function saveDraft(
  id: string | null,
  data: VendorDraftData,
  step: number
): Promise<string> {
  const supabase = await createClient();
  const payload = stripSecrets(data);

  if (id) {
    const { error } = await supabase
      .from("vendor_registration_drafts")
      .update({ data: payload, step, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;
    return id;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("unauthorized");

  const { data: row, error } = await supabase
    .from("vendor_registration_drafts")
    .insert({ created_by: user.id, data: payload, step })
    .select("id")
    .single();
  if (error) throw error;
  return row.id as string;
}

export async function loadDraft(id: string): Promise<RegistrationDraft | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vendor_registration_drafts")
    .select("id, data, step, updated_at")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    if (isMissingTable(error)) return null;
    throw error;
  }
  if (!data) return null;
  const row = data as {
    id: string;
    data: VendorDraftData;
    step: number;
    updated_at: string;
  };
  return {
    id: row.id,
    data: row.data ?? {},
    step: row.step ?? 0,
    updatedAt: row.updated_at,
  };
}

export async function listDrafts(): Promise<DraftSummary[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vendor_registration_drafts")
    .select("id, data, step, updated_at")
    .order("updated_at", { ascending: false })
    .limit(20);
  if (error) {
    if (isMissingTable(error)) return [];
    throw error;
  }
  return (data ?? []).map((r) => {
    const row = r as {
      id: string;
      data: VendorDraftData;
      step: number;
      updated_at: string;
    };
    return {
      id: row.id,
      shopName: row.data?.shopName?.trim() || "Untitled vendor",
      step: row.step ?? 0,
      updatedAt: row.updated_at,
    };
  });
}

export async function deleteDraft(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("vendor_registration_drafts")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

// ---------- account creation (service-role) ----------

type AdminClient = ReturnType<typeof createAdminClient>;

/** Page through auth.users to find an email (a single listUsers call is one page). */
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

/** A restaurant slug that isn't taken, suffixing -2, -3, … on collision. */
async function uniqueRestaurantSlug(
  admin: AdminClient,
  base: string
): Promise<string> {
  const root = base || "shop";
  for (let n = 1; n <= 50; n++) {
    const candidate = n === 1 ? root : `${root}-${n}`;
    const { data } = await admin
      .from("restaurants")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();
    if (!data) return candidate;
  }
  return `${root}-${Date.now()}`;
}

function newPassword(): string {
  return randomBytes(9).toString("base64url");
}

export class EmailTakenError extends Error {
  constructor() {
    super("email_taken");
    this.name = "EmailTakenError";
  }
}

export interface CreateVendorResult {
  restaurantId: string;
  ownerId: string;
  /** The initial login password to hand off (chosen by the operator or generated). */
  password: string;
}

/**
 * Turn a completed draft into a live vendor: an auth user (role='restaurant'),
 * its restaurant row (status='pending'), and any menu items. Auth + SQL aren't
 * one transaction, so the auth user is created first and deleted again if the
 * restaurant insert fails.
 */
export async function createVendorAccount(
  data: VendorDraftData,
  operatorId: string
): Promise<CreateVendorResult> {
  const email = data.email?.trim();
  if (!email) throw new Error("email_required");
  if (!data.shopName?.trim()) throw new Error("shop_name_required");

  const admin = createAdminClient();

  // A pre-existing account isn't silently hijacked — the operator picks another
  // email. (Linking an existing customer to a vendor role is a separate flow.)
  const existing = await findUserId(admin, email);
  if (existing) throw new EmailTakenError();

  const password =
    data.password && data.password.length >= 8 ? data.password : newPassword();

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: data.ownerName ?? data.shopName },
  });
  if (createErr) throw createErr;
  const ownerId = created.user.id;

  try {
    const { error: profErr } = await admin.from("profiles").upsert(
      {
        id: ownerId,
        role: "restaurant",
        full_name: data.ownerName ?? data.shopName ?? null,
        phone: data.mobile ?? null,
      },
      { onConflict: "id" }
    );
    if (profErr) throw profErr;

    const slug = await uniqueRestaurantSlug(admin, slugify(data.shopName));
    const { data: rest, error: restErr } = await admin
      .from("restaurants")
      .insert({
        owner_id: ownerId,
        slug,
        name: data.shopName.trim(),
        description: data.description ?? null,
        category: data.category ?? null,
        image_url: data.logoUrl ?? null,
        is_open: true,
        status: "pending",
        owner_name: data.ownerName ?? null,
        owner_mobile: data.mobile ?? null,
        owner_alt_mobile: data.altMobile ?? null,
        owner_email: email,
        commission_pct: Math.min(100, Math.max(0, data.commissionPct ?? 0)),
        min_order: Math.max(0, Math.trunc(data.minOrder ?? 0)),
        delivery_available: data.deliveryAvailable ?? true,
        self_pickup: data.selfPickup ?? false,
        opening_time: data.openingTime || null,
        closing_time: data.closingTime || null,
        weekly_off: data.weeklyOff ?? [],
        address: data.address ?? null,
        landmark: data.landmark ?? null,
        pincode: data.pincode ?? null,
        lat: data.lat ?? null,
        lng: data.lng ?? null,
        upi_id: data.upiId ?? null,
        bank_account_name: data.bankAccountName ?? null,
        bank_name: data.bankName ?? null,
        bank_account_number: data.bankAccountNumber ?? null,
        bank_ifsc: data.bankIfsc ?? null,
        fssai_number: data.fssaiNumber ?? null,
        gst_number: data.gstNumber ?? null,
        pan_number: data.panNumber ?? null,
        tc_accepted_at: new Date().toISOString(),
        tc_accepted_by: operatorId,
        tc_version: data.tcVersion ?? null,
      })
      .select("id")
      .single();
    if (restErr) throw restErr;
    const restaurantId = rest.id as string;

    // Optional seed menu. Best-effort — a bad row shouldn't fail the whole
    // onboarding; the operator can fix the menu from the vendor later.
    const items = (data.menuItems ?? []).filter((m) => m.name?.trim());
    if (items.length > 0) {
      await admin.from("menu_items").insert(
        items.map((m) => ({
          restaurant_id: restaurantId,
          name: m.name.trim(),
          description: m.description ?? null,
          price: Math.max(0, Math.trunc(m.price ?? 0)),
          veg: m.veg ?? true,
          available: m.available ?? true,
          category: m.category ?? null,
        }))
      );
    }

    return { restaurantId, ownerId, password };
  } catch (err) {
    // Roll back the auth user we just created so a failed insert leaves nothing.
    await admin.auth.admin.deleteUser(ownerId).catch(() => {});
    throw err;
  }
}
