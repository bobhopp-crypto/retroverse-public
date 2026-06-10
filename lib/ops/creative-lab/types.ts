import type { ArtifactTypeId } from "./artifact-types";
import type { ArtDirectionId } from "./art-directions";

/** Reusable style system — structured data, not prompt text. */

export type StyleCategory = "credential" | "illustration" | "color" | "density";

export type CreativeLabModuleId =
  | "pass-lab"
  | "poster-lab"
  | "bumper-lab"
  | "card-lab"
  | "magazine-lab";

export type StyleDefinition = {
  id: string;
  label: string;
  description: string;
  category: StyleCategory;
};

export type WeightedStyle = {
  id: string;
  weight: number;
};

export type StyleSelection = {
  credential: WeightedStyle[];
  illustration: WeightedStyle[];
  color: WeightedStyle[];
  density: WeightedStyle[];
};

export type ConceptVariationKey = "A" | "B" | "C" | "D";

export type ConceptStrategyId =
  | "credential-focus"
  | "collector-focus"
  | "broadcast-focus"
  | "festival-focus";

export type ConceptStrategyMap = Record<ConceptVariationKey, ConceptStrategyId>;

export type RefinementVariation = {
  id: string;
  index: number;
  treatmentId: string;
  treatmentLabel: string;
  parentPromptId: string;
  artDirectionId: ArtDirectionId;
  /** Generated PNG asset for this refinement */
  assetId?: string;
  /** @deprecated Legacy layout treatments */
  layoutId?: string;
  /** @deprecated Kept for prompt renderer compatibility */
  strategyId?: ConceptStrategyId;
  createdAt: string;
};

export type GeneratedPrompt = {
  id: string;
  module: CreativeLabModuleId;
  conceptSummary: string;
  /** Human-readable provider-neutral prompt text. */
  renderedPrompt: string;
  /** A/B/C/D variation label when part of a variation set. */
  variationKey?: ConceptVariationKey;
  /** Groups Concept A–D generated together. */
  variationSetId?: string;
  /** Linked generated PNG asset */
  assetId?: string;
  /** Concept strategy template used for this variation. */
  strategyId?: ConceptStrategyId;
  structuredConcept: {
    event: string;
    venue: string;
    date: string;
    featuredYears: number[];
    theme: string;
    artifactType?: ArtifactTypeId;
    influenceTags?: string[];
    dominantStyles: Record<StyleCategory, { id: string; label: string; weight: number }[]>;
    module: CreativeLabModuleId;
    variationKey?: ConceptVariationKey;
    strategyId?: ConceptStrategyId;
  };
  createdAt: string;
};

export type CreativeLabAssetType =
  | "pass-front"
  | "pass-back"
  | "poster"
  | "bumper"
  | "credential"
  | "card"
  | "magazine";

export type CreativeLabAssetStatus = "generated" | "approved" | "rejected" | "final";

export type FinalAssetSlot = "final-front" | "final-back" | "final-poster" | "final-bumper";

export const FINAL_ASSET_SLOTS: FinalAssetSlot[] = [
  "final-front",
  "final-back",
  "final-poster",
  "final-bumper",
];

export const FINAL_SLOT_LABELS: Record<FinalAssetSlot, string> = {
  "final-front": "Final Front",
  "final-back": "Final Back",
  "final-poster": "Final Poster",
  "final-bumper": "Final Bumper",
};

/** Project asset — placeholder or future generated image. */
export type CreativeLabAsset = {
  /** asset_id */
  id: string;
  /** project_id */
  projectId: string;
  type: CreativeLabAssetType;
  concept?: ConceptVariationKey;
  status: CreativeLabAssetStatus;
  createdAt: string;
  /** Relative path under project folder */
  filePath?: string;
  notes?: string;
  promptId?: string;
  module?: CreativeLabModuleId;
  strategyId?: ConceptStrategyId;
};

/** @deprecated Use CreativeLabAsset */
export type GeneratedAsset = CreativeLabAsset;

export type CreativeLabProjectFile = {
  version: 2;
  id: string;
  /** Filesystem folder name under projects/ */
  folderSlug: string;
  name: string;
  event: string;
  venue: string;
  date: string;
  featuredYears: number[];
  theme: string;
  styleSelection: StyleSelection;
  /** Last applied built-in or custom preset id. */
  activePresetId?: string;
  /** Concept A–D strategy map — from preset or custom. */
  conceptStrategies?: ConceptStrategyMap;
  /** Deliverable artifact type — VIP pass, festival pass, etc. */
  artifactType?: ArtifactTypeId;
  /** Winning concept prompt id — selected via USE THIS LOOK */
  selectedConceptPromptId?: string | null;
  /** Winning concept key A–D */
  selectedConceptKey?: ConceptVariationKey | null;
  /** Winning art direction — psychedelic, cartoon, television, collector */
  selectedArtDirectionId?: ArtDirectionId | null;
  /** Workflow round: 1 concept pick, 2 variation pick, 3 asset gen */
  workflowRound?: 1 | 2 | 3;
  /** Round 2 refinement variations generated from winner */
  refinementGenerated?: boolean;
  refinementVariations?: RefinementVariation[];
  /** Winning refinement index 1–8 */
  selectedVariationIndex?: number | null;
  /** @deprecated Use refinementVariations — kept for legacy projects */
  mockVariationRound?: number;
  generatedPrompts: GeneratedPrompt[];
  assets: CreativeLabAsset[];
  /** One winner per deliverable slot */
  finalAssetSlots: Record<FinalAssetSlot, string | null>;
  activeModule: CreativeLabModuleId;
  createdAt: string;
  updatedAt: string;
};

export type CreativeLabPresetFile = {
  version: 2;
  id: string;
  name: string;
  description: string;
  builtin?: boolean;
  credentialStyle: string;
  illustrationStyle: string;
  colorStyle: string;
  densityStyle: string;
  defaultConceptStrategy: ConceptStrategyId;
  conceptStrategies: ConceptStrategyMap;
  styleSelection: StyleSelection;
  createdAt: string;
  updatedAt: string;
};

export type CreativeLabIndexFile = {
  version: 1;
  projects: Array<{
    id: string;
    folderSlug: string;
    name: string;
    event: string;
    updatedAt: string;
  }>;
};

export const CREATIVE_LAB_MODULES: Array<{
  id: CreativeLabModuleId;
  label: string;
  description: string;
  available: boolean;
}> = [
  {
    id: "pass-lab",
    label: "Pass Lab",
    description: "Event credentials, laminates, and ticket-stub concepts.",
    available: true,
  },
  {
    id: "poster-lab",
    label: "Poster Lab",
    description: "Show posters and promotional print layouts.",
    available: false,
  },
  {
    id: "bumper-lab",
    label: "Bumper Lab",
    description: "Broadcast bumpers and interstitial graphics.",
    available: false,
  },
  {
    id: "card-lab",
    label: "Card Lab",
    description: "Collector cards and trading-card layouts.",
    available: false,
  },
  {
    id: "magazine-lab",
    label: "Magazine Lab",
    description: "Magazine covers and editorial spreads.",
    available: false,
  },
];
