import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { NextResponse } from "next/server";

import { loadProject } from "@/lib/ops/creative-lab/projects";
import { creativeLabProjectDir } from "@/lib/ops/creative-lab/paths";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string; assetId: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  if (!isOpsEnabled()) {
    return NextResponse.json({ error: "Ops disabled" }, { status: 403 });
  }

  const { id, assetId } = await ctx.params;
  const project = await loadProject(id);
  if (!project) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const asset = project.assets.find((a) => a.id === assetId);
  if (!asset?.filePath?.endsWith(".png")) {
    console.log("[cl-api:asset] not_found", { projectId: id, assetId, filePath: asset?.filePath });
    return NextResponse.json({ error: "asset_not_found" }, { status: 404 });
  }

  const abs = join(creativeLabProjectDir(project.folderSlug || project.id), asset.filePath);
  if (!existsSync(abs)) {
    console.log("[cl-api:asset] file_missing", { projectId: id, assetId, abs });
    return NextResponse.json({ error: "file_missing" }, { status: 404 });
  }

  const buffer = await readFile(abs);
  console.log("[cl-api:asset] serve", { projectId: id, assetId, abs, bytes: buffer.length });
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "private, max-age=3600",
    },
  });
}
