import type { RenderSpecScene } from "@/lib/retroverse/renderer/types";

/** Presentation moment — one primary idea per composed scene. */
export const MOMENT_TYPES = [
  "hero_moment",
  "big_quote",
  "did_you_know",
  "performance_spotlight",
  "visual_break",
  "timeline_beat",
  "chart_milestone",
  "behind_the_song",
  "legacy_moment",
  "final_reflection",
  "pause_moment",
] as const;

export type MomentType = (typeof MOMENT_TYPES)[number];

export const MOMENT_TYPE_LABELS: Record<MomentType, string> = {
  hero_moment: "Hero Moment",
  big_quote: "Big Quote",
  did_you_know: "Did You Know?",
  performance_spotlight: "Performance Spotlight",
  visual_break: "Visual Break",
  timeline_beat: "Timeline Beat",
  chart_milestone: "Chart Milestone",
  behind_the_song: "Behind the Song",
  legacy_moment: "Legacy Moment",
  final_reflection: "Final Reflection",
  pause_moment: "Pause Moment",
};

export type VisualIntensity = "low" | "medium" | "high";

export type ComposedScene = RenderSpecScene & {
  momentType: MomentType;
  momentLabel: string;
  sourceSceneNumbers: number[];
  visualIntensity: VisualIntensity;
  composeReason: string;
};

export type PacingProfileId =
  | "slow_build"
  | "steady"
  | "accelerating"
  | "high_energy"
  | "reflective"
  | "concert"
  | "documentary"
  | "magazine";

export const PACING_PROFILE_LABELS: Record<PacingProfileId, string> = {
  slow_build: "Slow Build",
  steady: "Steady",
  accelerating: "Accelerating",
  high_energy: "High Energy",
  reflective: "Reflective",
  concert: "Concert",
  documentary: "Documentary",
  magazine: "Magazine",
};

export type PacingProfile = {
  id: PacingProfileId;
  label: string;
  reason: string;
};

export type SceneCompositionStats = {
  originalSceneCount: number;
  composedSceneCount: number;
  avgWordsPerSceneOriginal: number;
  avgWordsPerSceneComposed: number;
  avgFactsPerSceneOriginal: number;
  avgFactsPerSceneComposed: number;
  imageSlotsOriginal: number;
  imageSlotsComposed: number;
};

export type CompositionTransform = {
  kind: "split" | "merge" | "elevate" | "isolate" | "reorder";
  description: string;
  sourceScenes: number[];
};

export type SceneCompositionResult = {
  originalScenes: RenderSpecScene[];
  composedScenes: ComposedScene[];
  pacingProfile: PacingProfile;
  stats: SceneCompositionStats;
  transforms: CompositionTransform[];
};
