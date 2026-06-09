import { existsSync } from "node:fs";
import { NextResponse } from "next/server";

import { ensureCandidateManifest } from "@/lib/ops/media-collections/midnight-special/candidates";
import { ensureFilmstrip } from "@/lib/ops/media-lab/editorial/filmstrip";
import { performanceEditorCacheDir } from "@/lib/ops/media-lab/performance-editor/paths";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

function frameUrl(
  req: Request,
  episodeId: string,
  cacheKey: string,
  file: string,
): string {
  const url = new URL(req.url);
  url.pathname = "/api/ops/media-lab/performance/filmstrip/frame";
  url.search = new URLSearchParams({ episode: episodeId, cacheKey, file }).toString();
  return url.pathname + url.search;
}

export async function GET(req: Request) {
  if (!isOpsEnabled()) {
    return NextResponse.json({ error: "Ops disabled" }, { status: 403 });
  }

  const url = new URL(req.url);
  const episodeId = url.searchParams.get("episode")?.trim();
  const performanceId = url.searchParams.get("performance")?.trim() ?? "clip";
  const startSec = Number(url.searchParams.get("startSec"));
  const endSec = Number(url.searchParams.get("endSec"));

  if (
    !episodeId ||
    !Number.isFinite(startSec) ||
    !Number.isFinite(endSec) ||
    endSec <= startSec
  ) {
    return NextResponse.json({ error: "Invalid filmstrip params" }, { status: 400 });
  }

  try {
    const manifest = await ensureCandidateManifest(episodeId);
    const videoPath = manifest?.video_path;
    if (!videoPath || !existsSync(videoPath)) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    const outputDir = performanceEditorCacheDir(episodeId);
    const strip = await ensureFilmstrip(
      outputDir,
      videoPath,
      performanceId,
      startSec,
      endSec,
    );

    return NextResponse.json({
      ok: true,
      cacheKey: strip.cacheKey,
      intervalSec: strip.intervalSec,
      frames: strip.frames.map((f) => ({
        sec: f.sec,
        url: frameUrl(req, episodeId, strip.cacheKey, f.file),
      })),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Filmstrip failed";
    const hint = message.includes("ffmpeg")
      ? "Install ffmpeg: brew install ffmpeg"
      : undefined;
    return NextResponse.json({ error: message, hint }, { status: 500 });
  }
}
