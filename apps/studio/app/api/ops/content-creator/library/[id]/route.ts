import { NextResponse } from "next/server";

import {
  libraryFileUrl,
  loadGenerationManifest,
  updateGenerationCurator,
} from "@/lib/ops/content-creator/library";
import type { GenerationCuratorPatch, GenerationRating, GenerationStatus } from "@/lib/ops/content-creator/library/types";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function enrich(manifest: NonNullable<Awaited<ReturnType<typeof loadGenerationManifest>>>) {
  return {
    ...manifest,
    frontUrl: libraryFileUrl(manifest.frontImagePath),
    backUrl: libraryFileUrl(manifest.backImagePath),
    thumbnailUrl: libraryFileUrl(manifest.thumbnailPath),
    exportZipUrl: manifest.exportZipPath ? libraryFileUrl(manifest.exportZipPath) : null,
  };
}

function parsePatch(body: Record<string, unknown>): GenerationCuratorPatch | null {
  const patch: GenerationCuratorPatch = {};
  if (typeof body.favorite === "boolean") patch.favorite = body.favorite;
  if (body.rating === null) patch.rating = null;
  if (typeof body.rating === "number" && body.rating >= 1 && body.rating <= 5) {
    patch.rating = body.rating as GenerationRating;
  }
  if (typeof body.notes === "string") patch.notes = body.notes;
  if (Array.isArray(body.tags)) {
    patch.tags = body.tags.filter((t): t is string => typeof t === "string");
  }
  if (
    body.status === "review" ||
    body.status === "approved" ||
    body.status === "production_ready" ||
    body.status === "archived"
  ) {
    patch.status = body.status as GenerationStatus;
  }
  if (typeof body.archivedReason === "string") patch.archivedReason = body.archivedReason;
  if (Array.isArray(body.collections)) {
    patch.collections = body.collections.filter((c): c is string => typeof c === "string");
  }
  if (body.template && typeof body.template === "object") {
    const template = body.template as Record<string, unknown>;
    patch.template = {};
    if (typeof template.isTemplate === "boolean") patch.template.isTemplate = template.isTemplate;
    if (typeof template.templateName === "string") patch.template.templateName = template.templateName;
    if (typeof template.templateNotes === "string") patch.template.templateNotes = template.templateNotes;
    if (typeof template.usedCount === "number" && template.usedCount >= 0) patch.template.usedCount = template.usedCount;
    if (typeof template.lastUsedAt === "string" || template.lastUsedAt === null) {
      patch.template.lastUsedAt = template.lastUsedAt;
    }
    if (typeof template.sourceGenerationId === "string" || template.sourceGenerationId === null) {
      patch.template.sourceGenerationId = template.sourceGenerationId;
    }
  }
  return Object.keys(patch).length ? patch : null;
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!isOpsEnabled()) {
    return NextResponse.json({ error: "Ops disabled" }, { status: 403 });
  }

  const { id } = await ctx.params;
  const manifest = await loadGenerationManifest(id);
  if (!manifest) return NextResponse.json({ error: "not_found" }, { status: 404 });

  return NextResponse.json({ ok: true, generation: enrich(manifest) });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!isOpsEnabled()) {
    return NextResponse.json({ error: "Ops disabled" }, { status: 403 });
  }

  const { id } = await ctx.params;
  const body = (await req.json()) as Record<string, unknown>;
  const patch = parsePatch(body);
  if (!patch) {
    return NextResponse.json({ error: "No valid curator fields" }, { status: 400 });
  }

  try {
    const manifest = await updateGenerationCurator(id, patch);
    return NextResponse.json({ ok: true, generation: enrich(manifest) });
  } catch {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
}
