import type { PromptQualityLevel } from "@/lib/creative/rvbr-prompt-types";
import type { CreativeDirectionId, CreativeDirectionSettings } from "@/lib/ops/content-creator/creative-direction";
import type { ContentArtifactType } from "@/lib/ops/content-creator/types";
import type { PassQrPlacement } from "@/lib/ops/creative-lab/types";

export type GenerationRating = 1 | 2 | 3 | 4 | 5;

export type GenerationStatus = "review" | "approved" | "production_ready" | "archived";

export type GenerationQualitySnapshot = {
  promptCharCount: number;
  variationScore: PromptQualityLevel;
  clicheRisk: PromptQualityLevel;
};

export type GenerationProductionSnapshot = {
  exportedAt: string | null;
  qrStatus: "not_exported" | "composited" | "scan_verified" | "failed";
  qrVerified: boolean;
  quantity: number | null;
  numberingMode: string | null;
  serialNumber: string | null;
  printPackagePaths: Record<string, unknown> | null;
};

export type GenerationTemplateMetadata = {
  isTemplate: boolean;
  templateName: string;
  templateNotes: string;
  sourceGenerationId: string | null;
  usedCount: number;
  lastUsedAt: string | null;
};

export type GenerationSourceSnapshot = {
  provider: string | null;
  visualWorldId: string | null;
  compositionSeed: number | null;
  serialNumber: string | null;
  resolvedArtifactArchetype: string | null;
};

export type GenerationPromptSnapshot = {
  promptHash: string;
  inspectorPath: string | null;
};

export type ContentCreatorGenerationManifest = {
  version: 3;
  id: string;
  runId: string;
  timestamp: string;
  updatedAt: string;
  status: GenerationStatus;
  statusUpdatedAt: string;
  approvedAt: string | null;
  archivedAt: string | null;
  archivedReason: string;
  eraSlug: string;
  eraName: string;
  artifact: ContentArtifactType;
  creativeDirection: CreativeDirectionId;
  creativeSettings: CreativeDirectionSettings;
  promptHash: string;
  event: string;
  venue: string;
  date: string;
  secondaryLine: string;
  passTypeLabel: string;
  qrUrl: string;
  qrPlacement?: PassQrPlacement;
  favorite: boolean;
  rating: GenerationRating | null;
  notes: string;
  tags: string[];
  collections: string[];
  template: GenerationTemplateMetadata;
  parentGenerationId: string | null;
  variationBatchId: string | null;
  quality: GenerationQualitySnapshot;
  production: GenerationProductionSnapshot;
  source: GenerationSourceSnapshot;
  prompt: GenerationPromptSnapshot;
  sourceArtworkPath: string;
  frontImagePath: string;
  backImagePath: string;
  thumbnailPath: string;
  exportedCredentialPath: string | null;
  exportZipPath: string | null;
};

export type ContentCreatorGenerationIndexEntry = {
  id: string;
  runId: string;
  timestamp: string;
  updatedAt: string;
  status: GenerationStatus;
  statusUpdatedAt: string;
  approvedAt: string | null;
  archivedAt: string | null;
  eraSlug: string;
  eraName: string;
  artifact: ContentArtifactType;
  creativeDirection: CreativeDirectionId;
  promptHash: string;
  event: string;
  venue: string;
  favorite: boolean;
  rating: GenerationRating | null;
  notes: string;
  tags: string[];
  collections: string[];
  template: GenerationTemplateMetadata;
  thumbnailPath: string;
  hasExport: boolean;
  parentGenerationId: string | null;
  variationBatchId: string | null;
  quality: GenerationQualitySnapshot;
  production: GenerationProductionSnapshot;
};

export type ContentCreatorLibraryIndex = {
  version: 3;
  updatedAt: string;
  generations: ContentCreatorGenerationIndexEntry[];
};

export type LibraryStats = {
  total: number;
  favorites: number;
  exports: number;
  archived: number;
  approved: number;
  productionReady: number;
  templates: number;
  byStatus: Record<GenerationStatus, number>;
  byCollection: Record<string, number>;
  byEra: Record<string, number>;
  byCreativeDirection: Record<string, number>;
};

export type GenerationCuratorPatch = {
  favorite?: boolean;
  rating?: GenerationRating | null;
  notes?: string;
  tags?: string[];
  status?: GenerationStatus;
  archivedReason?: string;
  collections?: string[];
  template?: Partial<GenerationTemplateMetadata>;
};
