import { existsSync } from "node:fs";
import { NextResponse } from "next/server";

import { ensureCandidateManifest } from "@/lib/ops/media-collections/midnight-special/candidates";
import { ensureChapterThumbnails } from "@/lib/ops/media-lab/editorial/chapter-thumbnails";
import { performanceEditorCacheDir } from "@/lib/ops/media-lab/performance-editor/paths";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

function thumbUrl(
  req: Request,
  episodeId: string,
  cacheKey: string,
  file: string,
): string {
  const url = new URL(req.url);
  url.pathname = "/api/ops/media-lab/performance/thumbnails/frame";
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
    return NextResponse.json({ error: "Invalid thumbnail params" }, { status: 400 });
  }

  try {
    const manifest = await ensureCandidateManifest(episodeId);
    const videoPath = manifest?.video_path;
    if (!videoPath || !existsSync(videoPath)) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    const outputDir = performanceEditorCacheDir(episodeId);
    const thumbs = await ensureChapterThumbnails(
      outputDir,
      videoPath,
      performanceId,
      startSec,
      endSec,
    );

    const byRole = Object.fromEntries(thumbs.frames.map((f) => [f.role, f]));
    return NextResponse.json({
      ok: true,
      chapterId: performanceId,
      first: {
        sec: byRole.first?.sec ?? startSec,
        url: thumbUrl(req, episodeId, thumbs.cacheKey, byRole.first?.file ?? "first.jpg"),
      },
      mid: {
        sec: byRole.mid?.sec ?? (startSec + endSec) / 2,
        url: thumbUrl(req, episodeId, thumbs.cacheKey, byRole.mid?.file ?? "mid.jpg"),
      },
      last: {
        sec: byRole.last?.sec ?? endSec,
        url: thumbUrl(req, episodeId, thumbs.cacheKey, byRole.last?.file ?? "last.jpg"),
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Thumbnails failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
