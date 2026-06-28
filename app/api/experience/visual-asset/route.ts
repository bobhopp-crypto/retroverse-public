import { createReadStream } from "node:fs";
import { NextResponse } from "next/server";

import { resolveVisualAssetPath } from "@/lib/ops/studio/collector/visual-extraction";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Public visual asset route for Studio Renderer experiences */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const rvtr = url.searchParams.get("rvtr")?.trim();
  const file = url.searchParams.get("file")?.trim();

  if (!rvtr || !file) {
    return new NextResponse("Bad request", { status: 400 });
  }

  const path = await resolveVisualAssetPath(rvtr, file);
  if (!path) {
    return new NextResponse("Not found", { status: 404 });
  }

  const stream = createReadStream(path);
  return new NextResponse(stream as unknown as BodyInit, {
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
