import { createReadStream, existsSync, statSync } from "node:fs";
import { Readable } from "node:stream";

import { NextResponse } from "next/server";

import { resolveHarvestRelativePath } from "@/lib/ops/media-lab/harvest/paths";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

export const dynamic = "force-dynamic";

function contentTypeForPath(filePath: string): string {
  const lower = filePath.toLowerCase();
  if (lower.endsWith(".webm")) return "video/webm";
  if (lower.endsWith(".mov")) return "video/quicktime";
  if (lower.endsWith(".mkv")) return "video/x-matroska";
  return "video/mp4";
}

function streamToWeb(stream: Readable): ReadableStream<Uint8Array> {
  return Readable.toWeb(stream) as ReadableStream<Uint8Array>;
}

export async function GET(request: Request) {
  if (!isOpsEnabled()) {
    return new NextResponse("Not found", { status: 404 });
  }

  const url = new URL(request.url);
  const rel = url.searchParams.get("rel")?.trim();
  if (!rel) {
    return new NextResponse("Invalid params", { status: 400 });
  }

  let filePath: string;
  try {
    filePath = resolveHarvestRelativePath(rel);
  } catch {
    return new NextResponse("Invalid path", { status: 400 });
  }

  if (!existsSync(filePath)) {
    return new NextResponse("Video not found", { status: 404 });
  }

  const stat = statSync(filePath);
  const size = stat.size;
  const contentType = contentTypeForPath(filePath);
  const rangeHeader = request.headers.get("range");

  if (!rangeHeader) {
    const stream = createReadStream(filePath);
    return new NextResponse(streamToWeb(stream), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(size),
        "Accept-Ranges": "bytes",
        "Cache-Control": "private, no-store",
      },
    });
  }

  const match = /^bytes=(\d+)-(\d*)$/i.exec(rangeHeader.trim());
  if (!match) {
    return new NextResponse("Invalid range", { status: 416 });
  }

  const start = Number(match[1]);
  const end = match[2] ? Number(match[2]) : size - 1;
  if (!Number.isFinite(start) || start >= size || end >= size || start > end) {
    return new NextResponse("Invalid range", {
      status: 416,
      headers: { "Content-Range": `bytes */${size}` },
    });
  }

  const stream = createReadStream(filePath, { start, end });

  return new NextResponse(streamToWeb(stream), {
    status: 206,
    headers: {
      "Content-Type": contentType,
      "Content-Range": `bytes ${start}-${end}/${size}`,
      "Content-Length": String(end - start + 1),
      "Accept-Ranges": "bytes",
      "Cache-Control": "private, no-store",
    },
  });
}
