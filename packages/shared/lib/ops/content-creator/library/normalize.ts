import { DEFAULT_CREATIVE_DIRECTION_SETTINGS } from "@/lib/ops/content-creator/creative-direction";
import { normalizeQrPlacement } from "@/lib/ops/creative-lab/pass-layout";

import type {
  ContentCreatorGenerationIndexEntry,
  ContentCreatorGenerationManifest,
  GenerationProductionSnapshot,
  GenerationPromptSnapshot,
  GenerationSourceSnapshot,
  GenerationStatus,
  GenerationTemplateMetadata,
} from "./types";

const DEFAULT_QUALITY = {
  promptCharCount: 0,
  variationScore: "medium" as const,
  clicheRisk: "medium" as const,
};

const DEFAULT_STATUS: GenerationStatus = "review";

const DEFAULT_PRODUCTION: GenerationProductionSnapshot = {
  exportedAt: null,
  qrStatus: "not_exported",
  qrVerified: false,
  quantity: null,
  numberingMode: null,
  serialNumber: null,
  printPackagePaths: null,
};

const DEFAULT_TEMPLATE: GenerationTemplateMetadata = {
  isTemplate: false,
  templateName: "",
  templateNotes: "",
  sourceGenerationId: null,
  usedCount: 0,
  lastUsedAt: null,
};

const DEFAULT_SOURCE: GenerationSourceSnapshot = {
  provider: null,
  visualWorldId: null,
  compositionSeed: null,
  serialNumber: null,
  resolvedArtifactArchetype: null,
};

const DEFAULT_PROMPT: GenerationPromptSnapshot = {
  promptHash: "",
  inspectorPath: null,
};

function normalizeStatus(raw: Partial<ContentCreatorGenerationManifest>): GenerationStatus {
  if (
    raw.status === "review" ||
    raw.status === "approved" ||
    raw.status === "production_ready" ||
    raw.status === "archived"
  ) {
    return raw.status;
  }
  return DEFAULT_STATUS;
}

/** Upgrade v1 manifests and fill curator defaults. */
export function normalizeGenerationManifest(
  raw: Partial<ContentCreatorGenerationManifest> & { id: string },
): ContentCreatorGenerationManifest {
  const status = normalizeStatus(raw);
  const promptHash = raw.promptHash ?? raw.prompt?.promptHash ?? "";
  const exported = Boolean(raw.exportedCredentialPath || raw.exportZipPath);
  return {
    version: 3,
    id: raw.id,
    runId: raw.runId ?? raw.id,
    timestamp: raw.timestamp ?? new Date().toISOString(),
    updatedAt: raw.updatedAt ?? raw.timestamp ?? new Date().toISOString(),
    status,
    statusUpdatedAt: raw.statusUpdatedAt ?? raw.updatedAt ?? raw.timestamp ?? new Date().toISOString(),
    approvedAt: raw.approvedAt ?? null,
    archivedAt: raw.archivedAt ?? null,
    archivedReason: raw.archivedReason ?? "",
    eraSlug: raw.eraSlug ?? "",
    eraName: raw.eraName ?? "",
    artifact: raw.artifact ?? "pass",
    creativeDirection: raw.creativeDirection ?? DEFAULT_CREATIVE_DIRECTION_SETTINGS.creativeDirection,
    creativeSettings: raw.creativeSettings ?? DEFAULT_CREATIVE_DIRECTION_SETTINGS,
    promptHash,
    event: raw.event ?? "",
    venue: raw.venue ?? "",
    date: raw.date ?? "",
    secondaryLine: raw.secondaryLine ?? "",
    passTypeLabel: raw.passTypeLabel ?? "VIP",
    qrUrl: raw.qrUrl ?? "",
    qrPlacement: normalizeQrPlacement(raw.qrPlacement),
    favorite: raw.favorite ?? false,
    rating: raw.rating ?? null,
    notes: raw.notes ?? "",
    tags: raw.tags ?? [],
    collections: raw.collections ?? [],
    template: { ...DEFAULT_TEMPLATE, ...raw.template },
    parentGenerationId: raw.parentGenerationId ?? null,
    variationBatchId: raw.variationBatchId ?? null,
    quality: raw.quality ?? DEFAULT_QUALITY,
    production: {
      ...DEFAULT_PRODUCTION,
      qrStatus: exported ? "composited" : "not_exported",
      ...raw.production,
    },
    source: { ...DEFAULT_SOURCE, ...raw.source },
    prompt: { ...DEFAULT_PROMPT, promptHash, ...raw.prompt },
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
    status: m.status,
    statusUpdatedAt: m.statusUpdatedAt,
    approvedAt: m.approvedAt,
    archivedAt: m.archivedAt,
    eraSlug: m.eraSlug,
    eraName: m.eraName,
    artifact: m.artifact,
    creativeDirection: m.creativeDirection,
    promptHash: m.promptHash,
    event: m.event,
    venue: m.venue,
    favorite: m.favorite,
    rating: m.rating,
    notes: m.notes,
    tags: m.tags,
    collections: m.collections,
    template: m.template,
    thumbnailPath: m.thumbnailPath,
    hasExport: Boolean(m.exportedCredentialPath || m.exportZipPath),
    parentGenerationId: m.parentGenerationId,
    variationBatchId: m.variationBatchId,
    quality: m.quality,
    production: m.production,
  };
}
