import "server-only";
import { randomUUID } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertRealType } from "@/lib/utils/file-signature";

/**
 * Shop-logo upload for the registration wizard. The admin uploads a logo before
 * the vendor account exists, so there is no owner uid to key a storage folder
 * on and the owner-scoped bucket policies don't apply — the upload rides the
 * service-role client (the calling route is already admin-gated) into the public
 * `vendor-logos` bucket, and the returned public URL is stored on the draft /
 * restaurant as `image_url`.
 */

const LOGO_BUCKET = "vendor-logos";
const MAX_LOGO_BYTES = 5 * 1024 * 1024;
const LOGO_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export async function uploadVendorLogo(file: File): Promise<string> {
  const ext = LOGO_TYPES[file.type];
  if (!ext) throw new Error("invalid_type");
  if (file.size === 0) throw new Error("invalid_type");
  if (file.size > MAX_LOGO_BYTES) throw new Error("too_large");

  // This rides the service-role client into a PUBLIC bucket, so the declared
  // MIME type is the only thing standing between an admin's file picker and a
  // world-readable URL. Verify the bytes.
  await assertRealType(file, ["image/jpeg", "image/png", "image/webp"]);

  const admin = createAdminClient();
  const path = `${randomUUID()}.${ext}`;
  const { error: upErr } = await admin.storage
    .from(LOGO_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (upErr) throw upErr;

  const {
    data: { publicUrl },
  } = admin.storage.from(LOGO_BUCKET).getPublicUrl(path);
  return publicUrl;
}
