import { NextResponse } from "next/server";

import { exportPassPair, runExportFinals, runExportProjectPackage } from "@/lib/ops/creative-lab/projects";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  if (!isOpsEnabled()) {
    return NextResponse.json({ error: "Ops disabled" }, { status: 403 });
  }
  const { id } = await ctx.params;
  const body = (await req.json()) as { op?: string };

  if (body.op === "exportPassPair") {
    try {
      const result = await exportPassPair(id);
      if (!result) return NextResponse.json({ error: "not_found" }, { status: 404 });
      return NextResponse.json({
        ok: true,
        zipPath: result.zipPath,
        zipRel: result.zipRel,
        files: result.files,
        project: result.project,
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : "export_failed";
      return NextResponse.json({ error: message }, { status: 400 });
    }
  }

  if (body.op === "exportFinals") {
    const result = await runExportFinals(id);
    if (!result) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json({
      ok: true,
      files: result.files,
      exportDir: result.exportDir,
      project: result.project,
    });
  }

  const result = await runExportProjectPackage(id);
  if (!result) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({
    ok: true,
    zipPath: result.zipPath,
    zipRel: result.zipRel,
    project: result.project,
  });
}
