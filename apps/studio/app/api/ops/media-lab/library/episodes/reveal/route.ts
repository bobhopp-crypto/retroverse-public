import { existsSync } from "node:fs";
import { dirname, resolve } from "path";

import { NextResponse } from "next/server";

import { openInFinder } from "@/lib/ops/media-lab/open-local";
import { loadEpisodeBrowserDetail } from "@/lib/ops/media-lab/performance-browser/episodes";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  if (process.env.RETROVERSE_OPS !== "1") {
    return NextResponse.json({ ok: false, error: "ops_disabled" }, { status: 403 });
  }

  let body: { episode_id?: string; collection?: string; path?: string };
  try {
    body = (await req.json()) as { episode_id?: string; collection?: string; path?: string };
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  let targetPath = body.path?.trim();

  if (!targetPath && body.episode_id) {
    const episode = await loadEpisodeBrowserDetail(
      body.episode_id.trim(),
      body.collection ?? "midnight_special",
    );
    if (!episode?.video_path) {
      return NextResponse.json({ ok: false, error: "video_not_found" }, { status: 404 });
    }
    targetPath = episode.video_path;
  }

  if (!targetPath) {
    return NextResponse.json({ ok: false, error: "path_required" }, { status: 400 });
  }

  const resolved = resolve(targetPath);
  if (!existsSync(resolved)) {
    return NextResponse.json({ ok: false, error: "path_missing" }, { status: 404 });
  }

  const revealTarget = resolved.endsWith(".mp4") || resolved.endsWith(".mkv")
    ? dirname(resolved)
    : resolved;

  const result = await openInFinder(revealTarget);
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true, path: revealTarget });
}
