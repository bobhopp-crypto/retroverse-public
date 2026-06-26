/**
 * Editor — frozen contracts for downstream departments.
 *
 * Director consumes `DirectorEditorialPackage` — never workspace or Collector raw data.
 */

export { EDITOR_STORY_VERSION, DIRECTOR_EDITORIAL_VERSION } from "@/lib/studio/package";

export type {
  ApprovedCard,
  ApprovedFact,
  ApprovedImage,
  ApprovedQuote,
  DirectorEditorialPackage,
  EditorApprovedLayer,
  EditorEditorialStatus,
  EditorHandoffChecklist,
  EditorPackageMeta,
  EditorPerformanceStory,
  EditorStoryNarrative,
  EditorStoryPackage,
  EditorWorkspace,
  KeyMoment,
  NarrativeBlueprint,
  PerformanceScreenshot,
  PerformanceWorkspace,
  StoryBeat,
  StoryIdea,
  ThemeId,
  EmotionalArcId,
  RecommendedPace,
} from "./types";
