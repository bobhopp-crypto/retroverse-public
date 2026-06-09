import { NextResponse } from "next/server";

import {
  listEpisodeBrowserRows,
  loadEpisodeBrowserDetail,
  searchEpisodeRows,
} from "@/lib/ops/media-lab/performance-browser/episodes";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  if (process.env.RETROVERSE_OPS !== "1") {
    return NextResponse.json({ ok: false, error: "ops_disabled" }, { status: 403 });
  }

  const url = new URL(req.url);
  const collection = url.searchParams.get("collection") ?? "midnight_special";
  const q = url.searchParams.get("q")?.trim() ?? "";
  const episodeId = url.searchParams.get("episode")?.trim();

  if (episodeId) {
    const episode = await loadEpisodeBrowserDetail(episodeId, collection);
    if (!episode) {
      return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, episode });
  }

  let episodes = await listEpisodeBrowserRows(collection);
  if (q) episodes = searchEpisodeRows(episodes, q);

  return NextResponse.json({ ok: true, episodes, total: episodes.length, q: q || undefined });
}
