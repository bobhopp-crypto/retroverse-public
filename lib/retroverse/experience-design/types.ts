import type { LabLayoutId } from "@/lib/retroverse/experience-lab/types";
import type { VisualStyleId } from "@/lib/retroverse/visual-assets/types";

export type PublicationId =
  | "billboard"
  | "rolling_stone"
  | "creem"
  | "tv_guide"
  | "concert_program"
  | "album_liner"
  | "mtv"
  | "record_store_card"
  | "fan_club"
  | "newspaper_entertainment"
  | "music_trade";

export type SceneImportanceLevel = "low" | "medium" | "high" | "hero";

export type ScenePresentationMode =
  | "default"
  | "merge"
  | "split"
  | "fullscreen"
  | "gallery"
  | "minimal"
  | "quote";

export type SceneOverride = {
  importance: SceneImportanceLevel;
  presentation: ScenePresentationMode;
};

export type DesignWorkspaceId =
  | "publication"
  | "derived_visual"
  | "scene_importance"
  | "story_flow"
  | "visual_library";

export type PublicationTypography =
  | "editorial_serif"
  | "bold_sans"
  | "condensed_sans"
  | "display_sans"
  | "monospace_label";

export type PublicationDefinition = {
  id: PublicationId;
  name: string;
  typography: PublicationTypography;
  spacingScale: number;
  framing: "bleed" | "mat" | "bordered" | "card" | "column";
  headlineTreatment: "masthead" | "banner" | "stacked" | "centered" | "italic_deck";
  captionStyle: "below" | "overlay" | "sidebar" | "credit";
  cardStyle: "flat" | "framed" | "ticket" | "sleeve" | "newsprint";
  backgroundTexture: "paper" | "newsprint" | "gloss" | "scanline" | "flat";
  preferredLayout: LabLayoutId;
  dnaAffinities: string[];
  description: string;
};

export const OPERATOR_FEEDBACK_TAGS = [
  { id: "amazing", label: "Amazing" },
  { id: "good", label: "Good" },
  { id: "neutral", label: "Neutral" },
  { id: "too_busy", label: "Too Busy" },
  { id: "too_much_text", label: "Too Much Text" },
  { id: "wrong_mood", label: "Wrong Mood" },
  { id: "great_hero", label: "Great Hero" },
  { id: "weak_ending", label: "Weak Ending" },
  { id: "beautiful", label: "Beautiful" },
  { id: "forgettable", label: "Forgettable" },
] as const;

export type OperatorFeedbackId = (typeof OPERATOR_FEEDBACK_TAGS)[number]["id"];

export type DesignStudioSnapshot = {
  publicationId: PublicationId;
  derivedStyleId: VisualStyleId | null;
  sceneOrder: number[];
  sceneOverrides: Record<number, SceneOverride>;
  favoriteStyleIds: VisualStyleId[];
};

export type OperatorFeedbackStore = Partial<Record<OperatorFeedbackId, boolean>>;
