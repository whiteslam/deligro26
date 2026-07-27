import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { updateKitchenOrderStatus } from "@/lib/data-access/vendor-orders";

const ALLOWED = new Set(["kitchen", "ready", "cancelled"]);

/** PATCH /api/orders/:id/status — restaurant kitchen transitions only. */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!isSupabaseConfigured) {
    return NextResponse.json(
      { error: "backend_not_configured" },
      { status: 503 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "restaurant") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  let body: { status?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  if (!body.status || !ALLOWED.has(body.status)) {
    return NextResponse.json({ error: "invalid_status" }, { status: 400 });
  }

  try {
    const ok = await updateKitchenOrderStatus(
      id,
      body.status as "kitchen" | "ready" | "cancelled"
    );
    if (!ok) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "server_error";
    if (message === "forbidden") {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    if (message === "invalid_transition") {
      return NextResponse.json(
        { error: "invalid_transition" },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
