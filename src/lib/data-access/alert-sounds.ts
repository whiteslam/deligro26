import "server-only";
import { randomUUID } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertRealType } from "@/lib/utils/file-signature";

/**
 * Custom "new order" alert sound upload — one per role (vendor, rider),
 * platform-wide. Mirrors `vendor-logo.ts`: rides the service-role client
 * into a public bucket (the calling route is admin-gated), verifies the
 * declared MIME type against the actual bytes before anything reaches a
 * world-readable URL.
 */

const BUCKET = "alert-sounds";
const MAX_BYTES = 3 * 1024 * 1024;
const TYPES: Record<string, string> = {
  "audio/mpeg": "mp3",
  "audio/wav": "wav",
  "audio/ogg": "ogg",
};

export async function uploadAlertSound(
  file: File
): Promise<{ url: string; name: string }> {
  const ext = TYPES[file.type];
  if (!ext) throw new Error("invalid_type");
  if (file.size === 0) throw new Error("invalid_type");
  if (file.size > MAX_BYTES) throw new Error("too_large");

  await assertRealType(file, ["audio/mpeg", "audio/wav", "audio/ogg"]);

  const admin = createAdminClient();
  const path = `${randomUUID()}.${ext}`;
  const { error } = await admin.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw error;

  const {
    data: { publicUrl },
  } = admin.storage.from(BUCKET).getPublicUrl(path);

  return { url: publicUrl, name: file.name };
}
