import type { PromptMetrics } from "@/lib/creative/prompt-metrics";

export type { PromptMetrics } from "@/lib/creative/prompt-metrics";

export type PromptSide = "front" | "back";

/**
 * Style directive — the strongest instruction in a composed prompt. Style dominates
 * composition and design language; Color Scheme dominates palette. When present, it
 * outranks era styling and event information.
 */
export type RvbrStyleDirective = {
  styleLabel: string;
  styleDirection: string;
  colorSchemeLabel: string;
  colorSchemeDirection: string;
};

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
