import { NextResponse } from "next/server";

import {
  deleteProject,
  generateConceptForModule,
  loadProject,
  updateProject,
} from "@/lib/ops/creative-lab/projects";
import { normalizeConceptStrategyMap } from "@/lib/ops/creative-lab/concept-strategies";
import { normalizeStyleSelection } from "@/lib/ops/creative-lab/style-catalog";
import type { CreativeLabModuleId } from "@/lib/ops/creative-lab/types";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  if (!isOpsEnabled()) {
    return NextResponse.json({ error: "Ops disabled" }, { status: 403 });
  }
  const { id } = await ctx.params;
  const project = await loadProject(id);
  if (!project) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ ok: true, project });
}

export async function PUT(req: Request, ctx: Ctx) {
  if (!isOpsEnabled()) {
    return NextResponse.json({ error: "Ops disabled" }, { status: 403 });
  }
  const { id } = await ctx.params;
  const body = (await req.json()) as Record<string, unknown>;

  if (body.op === "generateConcept" || body.op === "generateConceptVariations") {
    const module =
      body.module === "poster-lab" ||
      body.module === "bumper-lab" ||
      body.module === "card-lab" ||
      body.module === "magazine-lab" ||
      body.module === "pass-lab"
        ? (body.module as CreativeLabModuleId)
        : "pass-lab";
    const project = await generateConceptForModule(id, module);
    if (!project) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json({ ok: true, project });
  }

  const project = await updateProject(id, {
    name: typeof body.name === "string" ? body.name : undefined,
    event: typeof body.event === "string" ? body.event : undefined,
    venue: typeof body.venue === "string" ? body.venue : undefined,
    date: typeof body.date === "string" ? body.date : undefined,
    theme: typeof body.theme === "string" ? body.theme : undefined,
    featuredYears: Array.isArray(body.featuredYears)
      ? body.featuredYears.filter((y): y is number => typeof y === "number")
      : undefined,
    styleSelection: body.styleSelection ? normalizeStyleSelection(body.styleSelection) : undefined,
    activePresetId: typeof body.activePresetId === "string" ? body.activePresetId : undefined,
    conceptStrategies: body.conceptStrategies
      ? normalizeConceptStrategyMap(body.conceptStrategies)
      : undefined,
    activeModule:
      body.activeModule === "poster-lab" ||
      body.activeModule === "bumper-lab" ||
      body.activeModule === "card-lab" ||
      body.activeModule === "magazine-lab" ||
      body.activeModule === "pass-lab"
        ? body.activeModule
        : undefined,
    selectedAssetIds: Array.isArray(body.selectedAssetIds)
      ? body.selectedAssetIds.filter((x): x is string => typeof x === "string")
      : undefined,
  });

  if (!project) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ ok: true, project });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  if (!isOpsEnabled()) {
    return NextResponse.json({ error: "Ops disabled" }, { status: 403 });
  }
  const { id } = await ctx.params;
  const ok = await deleteProject(id);
  if (!ok) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
