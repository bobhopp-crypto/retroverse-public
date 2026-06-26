import { NextResponse } from "next/server";

import { loadBrowserPlusMatchPanel } from "@/lib/ops/browser-plus/browser-plus-artist-match";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isOpsEnabled()) {
    return NextResponse.json({ ok: false, error: "ops_disabled" }, { status: 403 });
  }

  const url = new URL(request.url);
  const artist = url.searchParams.get("artist")?.trim() ?? "";
  const title = url.searchParams.get("title")?.trim() ?? "";

  if (!artist) {
    return NextResponse.json({ ok: false, error: "artist required" }, { status: 400 });
  }

  try {
    const panel = await loadBrowserPlusMatchPanel(artist, title);
    return NextResponse.json({ ok: true, ...panel });
  } catch (err) {
    console.error("[ops/browser-plus/match GET]", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Match lookup failed" },
      { status: 500 },
    );
  }
}
