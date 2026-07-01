"use server";

import { randomUUID } from "crypto";

import { findLatestPassArtworkBySlug } from "@/lib/ops/event-studio/pass-studio/content-creator-artwork";
import { eventIdFromName } from "@/lib/ops/event-studio/pass-studio/default-templates";
import { passTypeSlugFromLabel } from "@/lib/ops/event-studio/pass-studio/placeholder-artwork.server";
import { passQrUrl, renderPassQrSvg } from "@/lib/ops/event-studio/pass-studio/qr";
import { computeBatchRows, padSerial, serialRangeForRows, totalPassesForRows } from "@/lib/ops/event-studio/pass-studio/serials";
import {
  appendPassesToLibrary,
  filterPassLibrary,
  loadPassLibrary,
  loadPassTemplates,
  nextSerialStart,
  savePassBatch,
  savePassTemplate,
} from "@/lib/ops/event-studio/pass-studio/store";
import type {
  GeneratedPass,
  PassBatch,
  PassLibraryFilter,
  PassTemplate,
} from "@/lib/ops/event-studio/pass-studio/types";
import { shouldAllowOpsRoutes } from "@/lib/runtime/site-mode";

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

/** Create batch → generate every pass, each using its own design → save to library. Never overwrites prior passes. */
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
