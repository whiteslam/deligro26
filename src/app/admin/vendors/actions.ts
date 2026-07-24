"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  updateVendor,
  setVendorStatus,
  deleteVendor,
  resetVendorPassword,
  VENDOR_STATUSES,
  type VendorInput,
  type VendorStatus,
} from "@/lib/data-access/admin-vendors";
import {
  createCategory,
  updateCategory,
  setCategoryEnabled,
  deleteCategory,
  type VendorCategoryInput,
} from "@/lib/data-access/vendor-categories";
import {
  saveDraft,
  deleteDraft,
  createVendorAccount,
  EmailTakenError,
  type VendorDraftData,
} from "@/lib/data-access/vendor-registration";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

const DEMO = "Demo mode: connect Supabase and apply 0017 to manage vendors.";

/** Shared wrapper for the fire-and-refresh row actions. */
async function mutate(fn: () => Promise<unknown>): Promise<ActionResult> {
  await requireRole("admin");
  if (!isSupabaseConfigured) return { ok: false, error: DEMO };
  try {
    await fn();
  } catch {
    return { ok: false, error: "That didn't go through. Try again." };
  }
  revalidatePath("/admin/vendors");
  revalidatePath("/", "layout");
  return { ok: true };
}

// ---------- form parsing (FormData → VendorInput) ----------

function str(form: FormData, key: string): string {
  const v = form.get(key);
  return typeof v === "string" ? v.trim() : "";
}
function strOrNull(form: FormData, key: string): string | null {
  return str(form, key) || null;
}
function num(form: FormData, key: string, fallback = 0): number {
  const n = Number(form.get(key));
  return Number.isFinite(n) ? n : fallback;
}
function bool(form: FormData, key: string): boolean {
  return form.get(key) === "on";
}

function parseVendor(form: FormData): VendorInput {
  const weeklyOff = form
    .getAll("weeklyOff")
    .filter((v): v is string => typeof v === "string");
  return {
    name: str(form, "name"),
    category: strOrNull(form, "category"),
    ownerName: strOrNull(form, "ownerName"),
    ownerMobile: strOrNull(form, "ownerMobile"),
    ownerAltMobile: strOrNull(form, "ownerAltMobile"),
    ownerEmail: strOrNull(form, "ownerEmail"),
    tagline: strOrNull(form, "tagline"),
    description: strOrNull(form, "description"),
    commissionPct: Math.min(100, Math.max(0, num(form, "commissionPct"))),
    minOrder: Math.max(0, Math.trunc(num(form, "minOrder"))),
    deliveryAvailable: bool(form, "deliveryAvailable"),
    selfPickup: bool(form, "selfPickup"),
    openingTime: strOrNull(form, "openingTime"),
    closingTime: strOrNull(form, "closingTime"),
    weeklyOff,
    address: strOrNull(form, "address"),
    landmark: strOrNull(form, "landmark"),
    pincode: strOrNull(form, "pincode"),
    upiId: strOrNull(form, "upiId"),
    bankAccountName: strOrNull(form, "bankAccountName"),
    bankAccountNumber: strOrNull(form, "bankAccountNumber"),
    bankIfsc: strOrNull(form, "bankIfsc"),
    bankName: strOrNull(form, "bankName"),
    fssaiNumber: strOrNull(form, "fssaiNumber"),
    gstNumber: strOrNull(form, "gstNumber"),
    panNumber: strOrNull(form, "panNumber"),
  };
}

function validateVendor(input: VendorInput): string | null {
  if (!input.name) return "Shop name is required.";
  if (input.commissionPct < 0 || input.commissionPct > 100)
    return "Commission must be between 0 and 100%.";
  if (input.ownerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.ownerEmail))
    return "That email address doesn't look right.";
  return null;
}

// ---------- vendor edit ----------

/** Edit a vendor's business fields. `id` is bound by the form. */
export async function saveVendorAction(
  id: string,
  _prev: ActionResult,
  form: FormData
): Promise<ActionResult> {
  await requireRole("admin");
  if (!isSupabaseConfigured) return { ok: false, error: DEMO };
  if (!id) return { ok: false, error: "Missing vendor id." };

  const input = parseVendor(form);
  const problem = validateVendor(input);
  if (problem) return { ok: false, error: problem };

  try {
    await updateVendor(id, input);
  } catch {
    return { ok: false, error: "Couldn't save the vendor. Try again." };
  }

  revalidatePath("/admin/vendors");
  revalidatePath(`/admin/vendors/${id}`);
  revalidatePath("/", "layout");
  redirect(`/admin/vendors/${id}`);
}

// ---------- row actions ----------

export async function setVendorStatusAction(id: string, status: VendorStatus) {
  if (!VENDOR_STATUSES.includes(status)) {
    return { ok: false, error: "Unknown status." };
  }
  return mutate(() => setVendorStatus(id, status));
}

export interface DeleteVendorActionResult extends ActionResult {
  softDeleted?: boolean;
}

export async function deleteVendorAction(
  id: string
): Promise<DeleteVendorActionResult> {
  await requireRole("admin");
  if (!isSupabaseConfigured) return { ok: false, error: DEMO };
  try {
    const { softDeleted } = await deleteVendor(id);
    revalidatePath("/admin/vendors");
    revalidatePath("/", "layout");
    return { ok: true, softDeleted };
  } catch {
    return { ok: false, error: "Couldn't delete this vendor. Try again." };
  }
}

export interface ResetPasswordActionResult extends ActionResult {
  tempPassword?: string;
}

export async function resetVendorPasswordAction(
  id: string
): Promise<ResetPasswordActionResult> {
  await requireRole("admin");
  if (!isSupabaseConfigured) return { ok: false, error: DEMO };
  try {
    const { tempPassword } = await resetVendorPassword(id);
    return { ok: true, tempPassword };
  } catch {
    return {
      ok: false,
      error: "Couldn't reset the password. Check the vendor has a login account.",
    };
  }
}

// ---------- categories ----------

function parseCategory(form: FormData): VendorCategoryInput {
  return {
    name: str(form, "name"),
    description: strOrNull(form, "description"),
    sortOrder: Math.trunc(num(form, "sortOrder")),
    enabled: bool(form, "enabled"),
  };
}

/** Create (empty id) or edit a vendor category. */
export async function saveCategoryAction(
  id: string,
  _prev: ActionResult,
  form: FormData
): Promise<ActionResult> {
  await requireRole("admin");
  if (!isSupabaseConfigured) return { ok: false, error: DEMO };

  const input = parseCategory(form);
  if (!input.name) return { ok: false, error: "Category name is required." };

  try {
    if (id) await updateCategory(id, input);
    else await createCategory(input);
  } catch {
    return { ok: false, error: "Couldn't save the category. The name may already exist." };
  }

  revalidatePath("/admin/vendors/categories");
  revalidatePath("/admin/vendors");
  revalidatePath("/", "layout");
  redirect("/admin/vendors/categories");
}

export async function setCategoryEnabledAction(id: string, enabled: boolean) {
  return mutate(() => setCategoryEnabled(id, enabled));
}

export async function deleteCategoryAction(id: string) {
  return mutate(() => deleteCategory(id));
}

/**
 * Add a category from inside the registration wizard, without leaving it.
 * Returns the created name so the wizard can select it immediately.
 */
export async function createCategoryInlineAction(
  name: string
): Promise<{ ok: boolean; name?: string; error?: string }> {
  await requireRole("admin");
  if (!isSupabaseConfigured) return { ok: false, error: DEMO };
  const clean = name.trim();
  if (!clean) return { ok: false, error: "Category name is required." };
  try {
    await createCategory({
      name: clean,
      description: null,
      sortOrder: 100,
      enabled: true,
    });
  } catch {
    return { ok: false, error: "Couldn't add the category. It may already exist." };
  }
  revalidatePath("/admin/vendors");
  revalidatePath("/admin/vendors/categories");
  return { ok: true, name: clean };
}

// ---------- registration wizard ----------

export interface SaveDraftResult extends ActionResult {
  id?: string;
}

/** Persist wizard progress (password stripped in the data layer). */
export async function saveDraftAction(
  id: string | null,
  data: VendorDraftData,
  step: number
): Promise<SaveDraftResult> {
  await requireRole("admin");
  if (!isSupabaseConfigured) return { ok: false, error: DEMO };
  try {
    const draftId = await saveDraft(id, data, step);
    return { ok: true, id: draftId };
  } catch {
    return { ok: false, error: "Couldn't save the draft." };
  }
}

export async function deleteDraftAction(id: string): Promise<ActionResult> {
  await requireRole("admin");
  if (!isSupabaseConfigured) return { ok: false, error: DEMO };
  try {
    await deleteDraft(id);
    return { ok: true };
  } catch {
    return { ok: false, error: "Couldn't discard the draft." };
  }
}

function validateFullDraft(d: VendorDraftData): string | null {
  if (!d.shopName?.trim()) return "Shop name is required.";
  if (!d.ownerName?.trim()) return "Owner name is required.";
  if (!d.mobile?.trim()) return "Mobile number is required.";
  if (!d.email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email))
    return "A valid email address is required.";
  if (d.password && d.password.length < 8)
    return "Password must be at least 8 characters.";
  if (!d.category?.trim()) return "Select a vendor category.";
  if (!d.address?.trim()) return "Shop address is required.";
  const hasUpi = Boolean(d.upiId?.trim());
  const hasBank = Boolean(d.bankAccountNumber?.trim() && d.bankIfsc?.trim());
  if (!hasUpi && !hasBank)
    return "Add a UPI ID or bank account (number + IFSC) for payouts.";
  if (!d.tcAccepted) return "Accept the terms & conditions to continue.";
  return null;
}

export interface CreateVendorActionResult extends ActionResult {
  vendorId?: string;
  password?: string;
}

/**
 * Final wizard step: create the real vendor account. Re-gated with
 * requireRole("admin"); the operator's id is the T&C acceptor on the record.
 */
export async function createVendorAccountAction(
  data: VendorDraftData,
  draftId?: string
): Promise<CreateVendorActionResult> {
  const profile = await requireRole("admin");
  if (!isSupabaseConfigured) return { ok: false, error: DEMO };

  const problem = validateFullDraft(data);
  if (problem) return { ok: false, error: problem };

  try {
    const { restaurantId, password } = await createVendorAccount(data, profile.id);
    if (draftId) await deleteDraft(draftId).catch(() => {});
    revalidatePath("/admin/vendors");
    revalidatePath("/", "layout");
    return { ok: true, vendorId: restaurantId, password };
  } catch (err) {
    if (err instanceof EmailTakenError) {
      return {
        ok: false,
        error: "An account with this email already exists. Use a different email.",
      };
    }
    return { ok: false, error: "Couldn't create the vendor. Try again." };
  }
}
