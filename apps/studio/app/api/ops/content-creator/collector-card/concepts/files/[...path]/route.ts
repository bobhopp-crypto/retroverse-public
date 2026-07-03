import { readFile } from "fs/promises";
import { join } from "path";

import { NextResponse } from "next/server";

import { isOpsEnabled } from "@/lib/ops/ops-gate";
import { retroverseDataRoot } from "@/lib/retroverse-data-root";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function contentType(path: string): string {
  if (path.endsWith(".svg")) return "image/svg+xml; charset=utf-8";
  if (path.endsWith(".json")) return "application/json";
  return "application/octet-stream";
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ path: string[] }> },
) {
  if (!isOpsEnabled()) {
    return NextResponse.json({ error: "Ops disabled" }, { status: 403 });
  }

  const { path } = await ctx.params;
  const rel = path.join("/");
  if (!rel || rel.includes("..")) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  try {
    const buffer = await readFile(join(retroverseDataRoot(), "collector_cards", "concepts", rel));
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
