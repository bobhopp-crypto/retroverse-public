import { createReadStream, existsSync } from "node:fs";
import { extname, resolve } from "node:path";
import { Readable } from "node:stream";
import { NextResponse } from "next/server";

import { isOpsEnabled } from "@/lib/ops/ops-gate";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ALLOWED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png"]);

function streamToWeb(stream: Readable): ReadableStream<Uint8Array> {
  return Readable.toWeb(stream) as ReadableStream<Uint8Array>;
}

function isAllowedThumbnailPath(path: string): boolean {
  const normalized = path.replace(/\\/g, "/");
  if (!/\/VIDEO\//i.test(normalized)) return false;
  if (!ALLOWED_EXTENSIONS.has(extname(normalized).toLowerCase())) return false;
  return existsSync(path);
}

export async function GET(req: Request) {
  if (!isOpsEnabled()) {
    return new NextResponse("Not found", { status: 404 });
  }

  const url = new URL(req.url);
  const rawPath = url.searchParams.get("path")?.trim();
  if (!rawPath) {
    return new NextResponse("Missing path", { status: 400 });
  }

  const path = resolve(rawPath);
  if (!isAllowedThumbnailPath(path)) {
    return new NextResponse("Thumbnail not found", { status: 404 });
  }

  const contentType = extname(path).toLowerCase() === ".png" ? "image/png" : "image/jpeg";
  return new NextResponse(streamToWeb(createReadStream(path)), {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "private, max-age=86400",
    },
  });
}
