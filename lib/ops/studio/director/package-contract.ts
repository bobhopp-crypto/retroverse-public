/**
 * Director 0.2 — frozen contract.
 *
 * Reads `DirectorEditorialPackage` via director-handoff artifact only — never Collector.
 */

export { DIRECTOR_PLAN_VERSION, DIRECTOR_RENDER_SPEC_VERSION } from "@/lib/studio/package";

export type { StudioContractDepartmentId, DepartmentContract } from "@/lib/studio/contract";

export type {
  DirectorPackage,
  DirectorReadiness,
  DirectorReview,
  ExperiencePlan,
  ExperienceScene,
  LayoutReadinessStatus,
  PresentationStyle,
  SceneTemplateRecommendation,
  SceneType,
  TemplateUsageStat,
  VisualRhythm,
  SceneTemplateId,
  SceneTemplateDefinition,
} from "./types";

export {
  SCENE_TEMPLATE_LIBRARY,
  getSceneTemplate,
  allSceneTemplateIds,
} from "./scene-template-library";

export { buildExperiencePlan } from "./experience-plan";
export { applySceneTemplates } from "./apply-scene-templates";
export { selectSceneTemplate, assessLayoutReadiness } from "./template-selection";
export { buildDirectorReview } from "./review";
export { runDirectorOnHandoff } from "./run-director";
