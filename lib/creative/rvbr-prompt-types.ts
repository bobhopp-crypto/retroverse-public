export type PromptSide = "front" | "back";

export type PromptLayer = {
  id: string;
  label: string;
  content: string;
};

export type PromptQualityLevel = "low" | "medium" | "high";

export type PromptQualityScores = {
  eraSpecificity: PromptQualityLevel;
  brandSpecificity: PromptQualityLevel;
  variationScore: PromptQualityLevel;
  clicheRisk: PromptQualityLevel;
};

export type PromptDebugBreakdown = {
  basePrompt: PromptLayer;
  artifactArchetype: PromptLayer;
  eraProfile: PromptLayer;
  brandRules: PromptLayer;
  directionRules: PromptLayer;
  physicalEphemera: PromptLayer;
  antiClicheRules: PromptLayer;
  antiRepetition: PromptLayer;
  layoutRules: PromptLayer;
  eventData: PromptLayer;
  rvbrMandate: PromptLayer;
};

export type ComposedRvbrPrompt = {
  finalPrompt: string;
  debugBreakdown: PromptDebugBreakdown;
  qualityScores: PromptQualityScores;
};
