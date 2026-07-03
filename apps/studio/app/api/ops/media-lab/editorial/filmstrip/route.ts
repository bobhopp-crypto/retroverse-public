import { existsSync } from "node:fs";
import { readFile } from "fs/promises";
import { join } from "path";
import { NextResponse } from "next/server";

import {
  ensureFilmstrip,
  type FilmstripManifest,
} from "@/lib/ops/media-lab/editorial/filmstrip";
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
  url.pathname = "/api/ops/media-lab/editorial/filmstrip/frame";
  url.search = new URLSearchParams({
    year: String(year),
    jobSlug,
    cacheKey,
    file,
  }).toString();
  return url.pathname + url.search;
}

function manifestResponse(
  req: Request,
  year: number,
  jobSlug: string,
  manifest: FilmstripManifest,
) {
  return NextResponse.json({
    ok: true,
    cacheKey: manifest.cacheKey,
    intervalSec: manifest.intervalSec,
    frames: manifest.frames.map((f) => ({
      sec: f.sec,
      url: frameUrl(req, year, jobSlug, manifest.cacheKey, f.file),
    })),
  });
}

export async function GET(req: Request) {
  if (!isOpsEnabled()) {
    return NextResponse.json({ error: "Ops disabled" }, { status: 403 });
  }

  const url = new URL(req.url);
  const year = Number(url.searchParams.get("year"));
  const jobSlug = url.searchParams.get("jobSlug")?.trim();
  const chapterId = url.searchParams.get("chapterId")?.trim();
  const startSec = Number(url.searchParams.get("startSec"));
  const endSec = Number(url.searchParams.get("endSec"));

  if (
    !Number.isFinite(year) ||
    year < 1900 ||
    year >= 2100 ||
    !jobSlug ||
    !chapterId ||
    !Number.isFinite(startSec) ||
    !Number.isFinite(endSec) ||
    endSec <= startSec
  ) {
    return NextResponse.json({ error: "Invalid filmstrip params" }, { status: 400 });
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

    const manifest = await ensureFilmstrip(
      outputDir,
      videoPath,
      chapterId,
      startSec,
      endSec,
    );

    return manifestResponse(req, year, jobSlug, manifest);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Filmstrip failed";
    const hint = message.includes("ffmpeg")
      ? "Install ffmpeg: brew install ffmpeg"
      : undefined;
    return NextResponse.json({ error: message, hint }, { status: 500 });
  }
}
