import { createReadStream, existsSync } from "node:fs";
import { join } from "path";
import { Readable } from "node:stream";
import { NextResponse } from "next/server";

import { chapterThumbCacheDir, THUMB_FILES } from "@/lib/ops/media-lab/editorial/chapter-thumbnails";
import { resolveJobOutputDir } from "@/lib/ops/media-lab/editorial/job-path";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ALLOWED = new Set(Object.values(THUMB_FILES));

function streamToWeb(stream: Readable): ReadableStream<Uint8Array> {
  return Readable.toWeb(stream) as ReadableStream<Uint8Array>;
}

export async function GET(req: Request) {
  if (!isOpsEnabled()) {
    return new NextResponse("Not found", { status: 404 });
  }

  const url = new URL(req.url);
  const year = Number(url.searchParams.get("year"));
  const jobSlug = url.searchParams.get("jobSlug")?.trim();
  const cacheKey = url.searchParams.get("cacheKey")?.trim();
  const file = url.searchParams.get("file")?.trim();

  if (
    !Number.isFinite(year) ||
    year < 1900 ||
    year >= 2100 ||
    !jobSlug ||
    !cacheKey ||
    !file ||
    !ALLOWED.has(file)
  ) {
    return new NextResponse("Invalid params", { status: 400 });
  }

  if (!/^[a-z0-9_-]+$/i.test(cacheKey)) {
    return new NextResponse("Invalid cache key", { status: 400 });
  }

  try {
    const outputDir = resolveJobOutputDir(year, jobSlug);
    const path = join(chapterThumbCacheDir(outputDir, cacheKey), file);
    if (!existsSync(path)) {
      return new NextResponse("Frame not found", { status: 404 });
    }
    const stream = createReadStream(path);
    return new NextResponse(streamToWeb(stream), {
      status: 200,
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "private, max-age=86400",
      },
    });
  } catch {
    return new NextResponse("Frame not found", { status: 404 });
  }
}
