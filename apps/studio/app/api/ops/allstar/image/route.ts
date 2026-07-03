import { createReadStream, existsSync } from "node:fs";
import { extname, resolve } from "node:path";
import { Readable } from "node:stream";
import { NextResponse } from "next/server";

import {
  allstarDataRoot,
  allstarReviewDir,
  allstarScansDir,
} from "@/lib/ops/allstar/paths";
import { loadAllStarSnapshot } from "@/lib/ops/allstar/load-allstar";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ALLOWED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png"]);

function streamToWeb(stream: Readable): ReadableStream<Uint8Array> {
  return Readable.toWeb(stream) as ReadableStream<Uint8Array>;
}

function isPathInsideRoot(path: string, root: string): boolean {
  const resolved = resolve(path);
  const resolvedRoot = resolve(root);
  return resolved.startsWith(resolvedRoot);
}

function contentTypeFor(path: string): string {
  const ext = extname(path).toLowerCase();
  if (ext === ".png") return "image/png";
  return "image/jpeg";
}

export async function GET(req: Request) {
  if (!isOpsEnabled()) {
    return new NextResponse("Not found", { status: 404 });
  }

  const url = new URL(req.url);
  const kind = url.searchParams.get("kind")?.trim();
  const discId = url.searchParams.get("id")?.trim();

  if (!kind || !discId || !["scan", "review"].includes(kind)) {
    return new NextResponse("Missing kind or id", { status: 400 });
  }

  const snapshot = await loadAllStarSnapshot();
  const disc = snapshot.discs.find((item) => item.id === discId);
  if (!disc) {
    return new NextResponse("Disc not found", { status: 404 });
  }

  let path: string | null = null;
  if (kind === "scan") {
    path = disc.scanPath;
    if (!isPathInsideRoot(path, allstarScansDir()) && !isPathInsideRoot(path, allstarDataRoot())) {
      return new NextResponse("Invalid scan path", { status: 403 });
    }
  } else {
    if (!disc.reviewImageFilename) {
      return new NextResponse("Review image missing", { status: 404 });
    }
    path = `${allstarReviewDir()}/${disc.reviewImageFilename}`;
    if (!isPathInsideRoot(path, allstarReviewDir())) {
      return new NextResponse("Invalid review path", { status: 403 });
    }
  }

  const resolved = resolve(path);
  const ext = extname(resolved).toLowerCase();
  if (!existsSync(resolved) || !ALLOWED_EXTENSIONS.has(ext)) {
    return new NextResponse("Image not found", { status: 404 });
  }

  return new NextResponse(streamToWeb(createReadStream(resolved)), {
    status: 200,
    headers: {
      "Content-Type": contentTypeFor(resolved),
      "Cache-Control": "private, max-age=3600",
    },
  });
}
