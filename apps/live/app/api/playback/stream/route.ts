import { createReadStream, existsSync, statSync } from "node:fs";
import { Readable } from "node:stream";

import { NextResponse } from "next/server";

import { inspectQuery } from "@/lib/inspect/pg";
import { isOpsPlayableVideoPath, opsVideoMediaAndClause } from "@/lib/ops/ops-video-media";

export const dynamic = "force-dynamic";

const RE_RVTR = /^RVTR\d{6}$/i;

function contentTypeForPath(filePath: string): string {
  const lower = filePath.toLowerCase();
  if (lower.endsWith(".webm")) return "video/webm";
  if (lower.endsWith(".mov")) return "video/quicktime";
  if (lower.endsWith(".mkv")) return "video/x-matroska";
  if (lower.endsWith(".avi")) return "video/x-msvideo";
  return "video/mp4";
}

function streamToWeb(stream: Readable): ReadableStream<Uint8Array> {
  return Readable.toWeb(stream) as ReadableStream<Uint8Array>;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const rvtr = url.searchParams.get("rvtr")?.trim().toUpperCase() ?? "";
  const mediaId = Number(url.searchParams.get("media"));

  if (!RE_RVTR.test(rvtr) || !Number.isFinite(mediaId) || mediaId <= 0) {
    return new NextResponse("Invalid params", { status: 400 });
  }

  const rows = await inspectQuery<{ source_path: string | null }>(
    `
    SELECT ma.source_path
    FROM media_assets ma
    JOIN media_track_links mtl ON mtl.media_asset_id = ma.id
    JOIN canonical_track_display ctd ON ctd.track_id::text = mtl.track_id::text
    WHERE ma.id = $1
      AND upper(trim(coalesce(ctd.retroverse_track_id, ctd.track_id))) = upper(trim($2))
    ${opsVideoMediaAndClause("ma")}
    LIMIT 1
    `,
    [mediaId, rvtr],
  );

  const filePath = rows[0]?.source_path?.trim();
  if (!filePath || !isOpsPlayableVideoPath(filePath) || !existsSync(filePath)) {
    return new NextResponse("Not found", { status: 404 });
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
        "Cache-Control": "private, max-age=3600",
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
      "Cache-Control": "private, max-age=3600",
    },
  });
}
