import "server-only";
import { createClient } from "@/lib/supabase/server";

/**
 * Per-category picture overrides (migration 0037).
 *
 * Reads ride the public-read policy; writes ride the admin-write policy, so a
 * non-admin write is rejected by RLS and throws rather than being silently
 * dropped. Callers of the write path are admin-gated above this — AGENTS.md §3.
 */

export class CategoryImagesNotMigratedError extends Error {
  constructor() {
    super("category_images_not_migrated");
    this.name = "CategoryImagesNotMigratedError";
  }
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

/** id → image_url, for every category an operator has overridden. */
export async function getCategoryImageOverrides(): Promise<
  Map<string, string>
> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("category_images")
    .select("id, image_url");

  if (error) {
    if (isMissingTable(error)) throw new CategoryImagesNotMigratedError();
    throw error;
  }

  const map = new Map<string, string>();
  for (const row of data ?? []) {
    const url = (row.image_url as string | null)?.trim();
    if (url) map.set(row.id as string, url);
  }
  return map;
}

/**
 * Point a category at a different picture, or clear it back to the default.
 *
 * A blank URL deletes the row rather than storing an empty string: "no override"
 * is the absence of a row, and two ways to spell it is one way too many.
 *
 * The https check mirrors the 0037 constraint. The host is NOT checked here —
 * the CSP decides which hosts actually load, and duplicating that list in
 * application code is how the two drift apart. The admin form warns instead.
 */
export async function setCategoryImage(
  id: string,
  imageUrl: string | null
): Promise<void> {
  const supabase = await createClient();
  const url = imageUrl?.trim() ?? "";

  if (!url) {
    const { error } = await supabase
      .from("category_images")
      .delete()
      .eq("id", id);
    if (error) {
      if (isMissingTable(error)) throw new CategoryImagesNotMigratedError();
      throw error;
    }
    return;
  }

  if (!/^https:\/\//i.test(url)) throw new Error("insecure_url");

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("category_images").upsert(
    {
      id,
      image_url: url,
      updated_at: new Date().toISOString(),
      updated_by: user?.id ?? null,
    },
    { onConflict: "id" }
  );

  if (error) {
    if (isMissingTable(error)) throw new CategoryImagesNotMigratedError();
    throw error;
  }
}

/** Is migration 0037 applied? Drives the admin "run migration" notice. */
export async function categoryImagesReady(): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("category_images")
    .select("id", { head: true, count: "exact" })
    .limit(1);
  if (error) return !isMissingTable(error);
  return true;
}
