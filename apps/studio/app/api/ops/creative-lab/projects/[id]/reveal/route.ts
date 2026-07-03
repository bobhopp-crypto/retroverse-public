import { NextResponse } from "next/server";

import { loadProject } from "@/lib/ops/creative-lab/projects";
import { revealCreativeLabPath, type CreativeLabRevealTarget } from "@/lib/ops/creative-lab/reveal";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  if (!isOpsEnabled()) {
    return NextResponse.json({ error: "Ops disabled" }, { status: 403 });
  }
  const { id } = await ctx.params;
  const project = await loadProject(id);
  if (!project) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const body = (await req.json()) as { target?: CreativeLabRevealTarget };
  const target: CreativeLabRevealTarget = body.target === "exports" ? "exports" : "project";
  const folderId = project.folderSlug || project.id;
  const result = await revealCreativeLabPath(folderId, target);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true, path: result.path });
}
