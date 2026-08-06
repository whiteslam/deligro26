import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { recordBannerEvent } from "@/lib/data-access/banners";
import { clientIp, rateLimit } from "@/lib/rate-limit";

/**
 * POST /api/banners/track — log a banner impression or click.
 *   { bannerId, kind: "impression" | "click", placement? }
 *
 * Fired via `navigator.sendBeacon` from the carousel, so it must always answer
 * fast and never error the caller: tracking is best-effort telemetry, not a
 * user action. In demo mode (no backend) it's a no-op that still returns 200 so
 * the beacon isn't retried. RLS gates the insert to genuinely live campaigns.
 */
export async function POST(request: Request) {
  // 202-style ack even without a backend — nothing to persist, nothing to fail.
  if (!isSupabaseConfigured) {
    return NextResponse.json({ ok: true, recorded: false });
  }

  // This is now the ONLY way to reach bump_banner_stat (0022 revoked the RPC
  // from anon), which makes it the single choke point for counter inflation.
  // Unauthenticated by necessity — guests see banners — so key on the caller.
  // A quiet 200 rather than a 429: the client is a sendBeacon that cannot act
  // on an error, and telemetry is not worth surfacing a failure for.
  const limit = await rateLimit(`banner-track:${clientIp(request)}`, 120, 60_000);
  if (!limit.ok) {
    return NextResponse.json({ ok: true, recorded: false });
  }

  let bannerId: string | undefined;
  let kind: string | undefined;
  let placement: string | undefined;
  try {
    const body = (await request.json()) as {
      bannerId?: string;
      kind?: string;
      placement?: string;
    };
    bannerId = body.bannerId?.trim();
    kind = body.kind;
    placement = body.placement;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  if (!bannerId || (kind !== "impression" && kind !== "click")) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  // recordBannerEvent swallows its own failures; keep the handler resilient too.
  try {
    await recordBannerEvent(bannerId, kind, { placement });
  } catch {
    // ignore — an unlogged impression is not worth a client-visible error
  }
  return NextResponse.json({ ok: true, recorded: true });
}
