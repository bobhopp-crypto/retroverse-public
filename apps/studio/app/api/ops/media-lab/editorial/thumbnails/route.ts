import { existsSync } from "node:fs";
import { readFile } from "fs/promises";
import { join } from "path";
import { NextResponse } from "next/server";

import {
  ensureAllChapterThumbnails,
  type ChapterThumbManifest,
} from "@/lib/ops/media-lab/editorial/chapter-thumbnails";
import {
  normalizeChapterTimeline,
  readChaptersCsv,
  withEditorialIds,
} from "@/lib/ops/media-lab/chapters-csv";
import { resolveJobOutputDir } from "@/lib/ops/media-lab/editorial/job-path";
import type { MediaLabJobMeta } from "@/lib/ops/media-lab/job-meta";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

function frameUrl(
  req: Request,
  year: number,
  jobSlug: string,
  cacheKey: string,
  file: string,
): string {
  const url = new URL(req.url);
  url.pathname = "/api/ops/media-lab/editorial/thumbnails/frame";
  url.search = new URLSearchParams({
    year: String(year),
    jobSlug,
    cacheKey,
    file,
  }).toString();
  return url.pathname + url.search;
}

function manifestToResponse(
  req: Request,
  year: number,
  jobSlug: string,
  manifest: ChapterThumbManifest,
) {
  const byRole = Object.fromEntries(
    manifest.frames.map((f) => [
      f.role,
      { sec: f.sec, url: frameUrl(req, year, jobSlug, manifest.cacheKey, f.file) },
    ]),
  ) as Record<string, { sec: number; url: string }>;

  return {
    chapterId: manifest.chapterId,
    cacheKey: manifest.cacheKey,
    first: byRole.first,
    mid: byRole.mid,
    last: byRole.last,
  };
}

export async function POST(req: Request) {
  if (!isOpsEnabled()) {
    return NextResponse.json({ error: "Ops disabled" }, { status: 403 });
  }

  let body: {
    year?: number;
    jobSlug?: string;
    chapters?: { id?: string; startSec?: number; endSec?: number }[];
  };

  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const year = body.year;
  const jobSlug = body.jobSlug?.trim();
  if (!year || year < 1900 || year >= 2100 || !jobSlug) {
    return NextResponse.json({ error: "year and jobSlug required" }, { status: 400 });
  }

  try {
    const outputDir = resolveJobOutputDir(year, jobSlug);
    const job = JSON.parse(
      await readFile(join(outputDir, "job.json"), "utf8"),
    ) as MediaLabJobMeta;

    const videoPath = job.sourceVideo?.trim();
    if (!videoPath || !existsSync(videoPath)) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    const videoEnd = job.durationSeconds ?? 0;
    let chapters = withEditorialIds(await readChaptersCsv(outputDir));
    chapters = normalizeChapterTimeline(chapters, videoEnd);

    if (Array.isArray(body.chapters) && body.chapters.length > 0) {
      const patch = new Map(
        body.chapters.map((ch, i) => [
          ch.id?.trim() || `ch-${i}`,
          {
            id: ch.id?.trim() || `ch-${i}`,
            startSec: Number(ch.startSec) || 0,
            endSec: Number(ch.endSec) || 0,
          },
        ]),
      );
      chapters = chapters.map((ch) => {
        const hit = patch.get(ch.id);
        return hit ? { ...ch, startSec: hit.startSec, endSec: hit.endSec } : ch;
      });
    }

    const manifests = await ensureAllChapterThumbnails(outputDir, videoPath, chapters);
    const thumbs: Record<string, ReturnType<typeof manifestToResponse>> = {};
    for (const m of manifests) {
      thumbs[m.chapterId] = manifestToResponse(req, year, jobSlug, m);
    }

    return NextResponse.json({
      ok: true,
      total: manifests.length,
      thumbs,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Thumbnail batch failed";
    const hint = message.includes("ffmpeg")
      ? "Install ffmpeg: brew install ffmpeg"
      : undefined;
    return NextResponse.json({ error: message, hint }, { status: 500 });
  }
}
