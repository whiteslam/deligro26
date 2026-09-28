import { NextResponse } from "next/server";
import { buildRoleManifest, isPortalRole } from "@/lib/pwa/role-manifest";

/** GET /manifests/vendor | rider | manager — public, contains no user data. */
export async function GET(_req: Request, ctx: { params: Promise<{ role: string }> }) {
  const { role } = await ctx.params;
  if (!isPortalRole(role)) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return new NextResponse(JSON.stringify(buildRoleManifest(role)), {
    headers: {
      "Content-Type": "application/manifest+json; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
