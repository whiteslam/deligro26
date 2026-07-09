import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { listAddresses, createAddress } from "@/lib/data-access/addresses";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/** GET /api/addresses — the signed-in user's saved addresses. */
export async function GET() {
  if (!isSupabaseConfigured) return NextResponse.json({ addresses: [] });
  if (!(await requireUser())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    return NextResponse.json({ addresses: await listAddresses() });
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

/** POST /api/addresses — add an address. */
export async function POST(request: Request) {
  if (!isSupabaseConfigured) return NextResponse.json({ error: "backend_not_configured" }, { status: 503 });
  if (!(await requireUser())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: { label?: string; line?: string; lat?: number; lng?: number; isDefault?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  if (!body.line || body.line.trim().length < 6) {
    return NextResponse.json({ error: "invalid_address" }, { status: 400 });
  }

  try {
    const address = await createAddress({
      label: (body.label ?? "Home").trim(),
      line: body.line.trim(),
      lat: body.lat ?? null,
      lng: body.lng ?? null,
      isDefault: body.isDefault,
    });
    return NextResponse.json({ address });
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
