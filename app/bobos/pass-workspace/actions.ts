"use server";

import { randomUUID } from "crypto";
import { readFile, writeFile } from "fs/promises";

import { isArtworkProviderConfigured, resolveArtworkProvider } from "@/lib/ops/creative-lab/artwork";
import type { ControlledPassTypeLabel } from "@/lib/ops/creative-lab/pass-text-governance";
import {
  DEFAULT_CREATIVE_DIRECTION_SETTINGS,
  type CreativeDirectionId,
} from "@/lib/ops/content-creator/creative-direction";
import { libraryFileUrl, loadGenerationManifest } from "@/lib/ops/content-creator/library";
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
import { shouldAllowOpsRoutes } from "@/lib/runtime/site-mode";
import {
  DEFAULT_PASS_ARTWORK_ADJUSTMENTS,
  type PassArtworkAdjustments,
} from "@/lib/bobos/project-zero/pass-artwork-adjustments";
import { applyPassArtworkAdjustments } from "@/lib/bobos/project-zero/pass-artwork-adjustments.server";
import {
  appendPassWorkspaceVersion,
  loadPassWorkspaceAdjustments,
  savePassWorkspaceAdjustment,
  type PassWorkspaceSlug,
  type PassWorkspaceVersion,
} from "@/lib/bobos/project-zero/pass-workspace-store";
import {
  bobosRenderAbsolutePath,
  buildBobosPrintSheets,
  finishBobosPassBack,
  finishBobosPassFront,
  readGenerationSidePng,
  saveBobosPassBack,
  saveBobosPassFront,
  type BobosPrintSheetSet,
} from "@/lib/bobos/project-zero/pass-production";

function assertLocalStudio() {
  if (!shouldAllowOpsRoutes()) {
    throw new Error("Pass Workspace is localhost-only.");
  }
}

/** Same default era Pass Studio's own generate route falls back to. No fuzzy era matching —
 *  just one stable default, same as the rest of the pipeline already uses. */
const DEFAULT_ERA_SLUG = "1982-1985";

const CREATIVE_DIRECTION_BY_SLUG: Record<PassWorkspaceSlug, CreativeDirectionId> = {
  general: "festival-pass",
  vip: "collector-card",
  backstage: "backstage-credential",
};

/** Each tier gets its own controlled label so General never reads VIP and Backstage
 *  never reads VIP — the three tiers must never be confused for one another on sight. */
const PASS_TYPE_LABEL_BY_SLUG: Record<PassWorkspaceSlug, ControlledPassTypeLabel> = {
  general: "GENERAL PASS",
  vip: "VIP PASS",
  backstage: "BACKSTAGE PASS",
};

async function resolveEraProfile() {
  const profiles = await listRvbrProfiles();
  if (profiles.length === 0) {
    throw new Error("No RVBR era profiles found — seed the database before generating artwork.");
  }
  return profiles.find((p) => p.slug === DEFAULT_ERA_SLUG) ?? profiles[0]!;
}

export type GeneratePassArtworkInput = {
  projectId: string;
  slug: PassWorkspaceSlug;
  eventName: string;
  venue: string;
  date: string;
  theme: string;
};

/**
 * Creates a brand-new artwork generation via the existing Content Creator pipeline and
 * appends it as the next version for this project + pass type. Never overwrites a prior
 * version, never reads or reuses artwork from any other project.
 */
export async function generatePassArtwork(input: GeneratePassArtworkInput): Promise<PassWorkspaceVersion> {
  assertLocalStudio();

  const provider = resolveArtworkProvider();
  if (provider === "disabled" || !isArtworkProviderConfigured(provider)) {
    throw new Error("Artwork provider is not configured. Set OPENAI_API_KEY to generate artwork.");
  }

  const profile = await resolveEraProfile();
  const fields = {
    event: input.eventName,
    venue: input.venue,
    date: input.date,
    secondaryLine: input.theme,
    passTypeLabel: PASS_TYPE_LABEL_BY_SLUG[input.slug],
  };

  const manifest = await runVNextGenerate({
    profile,
    artifact: "pass",
    frontFields: fields,
    backFields: fields,
    creativeSettings: {
      ...DEFAULT_CREATIVE_DIRECTION_SETTINGS,
      creativeDirection: CREATIVE_DIRECTION_BY_SLUG[input.slug],
    },
  });

  const libraryManifest = await loadGenerationManifest(manifest.runId);

  return appendPassWorkspaceVersion(input.projectId, input.slug, {
    generationId: manifest.runId,
    frontArtworkUrl: libraryManifest?.frontImagePath ? libraryFileUrl(libraryManifest.frontImagePath) : null,
    backArtworkUrl: libraryManifest?.backImagePath ? libraryFileUrl(libraryManifest.backImagePath) : null,
  });
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
};

export type GenerateBobosPassBatchResult = {
  batch: PassBatch;
  passes: GeneratedPass[];
  printSheets: BobosPrintSheetSet;
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

  const startAt = await nextSerialStart();
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
    const { frontPng, frontUrl, backPng } = await finished(generationId, artwork.templateId, adjustments);

    for (let n = row.firstSerial; n <= row.lastSerial; n += 1) {
      const serial = padSerial(n);
      const qrUrl = passQrUrl(serial);
      const qrSvg = await renderPassQrSvg(qrUrl);

      const finishedBack = await finishBobosPassBack({
        rawBackPng: backPng,
        qrUrl,
        serial,
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

  const printSheets = await buildBobosPrintSheets({
    projectId: input.projectId,
    batchId,
    passes: sheetBuffers,
  });

  return { batch, passes, printSheets };
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
): Promise<BobosPrintSheetSet> {
  assertLocalStudio();

  const adjustmentsBySlug = await loadPassWorkspaceAdjustments(projectId);
  const adjustedByGenerationId = new Map<string, { frontPng: Buffer; backRawAdjusted: Buffer }>();

  async function adjustedSource(pass: GeneratedPass): Promise<{ frontPng: Buffer; backRawAdjusted: Buffer } | null> {
    if (!pass.generationId) return null;
    const cached = adjustedByGenerationId.get(pass.generationId);
    if (cached) return cached;

    const slug = passTypeSlugFromLabel(pass.passType);
    const adjustments = adjustmentsBySlug[slug] ?? DEFAULT_PASS_ARTWORK_ADJUSTMENTS;
    const rawFront = await readGenerationSidePng(pass.generationId, "front");
    const rawBack = await readGenerationSidePng(pass.generationId, "back");
    const adjustedFront = await applyPassArtworkAdjustments(rawFront, adjustments);
    const adjustedBack = await applyPassArtworkAdjustments(rawBack, adjustments);
    const frontPng = await finishBobosPassFront(adjustedFront);
    const entry = { frontPng, backRawAdjusted: adjustedBack };
    adjustedByGenerationId.set(pass.generationId, entry);
    return entry;
  }

  const sheetBuffers: { frontPng: Buffer; backPng: Buffer }[] = [];
  for (const pass of passes) {
    const source = await adjustedSource(pass);
    if (source) {
      const finishedBack = await finishBobosPassBack({
        rawBackPng: source.backRawAdjusted,
        qrUrl: pass.qr.url,
        serial: pass.serial,
      });
      sheetBuffers.push({ frontPng: source.frontPng, backPng: finishedBack });

      // Refresh the finished images at their existing URLs so Preview reflects the current
      // Print Boost setting too, without changing the pass record or its serial.
      const frontRel = pass.front.artworkUrl
        ? relPathFromServedUrl(pass.front.artworkUrl, BOBOS_RENDER_FILE_PREFIX)
        : null;
      const backRel = pass.back.artworkUrl
        ? relPathFromServedUrl(pass.back.artworkUrl, BOBOS_RENDER_FILE_PREFIX)
        : null;
      if (frontRel) await writeFile(bobosRenderAbsolutePath(frontRel), source.frontPng);
      if (backRel) await writeFile(bobosRenderAbsolutePath(backRel), finishedBack);
      continue;
    }

    // Legacy passes without a recorded generationId — reuse whatever is already finished.
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

  const batchId = `${passes[0]?.batchId ?? randomUUID()}-view`;
  return buildBobosPrintSheets({ projectId, batchId, passes: sheetBuffers });
}
