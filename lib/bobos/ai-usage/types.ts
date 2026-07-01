/** BobOS AI Usage v0.1 — manual cost/credit tracker. Local only, no billing APIs. */

export const AI_USAGE_PROVIDERS = ["Cursor", "ChatGPT", "v0", "Ollama", "ComfyUI", "Other"] as const;
export type AiUsageProvider = (typeof AI_USAGE_PROVIDERS)[number];

export const AI_USAGE_WORKFLOWS = [
  "Homepage",
  "Pass Studio",
  "Registration",
  "Song Packages",
  "Finance",
  "Marketplace",
  "Other",
] as const;
export type AiUsageWorkflow = (typeof AI_USAGE_WORKFLOWS)[number];

/** Suggested values only — field stays free text. */
export const AI_USAGE_TOOL_SUGGESTIONS = ["Sonnet 5", "Composer Fast", "GPT", "Local model"] as const;
export const AI_USAGE_OUTCOME_SUGGESTIONS = ["Shipped", "Useful", "Wasted", "Abandoned"] as const;
export const AI_USAGE_MODE_SUGGESTIONS = ["Agent", "Chat", "Background", "Auto"] as const;

export type AiUsageEntry = {
  id: string;
  date: string;
  provider: AiUsageProvider;
  tool: string;
  workflow: AiUsageWorkflow;
  mode: string;
  costDollars: number;
  creditsUsed: number;
  notes: string;
  outcome: string;
  createdAt: string;
};

export type AiUsageFile = {
  version: 1;
  entries: AiUsageEntry[];
};

export type NewAiUsageEntryInput = {
  date: string;
  provider: AiUsageProvider;
  tool: string;
  workflow: AiUsageWorkflow;
  mode: string;
  costDollars: number;
  creditsUsed: number;
  notes: string;
  outcome: string;
};
