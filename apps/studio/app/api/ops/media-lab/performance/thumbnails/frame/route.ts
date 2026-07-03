import { existsSync } from "node:fs";
import { createReadStream } from "node:fs";
import { join } from "path";
import { Readable } from "node:stream";

import { NextResponse } from "next/server";

import { chapterThumbCacheDir } from "@/lib/ops/media-lab/editorial/chapter-thumbnails";
import { performanceEditorCacheDir } from "@/lib/ops/media-lab/performance-editor/paths";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function streamToWeb(stream: Readable): ReadableStream<Uint8Array> {
  return Readable.toWeb(stream) as ReadableStream<Uint8Array>;
}

export async function GET(req: Request) {
  if (!isOpsEnabled()) {
    return new NextResponse("Not found", { status: 404 });
  }

  const url = new URL(req.url);
  const episodeId = url.searchParams.get("episode")?.trim();
  const cacheKey = url.searchParams.get("cacheKey")?.trim();
  const file = url.searchParams.get("file")?.trim();

  if (!episodeId || !cacheKey || !file) {
    return new NextResponse("Invalid params", { status: 400 });
  }

  if (!/^[a-z0-9_-]+$/i.test(cacheKey)) {
    return new NextResponse("Invalid cache key", { status: 400 });
  }
  if (!/^(first|mid|last)\.jpg$/i.test(file)) {
    return new NextResponse("Invalid frame file", { status: 400 });
  }

  const path = join(chapterThumbCacheDir(performanceEditorCacheDir(episodeId), cacheKey), file);
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
}
