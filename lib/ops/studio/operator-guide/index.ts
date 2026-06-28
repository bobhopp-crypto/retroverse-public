export type { StudioGuidePageId, PipelineStageId, SmartRecommendation } from "./types";
export { STUDIO_GLOSSARY, glossaryTerm } from "./glossary";
export { METRIC_TOOLTIPS, getMetricTooltip } from "./metric-tooltips";
export {
  ANNOTATED_CARDS,
  DEPARTMENT_CONTEXT,
  GUIDED_TOURS,
  PAGE_GUIDES,
  getAnnotatedCard,
  getDepartmentContext,
  getPageGuide,
  getTourSteps,
} from "./page-guides";
export {
  SMART_RECOMMENDATIONS,
  getSmartRecommendation,
  recommendationFromNextAction,
  recommendationFromStudioFlags,
} from "./recommendations";
