import "server-only";
import { randomBytes } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { VENDOR_STATUSES, type VendorStatus } from "@/lib/vendor-status";

// Re-exported so existing importers keep working; the canonical definition lives
// in the client-safe @/lib/vendor-status module.
export { VENDOR_STATUSES };
export type { VendorStatus };

/**
 * Admin-facing vendor management, over the `restaurants` table (+ owner
 * `profiles`). A "vendor" is a restaurant owned by a role='restaurant' profile;
 * these functions are the admin CRUD/oversight surface for them.
 *
 * Reads and ordinary writes ride the `is_admin()` RLS policies through the
 * cookie-bound `createClient()` — the admin layout has already gated the caller,
 * and RLS is the second lock. Only the operations RLS can't express — creating
 * an auth user's password, hard-deleting an account — reach for the service-role
 * `createAdminClient()`, and the calling server action re-gates with
 * requireRole("admin") first.
 *
 * Everything here needs migration 0017. Until it's applied, selecting the new
 * columns is a hard PostgREST error, so reads degrade to empty and the list page
 * shows a "preview mode" banner (mirrors the banners rollout).
 */

export interface VendorCounts {
  total: number;
  active: number;
  inactive: number;
  pending: number;
  suspended: number;
  categories: number;
}

export interface VendorListItem {
  id: string;
  slug: string;
  name: string;
  ownerName: string | null;
  ownerMobile: string | null;
  category: string | null;
  address: string | null;
  commissionPct: number;
  status: VendorStatus;
  isOpen: boolean;
  imageUrl: string | null;
  accentTint: string | null;
  createdAt: string;
}

export interface VendorDetail extends VendorListItem {
  ownerId: string;
  tagline: string | null;
  description: string | null;
  ownerAltMobile: string | null;
  ownerEmail: string | null;
  cuisines: string[];
  minOrder: number;
  deliveryAvailable: boolean;
  selfPickup: boolean;
  openingTime: string | null;
  closingTime: string | null;
  weeklyOff: string[];
  landmark: string | null;
  pincode: string | null;
  lat: number | null;
  lng: number | null;
  upiId: string | null;
  bankAccountName: string | null;
  bankAccountNumber: string | null;
  bankIfsc: string | null;
  bankName: string | null;
  fssaiNumber: string | null;
  gstNumber: string | null;
  panNumber: string | null;
  tcAcceptedAt: string | null;
  tcVersion: string | null;
  menuItemCount: number;
}

/** The admin-editable business fields (not slug, not status, not the account). */
export interface VendorInput {
  name: string;
  category: string | null;
  ownerName: string | null;
  ownerMobile: string | null;
  ownerAltMobile: string | null;
  ownerEmail: string | null;
  tagline: string | null;
  description: string | null;
  commissionPct: number;
  minOrder: number;
  deliveryAvailable: boolean;
  selfPickup: boolean;
  openingTime: string | null;
  closingTime: string | null;
  weeklyOff: string[];
  address: string | null;
  landmark: string | null;
  pincode: string | null;
  upiId: string | null;
  bankAccountName: string | null;
  bankAccountNumber: string | null;
  bankIfsc: string | null;
  bankName: string | null;
  fssaiNumber: string | null;
  gstNumber: string | null;
  panNumber: string | null;
}

export type VendorSort = "recent" | "oldest" | "name" | "status";

export interface ListVendorsOptions {
  q?: string;
  status?: VendorStatus | "all";
  category?: string;
  sort?: VendorSort;
  page?: number;
  pageSize?: number;
}

export interface ListVendorsResult {
  items: VendorListItem[];
  total: number;
  page: number;
  pageSize: number;
}

const LIST_SELECT = `
  id, slug, name, owner_name, owner_mobile, category, address,
  commission_pct, status, is_open, image_url, accent_tint, created_at
`;

const DETAIL_SELECT = `
  id, slug, name, owner_id, tagline, description,
  owner_name, owner_mobile, owner_alt_mobile, owner_email, category, cuisines,
  commission_pct, min_order, delivery_available, self_pickup,
  opening_time, closing_time, weekly_off,
  address, landmark, pincode, lat, lng,
  upi_id, bank_account_name, bank_account_number, bank_ifsc, bank_name,
  fssai_number, gst_number, pan_number,
  status, is_open, image_url, accent_tint,
  tc_accepted_at, tc_version, created_at
`;

interface VendorRow {
  id: string;
  slug: string;
  name: string;
  owner_id?: string;
  tagline?: string | null;
  description?: string | null;
  owner_name: string | null;
  owner_mobile: string | null;
  owner_alt_mobile?: string | null;
  owner_email?: string | null;
  category: string | null;
  cuisines?: string[] | null;
  commission_pct: number | null;
  min_order?: number | null;
  delivery_available?: boolean | null;
  self_pickup?: boolean | null;
  opening_time?: string | null;
  closing_time?: string | null;
  weekly_off?: string[] | null;
  address: string | null;
  landmark?: string | null;
  pincode?: string | null;
  lat?: number | null;
  lng?: number | null;
  upi_id?: string | null;
  bank_account_name?: string | null;
  bank_account_number?: string | null;
  bank_ifsc?: string | null;
  bank_name?: string | null;
  fssai_number?: string | null;
  gst_number?: string | null;
  pan_number?: string | null;
  status: VendorStatus;
  is_open: boolean;
  image_url: string | null;
  accent_tint: string | null;
  tc_accepted_at?: string | null;
  tc_version?: string | null;
  created_at: string;
}

/** Table missing (42P01/PGRST205) or a 0017 column missing (42703). */
function isMissingSchema(
  error: { code?: string; message?: string } | null
): boolean {
  if (!error) return false;
  const code = error.code ?? "";
  const msg = (error.message ?? "").toLowerCase();
  return (
    code === "42P01" ||
    code === "42703" ||
    code === "PGRST205" ||
    code === "PGRST204" ||
    msg.includes("schema cache") ||
    msg.includes("does not exist")
  );
}

function mapListItem(row: VendorRow): VendorListItem {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    ownerName: row.owner_name,
    ownerMobile: row.owner_mobile,
    category: row.category,
    address: row.address,
    commissionPct: Number(row.commission_pct ?? 0),
    status: row.status,
    isOpen: row.is_open,
    imageUrl: row.image_url,
    accentTint: row.accent_tint,
    createdAt: row.created_at,
  };
}

function mapDetail(row: VendorRow, menuItemCount: number): VendorDetail {
  return {
    ...mapListItem(row),
    ownerId: row.owner_id ?? "",
    tagline: row.tagline ?? null,
    description: row.description ?? null,
    ownerAltMobile: row.owner_alt_mobile ?? null,
    ownerEmail: row.owner_email ?? null,
    cuisines: (row.cuisines ?? []) as string[],
    minOrder: Number(row.min_order ?? 0),
    deliveryAvailable: row.delivery_available ?? true,
    selfPickup: row.self_pickup ?? false,
    openingTime: row.opening_time ?? null,
    closingTime: row.closing_time ?? null,
    weeklyOff: (row.weekly_off ?? []) as string[],
    landmark: row.landmark ?? null,
    pincode: row.pincode ?? null,
    lat: row.lat ?? null,
    lng: row.lng ?? null,
    upiId: row.upi_id ?? null,
    bankAccountName: row.bank_account_name ?? null,
    bankAccountNumber: row.bank_account_number ?? null,
    bankIfsc: row.bank_ifsc ?? null,
    bankName: row.bank_name ?? null,
    fssaiNumber: row.fssai_number ?? null,
    gstNumber: row.gst_number ?? null,
    panNumber: row.pan_number ?? null,
    tcAcceptedAt: row.tc_accepted_at ?? null,
    tcVersion: row.tc_version ?? null,
    menuItemCount,
  };
}

/**
 * Cheap probe: has 0017 been applied? Selecting the `status` column head-only
 * costs nothing; a missing-column error means the migration hasn't run.
 */
export async function vendorsBackendReady(): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("restaurants")
    .select("id, status", { head: true, count: "exact" })
    .limit(1);
  if (error) return !isMissingSchema(error);
  return true;
}

/** A `.or()`-safe ilike needle — strip the chars that break PostgREST filters. */
function ilikeNeedle(q: string): string {
  const cleaned = q.replace(/[,()%*\\]/g, " ").trim();
  return `%${cleaned}%`;
}

const SORT_MAP: Record<VendorSort, { column: string; ascending: boolean }> = {
  recent: { column: "created_at", ascending: false },
  oldest: { column: "created_at", ascending: true },
  name: { column: "name", ascending: true },
  status: { column: "status", ascending: true },
};

export async function listVendors(
  opts: ListVendorsOptions = {}
): Promise<ListVendorsResult> {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, opts.pageSize ?? 20));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const supabase = await createClient();
  let query = supabase
    .from("restaurants")
    .select(LIST_SELECT, { count: "exact" });

  if (opts.status && opts.status !== "all") {
    query = query.eq("status", opts.status);
  }
  if (opts.category) {
    query = query.eq("category", opts.category);
  }
  if (opts.q && opts.q.trim()) {
    const needle = ilikeNeedle(opts.q);
    query = query.or(
      `name.ilike.${needle},owner_name.ilike.${needle},owner_mobile.ilike.${needle},slug.ilike.${needle}`
    );
  }

  const sort = SORT_MAP[opts.sort ?? "recent"];
  const { data, error, count } = await query
    .order(sort.column, { ascending: sort.ascending })
    .order("name", { ascending: true })
    .range(from, to);

  if (error) {
    // Pre-migration or empty: don't crash the page.
    if (isMissingSchema(error)) return { items: [], total: 0, page, pageSize };
    throw error;
  }

  return {
    items: (data as VendorRow[] | null ?? []).map(mapListItem),
    total: count ?? 0,
    page,
    pageSize,
  };
}

/** The six dashboard cards. A failing sub-count reads as 0, never blank. */
export async function getVendorCounts(): Promise<VendorCounts> {
  const supabase = await createClient();

  const countOf = async (
    build: () => PromiseLike<{ count: number | null; error: unknown }>
  ): Promise<number> => {
    try {
      const { count, error } = await build();
      return error ? 0 : count ?? 0;
    } catch {
      return 0;
    }
  };

  const byStatus = (status: VendorStatus) =>
    countOf(() =>
      supabase
        .from("restaurants")
        .select("id", { count: "exact", head: true })
        .eq("status", status)
    );

  const [total, active, inactive, pending, suspended, categories] =
    await Promise.all([
      countOf(() =>
        supabase.from("restaurants").select("id", { count: "exact", head: true })
      ),
      byStatus("active"),
      byStatus("inactive"),
      byStatus("pending"),
      byStatus("suspended"),
      countOf(() =>
        supabase
          .from("vendor_categories")
          .select("id", { count: "exact", head: true })
      ),
    ]);

  return { total, active, inactive, pending, suspended, categories };
}

export async function getVendorDetail(id: string): Promise<VendorDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("restaurants")
    .select(DETAIL_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    if (isMissingSchema(error)) return null;
    throw error;
  }
  if (!data) return null;

  const { count } = await supabase
    .from("menu_items")
    .select("id", { count: "exact", head: true })
    .eq("restaurant_id", id);

  return mapDetail(data as VendorRow, count ?? 0);
}

/** Input → DB columns. `updated_at` isn't on restaurants, so it isn't written. */
function toRow(input: VendorInput) {
  return {
    name: input.name,
    category: input.category,
    owner_name: input.ownerName,
    owner_mobile: input.ownerMobile,
    owner_alt_mobile: input.ownerAltMobile,
    owner_email: input.ownerEmail,
    tagline: input.tagline,
    description: input.description,
    commission_pct: input.commissionPct,
    min_order: input.minOrder,
    delivery_available: input.deliveryAvailable,
    self_pickup: input.selfPickup,
    opening_time: input.openingTime,
    closing_time: input.closingTime,
    weekly_off: input.weeklyOff,
    address: input.address,
    landmark: input.landmark,
    pincode: input.pincode,
    upi_id: input.upiId,
    bank_account_name: input.bankAccountName,
    bank_account_number: input.bankAccountNumber,
    bank_ifsc: input.bankIfsc,
    bank_name: input.bankName,
    fssai_number: input.fssaiNumber,
    gst_number: input.gstNumber,
    pan_number: input.panNumber,
  };
}

export async function updateVendor(id: string, input: VendorInput): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("restaurants")
    .update(toRow(input))
    .eq("id", id);
  if (error) throw error;
}

/** Flip lifecycle status. The 0017 trigger keeps `approved` in step. */
export async function setVendorStatus(
  id: string,
  status: VendorStatus
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("restaurants")
    .update({ status })
    .eq("id", id);
  if (error) throw error;
}

export interface DeleteVendorResult {
  softDeleted: boolean;
}

/**
 * Delete a vendor. `orders.restaurant_id` is `on delete restrict`, so a vendor
 * that has ever taken an order can't be hard-deleted — we soft-delete it to
 * 'inactive' instead (its order history stays intact). Only an order-free vendor
 * is hard-removed: the restaurant row (menu cascades), and the owner's auth
 * account too when they own nothing else.
 */
export async function deleteVendor(id: string): Promise<DeleteVendorResult> {
  const supabase = await createClient();

  const { count: orderCount } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("restaurant_id", id);

  if ((orderCount ?? 0) > 0) {
    await setVendorStatus(id, "inactive");
    return { softDeleted: true };
  }

  const { data: owned } = await supabase
    .from("restaurants")
    .select("owner_id")
    .eq("id", id)
    .maybeSingle();
  const ownerId = (owned as { owner_id: string } | null)?.owner_id;

  // Service-role: the restaurant row + a possible auth-account cleanup.
  const admin = createAdminClient();
  const { error: delErr } = await admin.from("restaurants").delete().eq("id", id);
  if (delErr) throw delErr;

  if (ownerId) {
    const { count: remaining } = await admin
      .from("restaurants")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", ownerId);
    if ((remaining ?? 0) === 0) {
      // Owner has no other shop — remove the orphaned vendor login too.
      await admin.auth.admin.deleteUser(ownerId);
    }
  }

  return { softDeleted: false };
}

/** A short, readable one-time password for a manual hand-off to the vendor. */
function tempPassword(): string {
  return randomBytes(9).toString("base64url");
}

export interface ResetPasswordResult {
  tempPassword: string;
}

/**
 * Reset a vendor's login password to a fresh random one and return it once, for
 * the operator to relay. Service-role, because it acts on the auth user.
 */
export async function resetVendorPassword(
  id: string
): Promise<ResetPasswordResult> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("restaurants")
    .select("owner_id")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  const ownerId = (data as { owner_id: string } | null)?.owner_id;
  if (!ownerId) throw new Error("vendor_not_found");

  const password = tempPassword();
  const admin = createAdminClient();
  const { error: upErr } = await admin.auth.admin.updateUserById(ownerId, {
    password,
    email_confirm: true,
  });
  if (upErr) throw upErr;

  return { tempPassword: password };
}
