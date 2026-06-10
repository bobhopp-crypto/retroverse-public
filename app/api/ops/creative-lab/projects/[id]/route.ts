import { NextResponse } from "next/server";

import {
  advanceMockVariations,
  approveAsset,
  deleteProject,
  generateConceptForModule,
  loadProject,
  markAssetFinal,
  rejectAsset,
  saveProject,
  setSelectedConcept,
  updateProject,
} from "@/lib/ops/creative-lab/projects";
import { normalizeConceptStrategyMap } from "@/lib/ops/creative-lab/concept-strategies";
import { normalizeArtifactTypeId } from "@/lib/ops/creative-lab/artifact-types";
import { normalizeStyleSelection } from "@/lib/ops/creative-lab/style-catalog";
import type { CreativeLabModuleId, FinalAssetSlot } from "@/lib/ops/creative-lab/types";
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

  if (body.op === "saveProject") {
    const existing = await loadProject(id);
    if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });
    const project = await saveProject(existing);
    return NextResponse.json({ ok: true, project });
  }

  if (body.op === "approveAsset" && typeof body.assetId === "string") {
    const project = await approveAsset(id, body.assetId);
    if (!project) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json({ ok: true, project });
  }

  if (body.op === "rejectAsset" && typeof body.assetId === "string") {
    const project = await rejectAsset(id, body.assetId);
    if (!project) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json({ ok: true, project });
  }

  if (body.op === "setFinalAsset" && typeof body.assetId === "string") {
    const slot =
      body.slot === "final-front" ||
      body.slot === "final-back" ||
      body.slot === "final-poster" ||
      body.slot === "final-bumper"
        ? (body.slot as FinalAssetSlot)
        : undefined;
    const project = await markAssetFinal(id, body.assetId, slot);
    if (!project) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json({ ok: true, project });
  }

  if (body.op === "setSelectedConcept" && typeof body.promptId === "string") {
    const project = await setSelectedConcept(id, body.promptId);
    if (!project) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json({ ok: true, project });
  }

  if (body.op === "advanceMockVariations") {
    const project = await advanceMockVariations(id);
    if (!project) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json({ ok: true, project });
  }

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
    artifactType: body.artifactType !== undefined ? normalizeArtifactTypeId(body.artifactType) : undefined,
    activeModule:
      body.activeModule === "poster-lab" ||
      body.activeModule === "bumper-lab" ||
      body.activeModule === "card-lab" ||
      body.activeModule === "magazine-lab" ||
      body.activeModule === "pass-lab"
        ? body.activeModule
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
