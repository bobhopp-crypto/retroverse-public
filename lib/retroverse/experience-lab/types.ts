import type { CollectorSongDna } from "@/lib/ops/studio/collector/song-dna-types";
import type { ParsedExperience } from "@/lib/retroverse/renderer/types";
import type { VisualLibrary } from "@/lib/retroverse/visual-library/types";

export const LAB_LAYOUTS = [
  { id: "magazine", label: "Magazine" },
  { id: "documentary", label: "Documentary" },
  { id: "performance", label: "Performance" },
  { id: "collector", label: "Collector" },
  { id: "timeline", label: "Timeline" },
  { id: "minimal", label: "Minimal" },
] as const;

export type LabLayoutId = (typeof LAB_LAYOUTS)[number]["id"];

export const RATING_METRICS = [
  { id: "readability", label: "Readability" },
  { id: "emotionalImpact", label: "Emotional impact" },
  { id: "fitsSong", label: "Fits the song" },
  { id: "fitsRetroverse", label: "Fits Retroverse" },
  { id: "worksInPub", label: "Works in a pub" },
  { id: "mobileFriendly", label: "Mobile friendliness" },
] as const;

export type RatingMetricId = (typeof RATING_METRICS)[number]["id"];

export type LayoutRatings = Partial<Record<RatingMetricId, number>>;

export type LabRatingsStore = Partial<Record<LabLayoutId, LayoutRatings>>;

export type ExperienceLabPayload = {
  experience: ParsedExperience;
  songDna: CollectorSongDna | null;
  visualLibrary: VisualLibrary | null;
};

export type LabSceneContext = {
  sceneIndex: number;
  sceneCount: number;
  allScenes: ParsedExperience["scenes"];
};
