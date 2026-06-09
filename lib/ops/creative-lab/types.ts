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

export type GeneratedPrompt = {
  id: string;
  module: CreativeLabModuleId;
  conceptSummary: string;
  structuredConcept: {
    event: string;
    venue: string;
    date: string;
    featuredYears: number[];
    theme: string;
    dominantStyles: Record<StyleCategory, { id: string; label: string; weight: number }[]>;
    module: CreativeLabModuleId;
  };
  createdAt: string;
};

export type GeneratedAsset = {
  id: string;
  module: CreativeLabModuleId;
  promptId: string;
  status: "placeholder" | "pending" | "generated";
  path?: string;
  selected: boolean;
  createdAt: string;
};

export type CreativeLabProjectFile = {
  version: 1;
  id: string;
  name: string;
  event: string;
  venue: string;
  date: string;
  featuredYears: number[];
  theme: string;
  styleSelection: StyleSelection;
  generatedPrompts: GeneratedPrompt[];
  generatedAssets: GeneratedAsset[];
  selectedAssetIds: string[];
  activeModule: CreativeLabModuleId;
  createdAt: string;
  updatedAt: string;
};

export type CreativeLabPresetFile = {
  version: 1;
  id: string;
  name: string;
  description: string;
  styleSelection: StyleSelection;
  createdAt: string;
  updatedAt: string;
};

export type CreativeLabIndexFile = {
  version: 1;
  projects: Array<{
    id: string;
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
