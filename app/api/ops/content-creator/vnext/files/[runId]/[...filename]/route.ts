import { readFile } from "fs/promises";
import { join } from "path";

import { NextResponse } from "next/server";

import { creativeLabVNextRunDir } from "@/lib/ops/creative-lab/paths";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function contentType(name: string): string {
  if (name.endsWith(".png")) return "image/png";
  if (name.endsWith(".json")) return "application/json";
  if (name.endsWith(".zip")) return "application/zip";
  return "application/octet-stream";
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ runId: string; filename: string[] }> },
) {
  if (!isOpsEnabled()) {
    return NextResponse.json({ error: "Ops disabled" }, { status: 403 });
  }

  const { runId, filename } = await ctx.params;
  const rel = filename.join("/");
  if (!runId || rel.includes("..")) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  try {
    const buffer = await readFile(join(creativeLabVNextRunDir(runId), rel));
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType(rel),
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
