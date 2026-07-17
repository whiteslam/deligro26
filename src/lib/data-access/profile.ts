import "server-only";
import { createClient } from "@/lib/supabase/server";
import { countFavorites } from "@/lib/data-access/favorites";
import { isDeveloperPhone } from "@/lib/developers";

/**
 * Summary shown on the customer Profile tab. Everything here is the signed-in
 * user's own data — RLS scopes the order/address counts to them, so no explicit
 * `where user = me` is needed. Returns null when signed out.
 */
export interface ProfileSummary {
  name: string;
  phone: string | null;
  initials: string;
  avatarUrl: string | null; // null → the UI falls back to initials
  memberSince: string; // year, e.g. "2024"
  orders: number;
  addresses: number;
  favorites: number;
  isDeveloper: boolean; // one of ours — drives the Developer badge + golden ring
}

export interface ProfileUpdateInput {
  fullName?: string;
  phone?: string;
}

function initialsFrom(name: string, phone: string | null): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  if (words.length === 1 && /[a-z]/i.test(words[0])) return words[0].slice(0, 2).toUpperCase();
  const digits = (phone ?? "").replace(/\D/g, "");
  return digits.slice(-2) || "🙂";
}

export async function getProfileSummary(): Promise<ProfileSummary | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, phone, avatar_url, created_at")
    .eq("id", user.id)
    .maybeSingle();

  const [{ count: orderCount }, { count: addressCount }, favorites] = await Promise.all([
    supabase.from("orders").select("id", { count: "exact", head: true }),
    supabase.from("addresses").select("id", { count: "exact", head: true }),
    countFavorites(),
  ]);

  const name = profile?.full_name?.trim() || "Deligro Customer";
  const phone = profile?.phone ?? user.phone ?? null;
  const memberSince = profile?.created_at
    ? new Date(profile.created_at as string).getFullYear().toString()
    : new Date(user.created_at).getFullYear().toString();

  return {
    name,
    phone,
    initials: initialsFrom(name, phone),
    avatarUrl: (profile?.avatar_url as string | null) ?? null,
    memberSince,
    orders: orderCount ?? 0,
    addresses: addressCount ?? 0,
    favorites,
    isDeveloper: isDeveloperPhone(phone),
  };
}

export async function updateProfile(input: ProfileUpdateInput): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("unauthorized");

  const patch: Record<string, string> = {};
  if (input.fullName !== undefined) {
    const name = input.fullName.trim();
    if (name.length < 2) throw new Error("invalid_name");
    patch.full_name = name.slice(0, 80);
  }
  if (input.phone !== undefined) {
    const phone = input.phone.trim();
    if (phone.length < 10) throw new Error("invalid_phone");
    patch.phone = phone.slice(0, 20);
  }

  if (!Object.keys(patch).length) return true;

  const { error } = await supabase
    .from("profiles")
    .update(patch)
    .eq("id", user.id);
  if (error) throw error;
  return true;
}

const AVATAR_BUCKET = "avatars";
const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const AVATAR_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/**
 * Everything the signed-in user has in the avatars bucket. The folder is named
 * after their uid, which is also what the storage policies key off — so listing
 * (and clearing) it can only ever touch their own files.
 */
async function listOwnAvatars(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<string[]> {
  const { data } = await supabase.storage.from(AVATAR_BUCKET).list(userId);
  return (data ?? []).map((f) => `${userId}/${f.name}`);
}

/**
 * Replace the user's profile photo. The old file is removed first: the new one
 * may have a different extension, so upsert alone would strand the previous
 * image in the bucket. The saved URL carries a `?v=` stamp because the public
 * URL is stable and the CDN would otherwise keep serving the old photo.
 */
export async function uploadAvatar(file: File): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("unauthorized");

  const ext = AVATAR_TYPES[file.type];
  if (!ext) throw new Error("invalid_type");
  if (file.size > MAX_AVATAR_BYTES) throw new Error("too_large");
  if (file.size === 0) throw new Error("invalid_type");

  const stale = await listOwnAvatars(supabase, user.id);
  if (stale.length) {
    await supabase.storage.from(AVATAR_BUCKET).remove(stale);
  }

  const path = `${user.id}/avatar.${ext}`;
  const { error: upErr } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: true });
  if (upErr) throw upErr;

  const {
    data: { publicUrl },
  } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
  const url = `${publicUrl}?v=${Date.now()}`;

  const { error } = await supabase
    .from("profiles")
    .update({ avatar_url: url })
    .eq("id", user.id);
  if (error) throw error;

  return url;
}

/** Drop the profile photo — file and column both, so no orphan is left behind. */
export async function removeAvatar(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("unauthorized");

  const files = await listOwnAvatars(supabase, user.id);
  if (files.length) {
    const { error: rmErr } = await supabase.storage.from(AVATAR_BUCKET).remove(files);
    if (rmErr) throw rmErr;
  }

  const { error } = await supabase
    .from("profiles")
    .update({ avatar_url: null })
    .eq("id", user.id);
  if (error) throw error;

  return true;
}
