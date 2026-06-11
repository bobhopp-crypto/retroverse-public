import type { PromptQualityLevel } from "@/lib/creative/rvbr-prompt-types";
import type { CreativeDirectionId, CreativeDirectionSettings } from "@/lib/ops/content-creator/creative-direction";
import type { ContentArtifactType } from "@/lib/ops/content-creator/types";

export type GenerationRating = 1 | 2 | 3 | 4 | 5;

export type GenerationQualitySnapshot = {
  promptCharCount: number;
  variationScore: PromptQualityLevel;
  clicheRisk: PromptQualityLevel;
};

export type ContentCreatorGenerationManifest = {
  version: 2;
  id: string;
  runId: string;
  timestamp: string;
  updatedAt: string;
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
  favorite: boolean;
  rating: GenerationRating | null;
  notes: string;
  tags: string[];
  parentGenerationId: string | null;
  variationBatchId: string | null;
  quality: GenerationQualitySnapshot;
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
  eraSlug: string;
  eraName: string;
  creativeDirection: CreativeDirectionId;
  promptHash: string;
  event: string;
  venue: string;
  favorite: boolean;
  rating: GenerationRating | null;
  notes: string;
  tags: string[];
  thumbnailPath: string;
  hasExport: boolean;
  parentGenerationId: string | null;
  variationBatchId: string | null;
  quality: GenerationQualitySnapshot;
};

export type ContentCreatorLibraryIndex = {
  version: 2;
  updatedAt: string;
  generations: ContentCreatorGenerationIndexEntry[];
};

export type LibraryStats = {
  total: number;
  favorites: number;
  exports: number;
  byEra: Record<string, number>;
  byCreativeDirection: Record<string, number>;
};

export type GenerationCuratorPatch = {
  favorite?: boolean;
  rating?: GenerationRating | null;
  notes?: string;
  tags?: string[];
};
