import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { uploadVendorLogo } from "@/lib/data-access/vendor-logo";

/**
 * POST /api/admin/vendors/logo  multipart/form-data { file } → { ok, url }
 *
 * Uploads a shop logo for the registration wizard into the public vendor-logos
 * bucket and returns its public URL, which the wizard stores on the draft. A
 * route handler (not a server action) so it isn't bound by the 1 MB action body
 * limit. Admin-gated.
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
    const url = await uploadVendorLogo(file);
    return NextResponse.json({ ok: true, url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "server_error";
    if (message === "invalid_type" || message === "too_large") {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
