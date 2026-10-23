import { NextResponse } from "next/server";

/**
 * A refusal from one of the audited database functions, as the JSON the app
 * reads. The functions raise short codes (`forbidden`, `reason_required`, ...);
 * anything else is an unexpected failure and says nothing about the cause.
 */
export function answerFromRpc(message: string | null | undefined): Response {
  const m = message ?? "";
  if (/forbidden/.test(m)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (/reason_required/.test(m)) return NextResponse.json({ error: "reason_required" }, { status: 422 });
  if (/bad_threshold/.test(m)) return NextResponse.json({ error: "bad_threshold" }, { status: 400 });
  if (/bad_request/.test(m)) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  if (/already_resolved/.test(m)) return NextResponse.json({ error: "already_resolved" }, { status: 409 });
  if (/not_found/.test(m)) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (/client_action_id_conflict/.test(m)) return NextResponse.json({ error: "stale" }, { status: 409 });
  return NextResponse.json({ error: "action_failed" }, { status: 500 });
}
