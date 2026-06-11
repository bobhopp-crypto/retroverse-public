import { readFile } from "fs/promises";
import { join } from "path";

import { NextResponse } from "next/server";

import { creativeLabRvbrValidationRunDir } from "@/lib/ops/creative-lab/paths";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ runId: string; filename: string }> },
) {
  if (!isOpsEnabled()) {
    return NextResponse.json({ error: "Ops disabled" }, { status: 403 });
  }

  const { runId, filename } = await ctx.params;
  if (!runId || filename.includes("..") || filename.includes("/")) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  try {
    const buffer = await readFile(join(creativeLabRvbrValidationRunDir(runId), filename));
    const type = filename.endsWith(".json") ? "application/json" : "image/png";
    return new NextResponse(buffer, {
      headers: { "Content-Type": type, "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
