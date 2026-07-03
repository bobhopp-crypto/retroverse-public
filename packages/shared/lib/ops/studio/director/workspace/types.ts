import type { CollectorPackage } from "@/lib/ops/studio/collector/types";
import type { DirectorPackage } from "@/lib/ops/studio/director/types";
import type { DirectorStoryPlan } from "@/lib/ops/studio/director/storytelling/types";
import type { EditorStoryPackage } from "@/lib/ops/studio/editor/types";
import type { PackageStageAssessment } from "@/lib/ops/studio/production/package-stage";
import type { PublisherRecord } from "@/lib/ops/studio/publisher/types";

export type InventoryItem = {
  id: string;
  label: string;
  available: boolean;
  detail: string;
};

export type EditorFactRow = {
  label: string;
  value: string;
};

export type ExperienceCatalogStatus =
  | "available"
  | "unavailable"
  | "already_generated"
  | "needs_source_data"
  | "needs_ai"
  | "generated"
  | "published";

export type ExperienceCatalogCard = {
  id: string;
  label: string;
  category: string;
  status: ExperienceCatalogStatus;
  statusLabel: string;
  reason: string;
  source: "template" | "exhibit" | "extension";
};

export type BlueprintExperience = {
  id: string;
  label: string;
  action: "selected" | "skipped";
  reason: string;
};

export type PreviewCard = {
  id: string;
  label: string;
  headline: string;
  subtitle: string;
  template: string;
  durationSec: number | null;
  href: string | null;
  warnings?: string[];
  wireframeIcon?: string;
  wireframeLabel?: string;
  experienceType?: string;
  mood?: string;
  visualPriority?: number;
  paletteChips?: string[];
  cameraIcon?: string;
  cameraLabel?: string;
  motionIcon?: string;
  motionLabel?: string;
  layoutType?: string;
  texture?: string;
};

export type PreviewChapter = {
  storyId: string;
  title: string;
  warnings: string[];
  pages: PreviewCard[];
};

export type ReviewDepartment = {
  id: "collector" | "editor" | "director" | "publisher";
  label: string;
  status: "approved" | "needs_review" | "waiting" | "blocked";
  statusLabel: string;
};

export type DirectorWorkspaceSnapshot = {
  rvtr: string;
  artist: string;
  title: string;
  coverUrl: string | null;
  album: string | null;
  year: number | null;
  packageStatus: string;
  currentStage: string;
  completionPct: number;
  stage: PackageStageAssessment;
  collector: CollectorPackage | null;
  editor: EditorStoryPackage | null;
  director: DirectorPackage | null;
  publisher: PublisherRecord | null;
  storyPlan: DirectorStoryPlan | null;
  inventory: InventoryItem[];
  editorFacts: EditorFactRow[];
  editorWarnings: string[];
  experienceCatalog: ExperienceCatalogCard[];
  blueprint: {
    selected: BlueprintExperience[];
    skipped: BlueprintExperience[];
    estimatedPages: number;
    estimatedRuntimeSec: number;
    estimatedAiCalls: number;
  };
  previews: PreviewCard[];
  previewChapters: PreviewChapter[];
  review: {
    departments: ReviewDepartment[];
    warnings: string[];
  };
  generatedAt: string;
};
