import { NextResponse } from "next/server";

import { listEpisodeBrowserRows } from "@/lib/ops/media-lab/performance-browser/episodes";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  if (process.env.RETROVERSE_OPS !== "1") {
    return NextResponse.json({ ok: false, error: "ops_disabled" }, { status: 403 });
  }

  const url = new URL(req.url);
  const collection = url.searchParams.get("collection") ?? "midnight_special";

  const episodes = await listEpisodeBrowserRows(collection);
  return NextResponse.json({ ok: true, episodes, total: episodes.length });
}
