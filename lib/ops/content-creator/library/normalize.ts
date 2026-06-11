import { DEFAULT_CREATIVE_DIRECTION_SETTINGS } from "@/lib/ops/content-creator/creative-direction";

import type { ContentCreatorGenerationIndexEntry, ContentCreatorGenerationManifest } from "./types";

const DEFAULT_QUALITY = {
  promptCharCount: 0,
  variationScore: "medium" as const,
  clicheRisk: "medium" as const,
};

/** Upgrade v1 manifests and fill curator defaults. */
export function normalizeGenerationManifest(
  raw: Partial<ContentCreatorGenerationManifest> & { id: string },
): ContentCreatorGenerationManifest {
  return {
    version: 2,
    id: raw.id,
    runId: raw.runId ?? raw.id,
    timestamp: raw.timestamp ?? new Date().toISOString(),
    updatedAt: raw.updatedAt ?? raw.timestamp ?? new Date().toISOString(),
    eraSlug: raw.eraSlug ?? "",
    eraName: raw.eraName ?? "",
    artifact: raw.artifact ?? "pass",
    creativeDirection: raw.creativeDirection ?? DEFAULT_CREATIVE_DIRECTION_SETTINGS.creativeDirection,
    creativeSettings: raw.creativeSettings ?? DEFAULT_CREATIVE_DIRECTION_SETTINGS,
    promptHash: raw.promptHash ?? "",
    event: raw.event ?? "",
    venue: raw.venue ?? "",
    date: raw.date ?? "",
    secondaryLine: raw.secondaryLine ?? "",
    passTypeLabel: raw.passTypeLabel ?? "VIP",
    qrUrl: raw.qrUrl ?? "",
    favorite: raw.favorite ?? false,
    rating: raw.rating ?? null,
    notes: raw.notes ?? "",
    tags: raw.tags ?? [],
    parentGenerationId: raw.parentGenerationId ?? null,
    variationBatchId: raw.variationBatchId ?? null,
    quality: raw.quality ?? DEFAULT_QUALITY,
    sourceArtworkPath: raw.sourceArtworkPath ?? "",
    frontImagePath: raw.frontImagePath ?? "",
    backImagePath: raw.backImagePath ?? "",
    thumbnailPath: raw.thumbnailPath ?? "",
    exportedCredentialPath: raw.exportedCredentialPath ?? null,
    exportZipPath: raw.exportZipPath ?? null,
  };
}

export function indexEntryFromManifest(m: ContentCreatorGenerationManifest): ContentCreatorGenerationIndexEntry {
  return {
    id: m.id,
    runId: m.runId,
    timestamp: m.timestamp,
    updatedAt: m.updatedAt,
    eraSlug: m.eraSlug,
    eraName: m.eraName,
    creativeDirection: m.creativeDirection,
    promptHash: m.promptHash,
    event: m.event,
    venue: m.venue,
    favorite: m.favorite,
    rating: m.rating,
    notes: m.notes,
    tags: m.tags,
    thumbnailPath: m.thumbnailPath,
    hasExport: Boolean(m.exportedCredentialPath || m.exportZipPath),
    parentGenerationId: m.parentGenerationId,
    variationBatchId: m.variationBatchId,
    quality: m.quality,
  };
}
