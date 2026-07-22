import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { NextResponse } from "next/server";

import { credentialsArtworkRunDir } from "@/lib/bobos/credentials/paths";
import { shouldAllowOpsRoutes } from "@/lib/runtime/site-mode";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: { params: Promise<{ runId: string; filename: string }> },
) {
  if (!shouldAllowOpsRoutes(request.headers.get("host"))) {
    return NextResponse.json({ error: "Not available." }, { status: 403 });
  }
  const { runId, filename } = await context.params;
  if (!/^credential-[a-z0-9-]+$/i.test(runId) || !/^(front|back)\.png$/.test(filename)) {
    return NextResponse.json({ error: "Invalid artwork path." }, { status: 400 });
  }
  try {
    const buffer = await readFile(join(credentialsArtworkRunDir(runId), filename));
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "private, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "Artwork not found." }, { status: 404 });
  }
}
