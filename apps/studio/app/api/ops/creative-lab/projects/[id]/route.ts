import { NextResponse } from "next/server";

import {
  advanceMockVariations,
  approveAsset,
  deleteProject,
  generateArtworkForProject,
  generateConceptForModule,
  generateBackConceptsForProject,
  generatePassConceptsForProject,
  generateRefinementImages,
  generateRefinementVariations,
  lockFrontAsset,
  loadProject,
  markAssetFinal,
  rejectAsset,
  revalidatePassAsset,
  saveProject,
  setSelectedBack,
  setSelectedConcept,
  setSelectedVariation,
  updateProject,
} from "@/lib/ops/creative-lab/projects";
import { PassTextViolationError } from "@/lib/ops/creative-lab/pass-text-validation";
import { normalizeConceptStrategyMap } from "@/lib/ops/creative-lab/concept-strategies";
import { normalizeVisualWorldId } from "@/lib/ops/creative-lab/visual-worlds";
import { normalizeArtifactTypeId } from "@/lib/ops/creative-lab/artifact-types";
import { normalizeQrPlacement } from "@/lib/ops/creative-lab/pass-layout";
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
    try {
      const project = await approveAsset(id, body.assetId);
      if (!project) return NextResponse.json({ error: "not_found" }, { status: 404 });
      return NextResponse.json({ ok: true, project });
    } catch (e) {
      if (e instanceof PassTextViolationError) {
        return NextResponse.json(
          { error: e.message, textAudit: e.audit, code: "text_violation" },
          { status: 400 },
        );
      }
      throw e;
    }
  }

  if (body.op === "revalidateAssetText" && typeof body.assetId === "string") {
    try {
      const project = await revalidatePassAsset(id, body.assetId);
      if (!project) return NextResponse.json({ error: "not_found" }, { status: 404 });
      return NextResponse.json({ ok: true, project });
    } catch (e) {
      const message = e instanceof Error ? e.message : "revalidate_failed";
      return NextResponse.json({ error: message }, { status: 400 });
    }
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

  if (body.op === "lockFront") {
    try {
      const project = await lockFrontAsset(id);
      if (!project) return NextResponse.json({ error: "not_found" }, { status: 404 });
      return NextResponse.json({ ok: true, project });
    } catch (e) {
      if (e instanceof PassTextViolationError) {
        return NextResponse.json(
          { error: e.message, textAudit: e.audit, code: "text_violation" },
          { status: 400 },
        );
      }
      const message = e instanceof Error ? e.message : "lock_front_failed";
      return NextResponse.json({ error: message }, { status: 400 });
    }
  }

  if (body.op === "generateBackPasses") {
    try {
      console.log("[cl-api:generateBackPasses] start", { projectId: id });
      const project = await generateBackConceptsForProject(id);
      if (!project) return NextResponse.json({ error: "not_found" }, { status: 404 });
      const backCount = project.generatedPrompts.filter((p) => p.passSide === "back").length;
      console.log("[cl-api:generateBackPasses] done", { projectId: id, backPrompts: backCount });
      return NextResponse.json({ ok: true, project });
    } catch (e) {
      const message = e instanceof Error ? e.message : "back_generation_failed";
      if (e instanceof Error) console.error("[cl-api:generateBackPasses] error", e.stack ?? e.message);
      return NextResponse.json({ error: message }, { status: 502 });
    }
  }

  if (body.op === "setSelectedBack" && typeof body.promptId === "string") {
    const project = await setSelectedBack(id, body.promptId);
    if (!project) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json({ ok: true, project });
  }

  if (body.op === "generatePasses" && typeof body.visualWorldId === "string") {
    try {
      console.log("[cl-api:generatePasses] start", { projectId: id, visualWorldId: body.visualWorldId });
      const project = await generatePassConceptsForProject(id, body.visualWorldId as import("@/lib/ops/creative-lab/visual-worlds").VisualWorldId);
      if (!project) return NextResponse.json({ error: "not_found" }, { status: 404 });
      const pngCount = project.assets.filter((a) => a.filePath?.endsWith(".png")).length;
      console.log("[cl-api:generatePasses] done", {
        projectId: id,
        prompts: project.generatedPrompts.length,
        pngAssets: pngCount,
        firstAssetId: project.generatedPrompts[0]?.assetId,
      });
      return NextResponse.json({ ok: true, project });
    } catch (e) {
      const message = e instanceof Error ? e.message : "pass_generation_failed";
      if (e instanceof Error) console.error("[cl-api:generatePasses] error", e.stack ?? e.message);
      return NextResponse.json({ error: message }, { status: 502 });
    }
  }

  if (body.op === "generateRefinementImages" || body.op === "generateRefinementVariations" || body.op === "advanceMockVariations") {
    try {
      const project = await generateRefinementImages(id);
      if (!project) return NextResponse.json({ error: "prerequisites_missing" }, { status: 400 });
      return NextResponse.json({ ok: true, project });
    } catch (e) {
      const message = e instanceof Error ? e.message : "refinement_generation_failed";
      return NextResponse.json({ error: message }, { status: 502 });
    }
  }

  if (body.op === "setSelectedVariation" && typeof body.variationIndex === "number") {
    const project = await setSelectedVariation(id, body.variationIndex);
    if (!project) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json({ ok: true, project });
  }

  if (body.op === "generateArtwork") {
    try {
      const project = await generateArtworkForProject(id);
      if (!project) {
        return NextResponse.json({ error: "prerequisites_missing" }, { status: 400 });
      }
      return NextResponse.json({ ok: true, project });
    } catch (e) {
      const message = e instanceof Error ? e.message : "artwork_generation_failed";
      return NextResponse.json({ error: message }, { status: 502 });
    }
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

  const patch: Parameters<typeof updateProject>[1] = {
    name: typeof body.name === "string" ? body.name : undefined,
    event: typeof body.event === "string" ? body.event : undefined,
    venue: typeof body.venue === "string" ? body.venue : undefined,
    date: typeof body.date === "string" ? body.date : undefined,
    theme: typeof body.theme === "string" ? body.theme : undefined,
    eraSlug: typeof body.eraSlug === "string" ? body.eraSlug : undefined,
    qrUrl: typeof body.qrUrl === "string" ? body.qrUrl : undefined,
    passTypeLabel: typeof body.passTypeLabel === "string" ? body.passTypeLabel : undefined,
    quantity: typeof body.quantity === "number" ? body.quantity : undefined,
    qrPlacement:
      Object.prototype.hasOwnProperty.call(body, "qrPlacement")
        ? normalizeQrPlacement(body.qrPlacement)
        : undefined,
    secondaryLine:
      typeof body.secondaryLine === "string"
        ? body.secondaryLine
        : Array.isArray(body.featuredYears)
          ? body.featuredYears
              .filter((y): y is number => typeof y === "number")
              .map(String)
              .join(" · ")
          : undefined,
    styleSelection: body.styleSelection ? normalizeStyleSelection(body.styleSelection) : undefined,
    activePresetId: typeof body.activePresetId === "string" ? body.activePresetId : undefined,
    conceptStrategies: body.conceptStrategies
      ? normalizeConceptStrategyMap(body.conceptStrategies)
      : undefined,
    artifactType: body.artifactType !== undefined ? normalizeArtifactTypeId(body.artifactType) : undefined,
    selectedArtDirectionId:
      typeof body.selectedArtDirectionId === "string"
        ? normalizeVisualWorldId(body.selectedArtDirectionId) ?? undefined
        : undefined,
    activeModule:
      body.activeModule === "poster-lab" ||
      body.activeModule === "bumper-lab" ||
      body.activeModule === "card-lab" ||
      body.activeModule === "magazine-lab" ||
      body.activeModule === "pass-lab"
        ? body.activeModule
        : undefined,
  };

  const project = await updateProject(id, patch);

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
