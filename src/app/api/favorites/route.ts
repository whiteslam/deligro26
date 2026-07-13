import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { addFavorite, removeFavorite } from "@/lib/data-access/favorites";

/**
 * The heart on a restaurant.
 *   POST   { slug } → save
 *   DELETE { slug } → unsave
 * The owner is the session, never the body — RLS enforces the same.
 */

async function slugFrom(request: Request): Promise<string | null> {
  try {
    const body = (await request.json()) as { slug?: string };
    const slug = body.slug?.trim();
    return slug ? slug : null;
  } catch {
    return null;
  }
}

function fail(err: unknown) {
  const message = err instanceof Error ? err.message : "server_error";
  if (message === "unauthorized") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (message === "not_found") {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return NextResponse.json({ error: "server_error" }, { status: 500 });
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured) {
    return NextResponse.json({ error: "backend_not_configured" }, { status: 503 });
  }
  const slug = await slugFrom(request);
  if (!slug) return NextResponse.json({ error: "invalid_body" }, { status: 400 });

  try {
    await addFavorite(slug);
    return NextResponse.json({ ok: true, favorite: true });
  } catch (err) {
    return fail(err);
  }
}

export async function DELETE(request: Request) {
  if (!isSupabaseConfigured) {
    return NextResponse.json({ error: "backend_not_configured" }, { status: 503 });
  }
  const slug = await slugFrom(request);
  if (!slug) return NextResponse.json({ error: "invalid_body" }, { status: 400 });

  try {
    await removeFavorite(slug);
    return NextResponse.json({ ok: true, favorite: false });
  } catch (err) {
    return fail(err);
  }
}
