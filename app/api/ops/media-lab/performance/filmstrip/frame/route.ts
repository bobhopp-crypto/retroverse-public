import { Readable } from "node:stream";

import { NextResponse } from "next/server";

import { openFilmstripFrameStream } from "@/lib/ops/media-lab/editorial/filmstrip";
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

  try {
    const outputDir = performanceEditorCacheDir(episodeId);
    const stream = openFilmstripFrameStream(outputDir, cacheKey, file);
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
