import { createReadStream, existsSync, statSync } from "node:fs";
import { Readable } from "node:stream";

import { readFile } from "fs/promises";
import { join } from "path";
import { NextResponse } from "next/server";

import { resolveJobOutputDir } from "@/lib/ops/media-lab/editorial/job-path";
import type { MediaLabJobMeta } from "@/lib/ops/media-lab/job-meta";
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
  let closed = false;
  return new ReadableStream<Uint8Array>({
    start(controller) {
      const cleanup = () => {
        stream.removeListener("data", onData);
        stream.removeListener("end", onEnd);
        stream.removeListener("error", onError);
      };
      const onData = (chunk: Buffer) => {
        if (closed) return;
        try {
          controller.enqueue(new Uint8Array(chunk));
        } catch {
          closed = true;
          cleanup();
          stream.destroy();
        }
      };
      const onEnd = () => {
        if (closed) return;
        closed = true;
        cleanup();
        controller.close();
      };
      const onError = (error: Error) => {
        if (closed) return;
        closed = true;
        cleanup();
        controller.error(error);
      };
      stream.on("data", onData);
      stream.once("end", onEnd);
      stream.once("error", onError);
    },
    cancel() {
      closed = true;
      stream.removeAllListeners("data");
      stream.removeAllListeners("end");
      stream.removeAllListeners("error");
      stream.destroy();
    },
  });
}

export async function GET(request: Request) {
  if (!isOpsEnabled()) {
    return new NextResponse("Not found", { status: 404 });
  }

  const url = new URL(request.url);
  const year = Number(url.searchParams.get("year"));
  const jobSlug = url.searchParams.get("jobSlug")?.trim();
  if (!Number.isFinite(year) || !jobSlug) {
    return new NextResponse("Invalid params", { status: 400 });
  }

  let outputDir: string;
  try {
    outputDir = resolveJobOutputDir(year, jobSlug);
  } catch {
    return new NextResponse("Invalid job", { status: 400 });
  }

  const job = JSON.parse(
    await readFile(join(outputDir, "job.json"), "utf8"),
  ) as MediaLabJobMeta;

  const filePath = job.sourceVideo?.trim();
  if (!filePath || !existsSync(filePath)) {
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
