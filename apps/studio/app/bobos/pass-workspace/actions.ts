"use server";

import { randomUUID } from "crypto";
import { readFile } from "fs/promises";

import { isArtworkProviderConfigured, resolveArtworkProvider } from "@/lib/ops/creative-lab/artwork";
import { DEFAULT_CREATIVE_DIRECTION_SETTINGS } from "@/lib/ops/content-creator/creative-direction";
import {
  libraryFileUrl,
  loadGenerationManifest,
  updateGenerationCurator,
} from "@/lib/ops/content-creator/library";
import { runVNextGenerate } from "@/lib/ops/content-creator/vnext-run";
import { listRvbrProfiles } from "@/lib/ops/rvbr/profiles";
import { eventIdFromName } from "@/lib/ops/event-studio/pass-studio/default-templates";
import { passTypeSlugFromLabel } from "@/lib/ops/event-studio/pass-studio/placeholder-artwork.server";
import { passQrUrl, renderPassQrSvg } from "@/lib/ops/event-studio/pass-studio/qr";
import {
  computeBatchRows,
  padSerial,
  serialRangeForRows,
  totalPassesForRows,
} from "@/lib/ops/event-studio/pass-studio/serials";
import { appendPassesToLibrary, nextSerialStart, savePassBatch } from "@/lib/ops/event-studio/pass-studio/store";
import type { GeneratedPass, PassBatch } from "@/lib/ops/event-studio/pass-studio/types";
import { createPrintBatch, reserveSerialRecords } from "@/lib/ops/event-studio/pass-studio/print-batch-store";
import type { PrintBatch } from "@/lib/ops/event-studio/pass-studio/print-batch-types";
import { shouldAllowOpsRoutes } from "@/lib/runtime/site-mode";
import {
  emptyCreativeBriefSeed,
  normalizeCreativeBrief,
  secondaryLineFromBrief,
  styleDirectiveFromBrief,
  type PassCreativeBrief,
} from "@/lib/bobos/project-zero/creative-brief";
import {
  DEFAULT_PASS_ARTWORK_ADJUSTMENTS,
  type PassArtworkAdjustments,
} from "@/lib/bobos/project-zero/pass-artwork-adjustments";
import { applyPassArtworkAdjustments } from "@/lib/bobos/project-zero/pass-artwork-adjustments.server";
import {
  appendPassWorkspaceVersion,
  loadPassWorkspaceAdjustments,
  loadPassWorkspacePrintSheetGrid,
  loadPassWorkspaceProductionLayouts,
  savePassWorkspaceAdjustment,
  savePassWorkspaceCreativeBrief,
  savePassWorkspacePrintSheetGrid,
  savePassWorkspaceProductionLayout,
  type PassWorkspaceSlug,
  type PassWorkspaceVersion,
} from "@/lib/bobos/project-zero/pass-workspace-store";
import type { ProductionLayout } from "@/lib/bobos/project-zero/production-layout";
import type { PrintSheetGridId } from "@/lib/bobos/project-zero/print-sheet-grid";
import {
  bobosRenderAbsolutePath,
  buildBobosPrintSheets,
  finishBobosPassBack,
  finishBobosPassFront,
  readGenerationSidePng,
  saveBobosPassBack,
  saveBobosPassFront,
} from "@/lib/bobos/project-zero/pass-production";
import type { BobosPrintSheetSet } from "@/lib/bobos/project-zero/pass-production-spec";

function assertLocalStudio() {
  if (!shouldAllowOpsRoutes()) {
    throw new Error("Pass Workspace is localhost-only.");
  }
}

async function resolveEraProfile(eraSlug: string) {
  const profiles = await listRvbrProfiles();
  if (profiles.length === 0) {
    throw new Error("No RVBR era profiles found — seed the database before generating artwork.");
  }
  return profiles.find((p) => p.slug === eraSlug) ?? profiles[0]!;
}

/**
 * Persists the restored Content Creator brief for this project — called as the user edits
 * fields, so a reopened workspace shows exactly what was on screen.
 */
export async function savePassCreativeBrief(
  projectId: string,
  brief: PassCreativeBrief,
): Promise<PassCreativeBrief> {
  assertLocalStudio();
  return savePassWorkspaceCreativeBrief(projectId, brief);
}

/** Saves ONLY the given pass type's Production Layout — never overwrites the others. */
export async function saveProductionLayout(
  projectId: string,
  slug: PassWorkspaceSlug,
  layout: ProductionLayout,
): Promise<ProductionLayout> {
  assertLocalStudio();
  return savePassWorkspaceProductionLayout(projectId, slug, layout);
}

export async function savePrintSheetGrid(
  projectId: string,
  gridId: PrintSheetGridId,
): Promise<PrintSheetGridId> {
  assertLocalStudio();
  return savePassWorkspacePrintSheetGrid(projectId, gridId);
}

export type PreviewProductionLayoutInput = {
  projectId: string;
  generationId: string;
  slug: PassWorkspaceSlug;
  layout: ProductionLayout;
};

/** WYSIWYG production layout preview — compositing only, no AI generation. */
export async function previewProductionLayoutBack(
  input: PreviewProductionLayoutInput,
): Promise<{ dataUrl: string }> {
  assertLocalStudio();

  const adjustmentsBySlug = await loadPassWorkspaceAdjustments(input.projectId);
  const adjustments = adjustmentsBySlug[input.slug] ?? DEFAULT_PASS_ARTWORK_ADJUSTMENTS;
  const rawBack = await readGenerationSidePng(input.generationId, "back");
  const adjustedBack = await applyPassArtworkAdjustments(rawBack, adjustments);
  const previewSerial = "0001";
  const finishedBack = await finishBobosPassBack({
    rawBackPng: adjustedBack,
    qrUrl: passQrUrl(previewSerial),
    serial: previewSerial,
    layout: input.layout,
  });

  return { dataUrl: `data:image/png;base64,${finishedBack.toString("base64")}` };
}

export type GeneratePassArtworkInput = {
  projectId: string;
  slug: PassWorkspaceSlug;
  /** The creative brief exactly as shown on screen — what you see is what generates. */
  brief: PassCreativeBrief;
};

/**
 * Creates a brand-new artwork generation via the existing Content Creator pipeline and
 * appends it as the next version for this project + pass type. Never overwrites a prior
 * version, never reads or reuses artwork from any other project. The prompt is driven
 * entirely by the on-screen creative brief: RVBR era, creative direction, governed text
 * fields, anti-cliché toggles, and director notes.
 */
export async function generatePassArtwork(input: GeneratePassArtworkInput): Promise<PassWorkspaceVersion> {
  assertLocalStudio();

  const provider = resolveArtworkProvider();
  if (provider === "disabled" || !isArtworkProviderConfigured(provider)) {
    throw new Error("Artwork provider is not configured. Set OPENAI_API_KEY to generate artwork.");
  }

  const brief = normalizeCreativeBrief(input.brief, emptyCreativeBriefSeed());
  await savePassWorkspaceCreativeBrief(input.projectId, brief);

  const profile = await resolveEraProfile(brief.eraSlug);
  const slot = brief.slots[input.slug];
  const fields = {
    event: brief.event,
    venue: brief.venue,
    date: brief.date,
    secondaryLine: secondaryLineFromBrief(brief),
    passTypeLabel: slot.passTypeLabel,
    creativeNotes: brief.notes.trim(),
  };

  const manifest = await runVNextGenerate({
    profile,
    artifact: "pass",
    frontFields: fields,
    backFields: fields,
    creativeSettings: {
      ...DEFAULT_CREATIVE_DIRECTION_SETTINGS,
      avoidEraTropes: brief.avoidEraTropes,
      maximizeVariation: brief.maximizeVariation,
    },
    // Style + Color Scheme are the strongest prompt instructions — the Style dominates
    // composition and design language; the Color Scheme dominates the palette.
    styleDirective: styleDirectiveFromBrief(brief),
  });

  const libraryManifest = await loadGenerationManifest(manifest.runId);

  return appendPassWorkspaceVersion(input.projectId, input.slug, {
    generationId: manifest.runId,
    frontArtworkUrl: libraryManifest?.frontImagePath ? libraryFileUrl(libraryManifest.frontImagePath) : null,
    backArtworkUrl: libraryManifest?.backImagePath ? libraryFileUrl(libraryManifest.backImagePath) : null,
  });
}

/**
 * Marks the current generation approved in the Content Creator library — the same approval
 * status the Collectible Library shows. Approval lives with the generation, not the project.
 */
export async function approvePassArtwork(generationId: string): Promise<void> {
  assertLocalStudio();
  await updateGenerationCurator(generationId, { status: "approved" });
}

/**
 * Print Boost — non-destructive brightness/contrast/saturation for one pass type. Never
 * touches the raw AI generation; only changes how it is finished for Preview/Print. Safe to
 * call any number of times without regenerating artwork.
 */
export async function updatePassArtworkAdjustments(
  projectId: string,
  slug: PassWorkspaceSlug,
  adjustments: PassArtworkAdjustments,
): Promise<PassArtworkAdjustments> {
  assertLocalStudio();
  return savePassWorkspaceAdjustment(projectId, slug, adjustments);
}

export type GenerateBobosPassBatchRow = {
  passType: string;
  quantity: number;
  templateId: string;
  generationId: string | null;
  frontArtworkUrl: string | null;
  backArtworkUrl: string | null;
};

export type GenerateBobosPassBatchInput = {
  projectId: string;
  eventName: string;
  venue: string;
  date: string;
  rows: GenerateBobosPassBatchRow[];
  /** Custom starting serial — omit/null to continue from the next available number. */
  startAt?: number | null;
};

export type GenerateBobosPassBatchResult = {
  batch: PassBatch;
  passes: GeneratedPass[];
  printBatch: PrintBatch;
};

/**
 * Batch generation for the BobOS Pass Workspace — the artwork comes directly from the
 * card currently shown on screen (its current version), never from the legacy Pass Studio
 * template store, wizard state, or Producer singleton. Serial numbers and library
 * persistence reuse the exact same logic as the legacy wizard. The production overlay
 * (QR + realistic stamped serial) is applied here, per the BobOS Pass Production
 * Specification — AI artwork itself never contains a QR, serial, or stamp.
 */
export async function generateBobosPassBatch(
  input: GenerateBobosPassBatchInput,
): Promise<GenerateBobosPassBatchResult> {
  assertLocalStudio();

  const draftRows = input.rows
    .filter((row) => row.quantity > 0)
    .map((row) => ({
      id: randomUUID(),
      passType: row.passType.trim() || "General",
      quantity: row.quantity,
      templateId: row.templateId,
      generationId: row.generationId,
      frontArtworkUrl: row.frontArtworkUrl,
      backArtworkUrl: row.backArtworkUrl,
    }));
  if (draftRows.length === 0) throw new Error("Set a quantity for at least one pass type.");

  for (const row of draftRows) {
    if (!row.frontArtworkUrl || !row.generationId) {
      throw new Error(`No artwork has been generated for ${row.passType} Pass. Generate artwork before creating passes.`);
    }
  }

  const startAt =
    typeof input.startAt === "number" && Number.isFinite(input.startAt) && input.startAt >= 1
      ? Math.floor(input.startAt)
      : await nextSerialStart();
  const rows = computeBatchRows(draftRows, startAt);

  const range = serialRangeForRows(rows);
  const eventId = eventIdFromName(input.eventName);
  const batchId = randomUUID();
  const createdAt = new Date().toISOString();

  const batch: PassBatch = {
    id: batchId,
    eventId,
    eventName: input.eventName,
    venue: input.venue,
    date: input.date,
    templateId: rows[0]?.templateId ?? "",
    rows,
    totalPasses: totalPassesForRows(rows),
    serialStart: range.start,
    serialEnd: range.end,
    status: "generated",
    createdAt,
    updatedAt: createdAt,
  };

  const artworkByRowId = new Map<string, (typeof draftRows)[number]>(draftRows.map((row) => [row.id, row]));
  const adjustmentsBySlug = await loadPassWorkspaceAdjustments(input.projectId);
  const layoutsBySlug = await loadPassWorkspaceProductionLayouts(input.projectId);

  // Finished front/back per pass type (per generation), produced once and reused for every
  // serial in that row — Print Boost is applied first (non-destructive; raw generation PNG
  // on disk is never touched), then the AI artwork is cropped to the exact 2.25:3.5 finished
  // canvas. The AI-designed front is never touched further; the back's QR + stamped serial
  // are applied per-serial on top of the finished back.
  const finishedByGenerationId = new Map<string, { frontPng: Buffer; frontUrl: string; backPng: Buffer }>();
  async function finished(
    generationId: string,
    templateId: string,
    adjustments: PassArtworkAdjustments,
  ): Promise<{ frontPng: Buffer; frontUrl: string; backPng: Buffer }> {
    if (!finishedByGenerationId.has(generationId)) {
      const rawFront = await readGenerationSidePng(generationId, "front");
      const rawBack = await readGenerationSidePng(generationId, "back");
      const adjustedFront = await applyPassArtworkAdjustments(rawFront, adjustments);
      const adjustedBack = await applyPassArtworkAdjustments(rawBack, adjustments);
      const frontPng = await finishBobosPassFront(adjustedFront);
      const frontUrl = await saveBobosPassFront({ projectId: input.projectId, batchId, templateId, buffer: frontPng });
      finishedByGenerationId.set(generationId, { frontPng, frontUrl, backPng: adjustedBack });
    }
    return finishedByGenerationId.get(generationId)!;
  }

  const passes: GeneratedPass[] = [];
  const sheetBuffers: { frontPng: Buffer; backPng: Buffer }[] = [];

  for (const row of rows) {
    const artwork = artworkByRowId.get(row.id)!;
    const generationId = artwork.generationId!;
    const slug = passTypeSlugFromLabel(row.passType);
    const adjustments = adjustmentsBySlug[slug] ?? DEFAULT_PASS_ARTWORK_ADJUSTMENTS;
    // Each pass type is finished with its OWN saved Production Layout.
    const productionLayout = layoutsBySlug[slug] ?? null;
    const { frontPng, frontUrl, backPng } = await finished(generationId, artwork.templateId, adjustments);

    for (let n = row.firstSerial; n <= row.lastSerial; n += 1) {
      const serial = padSerial(n);
      const qrUrl = passQrUrl(serial);
      const qrSvg = await renderPassQrSvg(qrUrl);

      const finishedBack = await finishBobosPassBack({
        rawBackPng: backPng,
        qrUrl,
        serial,
        layout: productionLayout,
      });
      const backArtworkUrl = await saveBobosPassBack({
        projectId: input.projectId,
        batchId,
        serial,
        buffer: finishedBack,
      });
      sheetBuffers.push({ frontPng, backPng: finishedBack });

      passes.push({
        id: randomUUID(),
        serial,
        serialNumber: n,
        passType: row.passType,
        eventId,
        eventName: input.eventName,
        venue: input.venue,
        date: input.date,
        batchId,
        templateId: artwork.templateId,
        generationId,
        front: { artworkUrl: frontUrl },
        back: { artworkUrl: backArtworkUrl },
        qr: { url: qrUrl, svg: qrSvg },
        status: "available",
        registration: null,
        createdAt,
      });
    }
  }

  await savePassBatch(batch);
  await appendPassesToLibrary(passes);

  // Print production traceability — one persistent batch record plus one reserved serial
  // record per pass, so nobody has to remember which serials were printed by hand.
  const printBatch = await createPrintBatch({
    id: batch.id,
    eventId,
    eventName: input.eventName,
    passTypeCounts: rows
      .filter((row) => row.quantity > 0)
      .map((row) => ({
        passType: row.passType,
        quantity: row.quantity,
        firstSerial: row.firstSerial,
        lastSerial: row.lastSerial,
      })),
    serialStart: range.start,
    serialEnd: range.end,
    totalPasses: totalPassesForRows(rows),
  });
  await reserveSerialRecords(
    passes.map((pass) => ({
      serial: pass.serial,
      batchId: batch.id,
      eventId,
      passType: pass.passType,
      qrUrl: pass.qr.url,
    })),
  );

  return { batch, passes, printBatch };
}

const BOBOS_RENDER_FILE_PREFIX = "/api/bobos/pass-workspace/files/";

function relPathFromServedUrl(url: string, prefix: string): string | null {
  if (!url.startsWith(prefix)) return null;
  return decodeURIComponent(url.slice(prefix.length));
}

/**
 * Rebuilds production print sheets for whatever passes are currently on screen — used both
 * when a project's Pass Workspace is reopened and to apply a new Print Boost setting to an
 * already-generated batch. For passes with a recorded `generationId`, this re-derives the
 * finished front/back from the untouched raw AI generation using the CURRENT adjustment
 * settings (no AI call) and refreshes the on-disk finished images in place, so Preview and
 * Print stay in sync at the same URLs. Passes generated before the production specification
 * shipped won't have a finished front/back on disk yet and are skipped.
 */
export async function buildBobosPrintSheetsForPasses(
  projectId: string,
  passes: GeneratedPass[],
  gridId?: PrintSheetGridId,
): Promise<BobosPrintSheetSet> {
  assertLocalStudio();

  const resolvedGridId = gridId ?? (await loadPassWorkspacePrintSheetGrid(projectId));
  const sheetBuffers: { frontPng: Buffer; backPng: Buffer }[] = [];

  for (const pass of passes) {
    const frontRel = pass.front.artworkUrl
      ? relPathFromServedUrl(pass.front.artworkUrl, BOBOS_RENDER_FILE_PREFIX)
      : null;
    const backRel = pass.back.artworkUrl
      ? relPathFromServedUrl(pass.back.artworkUrl, BOBOS_RENDER_FILE_PREFIX)
      : null;
    if (!frontRel || !backRel) continue;

    const frontPng = await readFile(bobosRenderAbsolutePath(frontRel));
    const backPng = await readFile(bobosRenderAbsolutePath(backRel));
    sheetBuffers.push({ frontPng, backPng });
  }

  if (sheetBuffers.length === 0) {
    throw new Error("No finished pass images found — generate a batch first.");
  }

  const batchId = `${passes[0]?.batchId ?? randomUUID()}-sheets`;
  return buildBobosPrintSheets({
    projectId,
    batchId,
    passes: sheetBuffers,
    gridId: resolvedGridId,
  });
}
