import { NextResponse } from "next/server";

import { loadNowPlayingPackage } from "@/lib/broadcast/resolve-now-playing-package";

export const dynamic = "force-dynamic";

const RVTR_RE = /^RVTR\d{6}$/i;

/**
 * Broadcast's bridge into the existing song-package system: given the RVTR
 * a "now-playing" Rvba refers to, return the same package
 * `/retroverse-2/song/[rvtr]` would render at its package/vdj tiers — or
 * null when no package exists, so PresentationStage can fall back to the
 * plain placeholder.
 */
export async function GET(request: Request) {
  const rvtrParam = new URL(request.url).searchParams.get("rvtr")?.trim() ?? "";
  if (!RVTR_RE.test(rvtrParam)) {
    return NextResponse.json({ package: null }, { headers: { "cache-control": "no-store" } });
  }

  const pkg = await loadNowPlayingPackage(rvtrParam.toUpperCase());
  return NextResponse.json({ package: pkg }, { headers: { "cache-control": "no-store" } });
}
