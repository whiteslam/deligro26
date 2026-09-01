import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { uploadAlertSound } from "@/lib/data-access/alert-sounds";

/**
 * POST /api/admin/alert-sounds  multipart/form-data { file } → { ok, url, name }
 *
 * Uploads a custom "new order" alert sound into the public alert-sounds
 * bucket. Same shape as /api/admin/vendors/logo: a route handler (not a
 * server action) so it isn't bound by the 1 MB action body limit, and
 * admin-gated before anything touches the service-role client.
 */
export async function POST(request: Request) {
  await requireRole("admin");
  if (!isSupabaseConfigured) {
    return NextResponse.json({ error: "backend_not_configured" }, { status: 503 });
  }

  let file: FormDataEntryValue | null;
  try {
    file = (await request.formData()).get("file");
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  try {
    const { url, name } = await uploadAlertSound(file);
    return NextResponse.json({ ok: true, url, name });
  } catch (err) {
    const message = err instanceof Error ? err.message : "server_error";
    if (message === "invalid_type" || message === "too_large") {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
