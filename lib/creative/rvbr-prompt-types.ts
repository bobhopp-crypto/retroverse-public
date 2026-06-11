import type { PromptMetrics } from "@/lib/creative/prompt-metrics";

export type { PromptMetrics } from "@/lib/creative/prompt-metrics";

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

/** Compressed 5-layer breakdown — each concept appears exactly once. */
export type PromptDebugBreakdown = {
  artifactArchetype: PromptLayer;
  eraProfile: PromptLayer;
  brandRules: PromptLayer;
  directionRules: PromptLayer;
  governedText: PromptLayer;
};

export type ComposedRvbrPrompt = {
  finalPrompt: string;
  debugBreakdown: PromptDebugBreakdown;
  qualityScores: PromptQualityScores;
  promptMetrics: PromptMetrics;
};
