import type { IdentifiedText } from "@/lib/ops/studio/model-identity";

export type StudioGuidePageId =
  | "dashboard"
  | "mission-control"
  | "collector"
  | "editor"
  | "director"
  | "publisher";

export type GuideListItem = IdentifiedText;

export type PipelineStageId = "collector" | "editor" | "director" | "publisher" | "renderer";

export type GlossaryEntry = {
  term: string;
  definition: string;
};

export type MetricTooltip = {
  label: string;
  meaning: string;
  whyItMatters: string;
  goodValue: string;
};

/** Raw guide config — string lists normalized to GuideListItem at read time. */
export type PageGuideDefinition = {
  id: StudioGuidePageId;
  title: string;
  purpose: string;
  primaryWorkflow: string;
  typicalActions: string[];
  relatedDepartments: string[];
  expectedOutputs: string[];
  commonProblems: string[];
  checkFrequency?: string;
  actionRequiredWhen?: string;
};

export type PageGuide = Omit<
  PageGuideDefinition,
  "typicalActions" | "expectedOutputs" | "commonProblems"
> & {
  typicalActions: GuideListItem[];
  expectedOutputs: GuideListItem[];
  commonProblems: GuideListItem[];
};

export type DepartmentContextDefinition = {
  department: StudioGuidePageId;
  inputs: string[];
  outputs: string[];
  nextDepartment: string;
};

export type DepartmentContext = Omit<DepartmentContextDefinition, "inputs" | "outputs"> & {
  inputs: GuideListItem[];
  outputs: GuideListItem[];
};

export type AnnotatedCardGuide = {
  title: string;
  purpose: string;
  monitors: string;
  checkFrequency: string;
  actionRequired: string;
};

export type TourStep = {
  target: string;
  title: string;
  body: string;
};

export type EmptyStateGuide = {
  title: string;
  explanation: string;
  recommendedAction: string;
  actionHref?: string;
  actionLabel?: string;
};

export type SmartRecommendationId =
  | "needs-collector"
  | "needs-story-review"
  | "missing-performance"
  | "low-patron-value"
  | "ready-for-publisher"
  | "ready-to-render"
  | "needs-editor"
  | "needs-director"
  | "needs-identity"
  | "needs-research";

export type SmartRecommendation = {
  id: SmartRecommendationId;
  headline: string;
  action: string;
  actionHref?: string;
  actionLabel?: string;
};
