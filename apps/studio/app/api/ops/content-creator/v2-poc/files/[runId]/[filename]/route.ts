import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { NextResponse } from "next/server";

import { creativeLabV2PocRunDir } from "@/lib/ops/creative-lab/paths";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Ctx = { params: Promise<{ runId: string; filename: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  if (!isOpsEnabled()) {
    return NextResponse.json({ error: "Ops disabled" }, { status: 403 });
  }

  const { runId, filename } = await ctx.params;
  if (!runId || !filename || filename.includes("..") || runId.includes("..")) {
    return NextResponse.json({ error: "invalid_path" }, { status: 400 });
  }

  const abs = join(creativeLabV2PocRunDir(runId), basename(filename));
  if (!existsSync(abs)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const buffer = await readFile(abs);
  const ext = abs.split(".").pop()?.toLowerCase();
  const contentType =
    ext === "zip"
      ? "application/zip"
      : ext === "json"
        ? "application/json"
        : "image/png";

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "no-store",
    },
  });
}
