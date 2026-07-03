import { createReadStream, existsSync } from "node:fs";
import { extname } from "node:path";
import { Readable } from "node:stream";
import { NextResponse } from "next/server";

import {
  allstarReviewPathForDisc,
  allstarScanPathForDisc,
  loadAllStarDisc,
  loadAllStarSnapshot,
} from "@/lib/ops/allstar/load-allstar";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function streamToWeb(stream: Readable): ReadableStream<Uint8Array> {
  return Readable.toWeb(stream) as ReadableStream<Uint8Array>;
}

export async function GET() {
  if (!isOpsEnabled()) {
    return new NextResponse("Not found", { status: 404 });
  }

  const snapshot = await loadAllStarSnapshot();
  return NextResponse.json(snapshot);
}
