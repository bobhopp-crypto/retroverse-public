import type { PublicationId } from "@/lib/retroverse/experience-design/types";
import type { VisualStyleId } from "@/lib/retroverse/visual-assets/types";

/** Visual Library package version. */
export const VISUAL_LIBRARY_VERSION = 1 as const;

/** Asset tier controls approved derived-asset budget. */
export type VisualLibraryTier = "ordinary" | "video" | "curated" | "showcase";

/** Storytelling coverage roles — judged by role, not image count. */
export type CoverageRole =
  | "hero"
  | "performance"
  | "recording"
  | "television"
  | "studio"
  | "chart"
  | "album"
  | "artist"
  | "reflection"
  | "closing"
  | "quote"
  | "timeline";

export type CoverageStatus = "missing" | "recommended" | "generated" | "approved";

export type DerivedAssetStatus = "recommended" | "generated" | "approved" | "rejected";

export type ShotType =
  | "hero"
  | "performance"
  | "close_up"
  | "alternate"
  | "wide"
  | "crowd"
  | "unknown";

/** Extracted performance frame in the visual library. */
export type LibraryPerformanceFrame = {
  id: string;
  filename: string;
  imageUrl: string;
  timestampSec: number | null;
  qualityScore: number;
  detectedSubjects: string[];
  dominantColors: string[];
  shotType: ShotType;
  performanceId: string | null;
  category: string | null;
  approved: boolean;
};

/** Derived artwork entry — metadata only until generation ships. */
export type LibraryDerivedAsset = {
  id: string;
  sourceFrameId: string;
  style: VisualStyleId;
  styleName: string;
  prompt: string;
  status: DerivedAssetStatus;
  preferredSceneTypes: string[];
  publicationAffinity: PublicationId | null;
  storagePath: string | null;
};

export type CoverageItem = {
  role: CoverageRole;
  status: CoverageStatus;
  satisfiedBy: string[];
  notes: string;
};

export type DuplicatePairRecommendation = {
  frameAId: string;
  frameBId: string;
  frameALabel: string;
  frameBLabel: string;
  similarityPercent: number;
  keepFrameId: string;
  discardFrameId: string;
  reason: string;
};

export type AssetBudget = {
  tier: VisualLibraryTier;
  approvedLimit: number;
  approvedCount: number;
  generatedCount: number;
  recommendedCount: number;
  remainingApproved: number;
  atLimit: boolean;
};

export type VisualRecommendation = {
  id: string;
  role: CoverageRole;
  kind: "use_existing" | "generate_derived" | "extract_frame";
  priority: number;
  reason: string;
  suggestedStyle: VisualStyleId | null;
  sourceFrameId: string | null;
  existingAssetIds: string[];
};

/** Future generation queue entry — contract only, no execution. */
export type GenerationQueueItem = {
  id: string;
  generatorId: VisualGeneratorId;
  sourceFrameId: string;
  style: VisualStyleId | null;
  status: "queued" | "running" | "complete" | "failed";
  createdAt: string;
};

/** Future generator identifiers — contracts only. */
export type VisualGeneratorId =
  | "frame_stylizer"
  | "poster_generator"
  | "magazine_illustration"
  | "album_painting"
  | "blueprint"
  | "comic"
  | "sketch";

export type VisualLibrary = {
  version: typeof VISUAL_LIBRARY_VERSION;
  rvtr: string;
  tier: VisualLibraryTier;
  generatedAt: string;
  performanceFrames: LibraryPerformanceFrame[];
  derivedAssets: LibraryDerivedAsset[];
  coverage: CoverageItem[];
  duplicateSuggestions: DuplicatePairRecommendation[];
  budget: AssetBudget;
  recommendations: VisualRecommendation[];
  generationQueue: GenerationQueueItem[];
};

export type VisualLibraryBuildInput = {
  rvtr: string;
  /** Optional persisted library — merged for derived asset status. */
  persisted?: VisualLibrary | null;
};
