import { createReadStream, existsSync, statSync } from "node:fs";
import { Readable } from "node:stream";

import { NextResponse } from "next/server";

import { isOpsEnabled } from "@/lib/ops/ops-gate";
import { ensureCandidateManifest } from "@/lib/ops/media-collections/midnight-special/candidates";

export const dynamic = "force-dynamic";

function streamToWeb(stream: Readable): ReadableStream<Uint8Array> {
  return Readable.toWeb(stream) as ReadableStream<Uint8Array>;
}

export async function GET(req: Request) {
  if (!isOpsEnabled()) {
    return new NextResponse("Not found", { status: 404 });
  }

  const url = new URL(req.url);
  const episodeId = url.searchParams.get("episode")?.trim();
  if (!episodeId) {
    return new NextResponse("episode required", { status: 400 });
  }

  const manifest = await ensureCandidateManifest(episodeId);
  const videoPath = manifest?.video_path;
  if (!videoPath || !existsSync(videoPath)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const stat = statSync(videoPath);
  const rangeHeader = req.headers.get("range");

  if (!rangeHeader) {
    const stream = createReadStream(videoPath);
    return new NextResponse(streamToWeb(stream), {
      status: 200,
      headers: {
        "Content-Type": "video/mp4",
        "Content-Length": String(stat.size),
        "Accept-Ranges": "bytes",
      },
    });
  }

  const m = rangeHeader.match(/bytes=(\d+)-(\d*)/);
  if (!m) return new NextResponse("Invalid range", { status: 416 });

  const start = Number.parseInt(m[1]!, 10);
  const end = m[2] ? Number.parseInt(m[2], 10) : stat.size - 1;
  if (!Number.isFinite(start) || start >= stat.size) {
    return new NextResponse("Invalid range", { status: 416 });
  }

  const safeEnd = Math.min(end, stat.size - 1);
  const stream = createReadStream(videoPath, { start, end: safeEnd });

  return new NextResponse(streamToWeb(stream), {
    status: 206,
    headers: {
      "Content-Type": "video/mp4",
      "Content-Length": String(safeEnd - start + 1),
      "Content-Range": `bytes ${start}-${safeEnd}/${stat.size}`,
      "Accept-Ranges": "bytes",
    },
  });
}
