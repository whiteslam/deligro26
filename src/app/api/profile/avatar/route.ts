import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { removeAvatar, uploadAvatar } from "@/lib/data-access/profile";

/**
 * Profile photo for the signed-in user.
 *   POST   multipart/form-data { file } → upload or replace
 *   DELETE                              → remove
 *
 * The storage path is derived from the session's user id inside the data-access
 * layer, never from the request — the client cannot aim the write at another
 * user's folder, and the bucket's RLS policies enforce the same thing again.
 */

function fail(err: unknown) {
  const message = err instanceof Error ? err.message : "server_error";
  if (message === "unauthorized") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (message === "invalid_type" || message === "too_large") {
    return NextResponse.json({ error: message }, { status: 400 });
  }
  return NextResponse.json({ error: "server_error" }, { status: 500 });
}

export async function POST(request: Request) {
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
    const avatarUrl = await uploadAvatar(file);
    return NextResponse.json({ ok: true, avatarUrl });
  } catch (err) {
    return fail(err);
  }
}

export async function DELETE() {
  if (!isSupabaseConfigured) {
    return NextResponse.json({ error: "backend_not_configured" }, { status: 503 });
  }

  try {
    await removeAvatar();
    return NextResponse.json({ ok: true });
  } catch (err) {
    return fail(err);
  }
}
