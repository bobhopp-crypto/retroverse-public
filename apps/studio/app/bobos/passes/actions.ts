"use server";

import { randomUUID } from "crypto";
import { readFile } from "fs/promises";

import {
  generateBobosPassBatch,
  type GenerateBobosPassBatchResult,
  type GenerateBobosPassBatchRow,
} from "@/app/bobos/pass-workspace/actions";
import { findLatestPassArtworkBySlug } from "@/lib/bobos/pass-studio/content-creator-artwork";
import { eventIdFromName } from "@/lib/bobos/pass-studio/default-templates";
import { passTypeSlugFromLabel } from "@/lib/bobos/pass-studio/placeholder-artwork.server";
import { passQrUrl, renderPassQrSvg } from "@/lib/bobos/pass-studio/qr";
import { computeBatchRows, padSerial, serialRangeForRows, totalPassesForRows } from "@/lib/bobos/pass-studio/serials";
import {
  appendPassesToLibrary,
  filterPassLibrary,
  loadPassLibrary,
  loadPassTemplates,
  nextSerialStart,
  savePassBatch,
  savePassTemplate,
} from "@/lib/bobos/pass-studio/store";
import type {
  GeneratedPass,
  PassBatch,
  PassLibraryFilter,
  PassTemplate,
} from "@/lib/bobos/pass-studio/types";
import {
  findPrintBatch,
  markPrintBatchPrinted,
  updatePrintBatchLayout,
} from "@/lib/bobos/pass-studio/print-batch-store";
import type { PrintBatch } from "@/lib/bobos/pass-studio/print-batch-types";
import {
  bobosRenderAbsolutePath,
  buildBobosPrintSheets,
  relPathFromBobosRenderUrl,
} from "@/lib/bobos/project-zero/pass-production";
import {
  DESIGN_BUILDER_PRINT_LAYOUTS,
  type BobosPrintSheetSet,
  type DesignBuilderPrintLayoutId,
} from "@/lib/bobos/project-zero/pass-production-spec";
import { shouldAllowOpsRoutes } from "@/lib/runtime/site-mode";
import { libraryFileUrl, loadGenerationManifest } from "@/lib/ops/content-creator/library";

function assertLocalStudio() {
  if (!shouldAllowOpsRoutes()) {
    throw new Error("Pass Studio is localhost-only.");
  }
}

function nowIso(): string {
  return new Date().toISOString();
}

export type NewPassTemplateInput = {
  name: string;
  frontArtworkUrl: string;
  backArtworkUrl: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  headingFont: string;
  bodyFont: string;
  qrSide: "front" | "back";
  logoUrl: string;
  backgroundUrl: string;
  style: string;
};

export async function createPassTemplate(input: NewPassTemplateInput): Promise<PassTemplate> {
  assertLocalStudio();
  const template: PassTemplate = {
    id: randomUUID(),
    name: input.name.trim() || "Untitled template",
    generationId: null,
    frontArtworkUrl: input.frontArtworkUrl.trim() || null,
    backArtworkUrl: input.backArtworkUrl.trim() || null,
    colors: {
      primary: input.primaryColor.trim() || "#1a0f2e",
      secondary: input.secondaryColor.trim() || "#ffffff",
      accent: input.accentColor.trim() || "#c494ff",
    },
    fonts: {
      heading: input.headingFont.trim() || "Inherit",
      body: input.bodyFont.trim() || "Inherit",
    },
    qrPosition: {
      side: input.qrSide,
      xPct: 70,
      yPct: 70,
      sizePct: 24,
    },
    logoUrl: input.logoUrl.trim() || null,
    backgroundUrl: input.backgroundUrl.trim() || null,
    style: input.style.trim() || "Festival Pass",
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  await savePassTemplate(template);
  return template;
}

export async function duplicatePassTemplate(templateId: string): Promise<PassTemplate | null> {
  assertLocalStudio();
  const templates = await loadPassTemplates();
  const source = templates.find((t) => t.id === templateId);
  if (!source) return null;

  const copy: PassTemplate = {
    ...source,
    id: randomUUID(),
    name: `${source.name} (copy)`,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  await savePassTemplate(copy);
  return copy;
}

/** Re-syncs a design against the latest matching Content Creator generation — never generates artwork itself. */
export async function regeneratePassTemplateArtwork(templateId: string): Promise<PassTemplate> {
  assertLocalStudio();
  const templates = await loadPassTemplates();
  const existing = templates.find((t) => t.id === templateId);
  if (!existing) throw new Error("Design not found.");

  const passTypeLabel = existing.name.replace(/\s+Pass$/i, "").trim() || existing.name;
  const slug = passTypeSlugFromLabel(passTypeLabel);
  const artworkBySlug = await findLatestPassArtworkBySlug();
  const match = artworkBySlug[slug];

  const updated: PassTemplate = {
    ...existing,
    generationId: match?.generationId ?? null,
    frontArtworkUrl: match?.frontArtworkUrl ?? null,
    backArtworkUrl: match?.backArtworkUrl ?? null,
    updatedAt: nowIso(),
  };

  await savePassTemplate(updated);
  return updated;
}

/**
 * Connects one canonical Content Creator generation to Design Builder. Only the
 * generation id is persisted in the production template; artwork remains in the
 * Content Creator library and is resolved from there on every load.
 */
export async function attachContentCreatorGenerationToDesignBuilder(
  generationId: string,
): Promise<PassTemplate> {
  assertLocalStudio();
  const manifest = await loadGenerationManifest(generationId);
  if (!manifest || manifest.artifact !== "pass") {
    throw new Error("Content Creator pass generation not found.");
  }

  const templates = await loadPassTemplates();
  const targetSlug = passTypeSlugFromLabel(manifest.passTypeLabel);
  const existing = templates.find((template) => {
    const label = template.name.replace(/\s+Pass$/i, "").trim() || template.name;
    return passTypeSlugFromLabel(label) === targetSlug;
  });
  if (!existing) {
    throw new Error(`No Design Builder slot exists for ${manifest.passTypeLabel}.`);
  }

  const updated: PassTemplate = {
    ...existing,
    generationId: manifest.id,
    frontArtworkUrl: libraryFileUrl(manifest.frontImagePath),
    backArtworkUrl: libraryFileUrl(manifest.backImagePath),
    updatedAt: nowIso(),
  };
  await savePassTemplate(updated);
  return updated;
}

export type GeneratePassBatchInput = {
  eventName: string;
  venue: string;
  date: string;
  rows: { passType: string; quantity: number; templateId: string }[];
};

export type GeneratePassBatchResult = {
  batch: PassBatch;
  passes: GeneratedPass[];
};

export type GenerateDesignBuilderPassBatchInput = {
  projectId: string;
  eventName: string;
  venue: string;
  date: string;
  rows: GenerateBobosPassBatchRow[];
  startAt?: number | null;
};

/** Design Builder batch — composited fronts/backs with saved production layouts, plus a
 *  persistent Print Batch + reserved Serial Records for full print traceability. */
export async function generateDesignBuilderPassBatch(
  input: GenerateDesignBuilderPassBatchInput,
): Promise<GenerateBobosPassBatchResult> {
  assertLocalStudio();
  return generateBobosPassBatch({
    projectId: input.projectId,
    eventName: input.eventName,
    venue: input.venue,
    date: input.date,
    rows: input.rows,
    startAt: input.startAt,
  });
}

export type BuildDesignBuilderPrintSheetsInput = {
  projectId: string;
  batchId: string;
  passes: GeneratedPass[];
  layout: DesignBuilderPrintLayoutId;
};

/**
 * Builds real front/back print sheets for one Print Batch at a fixed 2/4/8/16-up layout —
 * every cell is the true, unscaled 2.25" × 3.5" finished pass. Also updates the Print
 * Batch's layout + sheet counts so the Print Summary always reflects what was just built.
 */
export async function buildDesignBuilderPrintSheets(
  input: BuildDesignBuilderPrintSheetsInput,
): Promise<BobosPrintSheetSet & { batch: PrintBatch }> {
  assertLocalStudio();

  const batchPasses = input.passes.filter((pass) => pass.batchId === input.batchId);
  if (batchPasses.length === 0) throw new Error("No passes found for this batch.");

  const sheetBuffers: { frontPng: Buffer; backPng: Buffer }[] = [];
  for (const pass of batchPasses) {
    const frontRel = pass.front.artworkUrl ? relPathFromBobosRenderUrl(pass.front.artworkUrl) : null;
    const backRel = pass.back.artworkUrl ? relPathFromBobosRenderUrl(pass.back.artworkUrl) : null;
    if (!frontRel || !backRel) continue;
    sheetBuffers.push({
      frontPng: await readFile(bobosRenderAbsolutePath(frontRel)),
      backPng: await readFile(bobosRenderAbsolutePath(backRel)),
    });
  }
  if (sheetBuffers.length === 0) {
    throw new Error("No finished pass images found for this batch — generate the batch first.");
  }

  const { cols, rows } = DESIGN_BUILDER_PRINT_LAYOUTS[input.layout];
  const sheets = await buildBobosPrintSheets({
    projectId: input.projectId,
    batchId: input.batchId,
    passes: sheetBuffers,
    grid: { cols, rows },
  });

  const batch = await updatePrintBatchLayout(
    input.batchId,
    input.layout,
    sheets.frontPngUrls.length,
    sheets.backPngUrls.length,
  );

  return { ...sheets, batch };
}

/** Explicit operator action — flips the batch and every one of its serial records to printed. */
export async function markDesignBuilderBatchPrinted(batchId: string): Promise<PrintBatch> {
  assertLocalStudio();
  return markPrintBatchPrinted(batchId);
}

/** Looks up a Print Batch by id — used to restore the Print Summary after a page reload. */
export async function getDesignBuilderPrintBatch(batchId: string): Promise<PrintBatch | null> {
  assertLocalStudio();
  return findPrintBatch(batchId);
}

/** @deprecated Use generateDesignBuilderPassBatch — kept for legacy callers. */
export async function generatePassBatch(
  input: GeneratePassBatchInput,
): Promise<GeneratePassBatchResult> {
  assertLocalStudio();

  const templates = await loadPassTemplates();
  const templateById = new Map(templates.map((t) => [t.id, t]));

  const draftRows = input.rows
    .filter((row) => row.quantity > 0)
    .map((row) => ({
      id: randomUUID(),
      passType: row.passType.trim() || "General",
      quantity: row.quantity,
      templateId: row.templateId,
    }));
  if (draftRows.length === 0) throw new Error("Choose at least one pass design with a quantity.");

  for (const row of draftRows) {
    if (!templateById.has(row.templateId)) {
      throw new Error(`No design found for "${row.passType}". Pick a design in Pass Designs first.`);
    }
  }

  const startAt = await nextSerialStart();
  const rows = computeBatchRows(draftRows, startAt);

  const range = serialRangeForRows(rows);
  const eventId = eventIdFromName(input.eventName);
  const batchId = randomUUID();
  const createdAt = nowIso();

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

  const passes: GeneratedPass[] = [];
  for (const row of rows) {
    const template = templateById.get(row.templateId!)!;
    for (let n = row.firstSerial; n <= row.lastSerial; n += 1) {
      const serial = padSerial(n);
      const qrUrl = passQrUrl(serial);
      const qrSvg = await renderPassQrSvg(qrUrl);
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
        templateId: template.id,
        generationId: template.generationId,
        front: { artworkUrl: template.frontArtworkUrl },
        back: { artworkUrl: template.backArtworkUrl },
        qr: { url: qrUrl, svg: qrSvg },
        status: "available",
        registration: null,
        createdAt,
      });
    }
  }

  await savePassBatch(batch);
  await appendPassesToLibrary(passes);

  return { batch, passes };
}

export async function listPassLibrary(filter: PassLibraryFilter = {}): Promise<GeneratedPass[]> {
  assertLocalStudio();
  const all = await loadPassLibrary();
  return filterPassLibrary(all, filter);
}
