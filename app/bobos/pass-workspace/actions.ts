"use server";

import { randomUUID } from "crypto";
import { readFile } from "fs/promises";

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
  appendPassWorkspaceVersion,
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

/** The shared pipeline only supports three controlled labels — "Backstage" has no
 *  dedicated label yet, so it inherits "VIP PASS" like the rest of Pass Studio does. */
const PASS_TYPE_LABEL_BY_SLUG: Record<PassWorkspaceSlug, ControlledPassTypeLabel> = {
  general: "PASS",
  vip: "VIP PASS",
  backstage: "VIP PASS",
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

  // Finished front/back per pass type (per generation), produced once and reused for every
  // serial in that row — the AI artwork is cropped to the exact 2.25:3.5 finished canvas
  // here; the overlay (QR + stamp) is then applied per-serial on top of the finished back.
  const finishedByGenerationId = new Map<string, { frontPng: Buffer; frontUrl: string; backPng: Buffer }>();
  async function finished(generationId: string, templateId: string): Promise<{ frontPng: Buffer; frontUrl: string; backPng: Buffer }> {
    if (!finishedByGenerationId.has(generationId)) {
      const rawFront = await readGenerationSidePng(generationId, "front");
      const rawBack = await readGenerationSidePng(generationId, "back");
      const frontPng = await finishBobosPassFront(rawFront);
      const frontUrl = await saveBobosPassFront({ projectId: input.projectId, batchId, templateId, buffer: frontPng });
      finishedByGenerationId.set(generationId, { frontPng, frontUrl, backPng: rawBack });
    }
    return finishedByGenerationId.get(generationId)!;
  }

  const passes: GeneratedPass[] = [];
  const sheetBuffers: { frontPng: Buffer; backPng: Buffer }[] = [];

  for (const row of rows) {
    const artwork = artworkByRowId.get(row.id)!;
    const generationId = artwork.generationId!;
    const { frontPng, frontUrl, backPng } = await finished(generationId, artwork.templateId);

    for (let n = row.firstSerial; n <= row.lastSerial; n += 1) {
      const serial = padSerial(n);
      const qrUrl = passQrUrl(serial);
      const qrSvg = await renderPassQrSvg(qrUrl);

      const finishedBack = await finishBobosPassBack({ rawBackPng: backPng, qrUrl, serial });
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
 * Rebuilds production print sheets for whatever passes are currently on screen — used
 * when a project's Pass Workspace is reopened and passes already exist from a prior
 * session. Reads the already-finished images straight off disk; never re-runs AI
 * generation or re-applies the overlay. Passes generated before the production
 * specification shipped won't have a finished front/back on disk yet and are skipped.
 */
export async function buildBobosPrintSheetsForPasses(
  projectId: string,
  passes: GeneratedPass[],
): Promise<BobosPrintSheetSet> {
  assertLocalStudio();

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

  const batchId = `${passes[0]?.batchId ?? randomUUID()}-view`;
  return buildBobosPrintSheets({ projectId, batchId, passes: sheetBuffers });
}
