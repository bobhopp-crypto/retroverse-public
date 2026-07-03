/** Prompt size targets — one-screen creative brief, not a legal document. */

/** ~60–75% compression target vs pre-compression prompts (~8–12k chars). */
export const PROMPT_TARGET_CHAR_COUNT = 2800;

export const PROMPT_TARGET_TOKEN_ESTIMATE = Math.round(PROMPT_TARGET_CHAR_COUNT / 4);

export type PromptMetrics = {
  charCount: number;
  tokenEstimate: number;
  targetCharCount: number;
  targetTokenEstimate: number;
};

export function estimatePromptTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function buildPromptMetrics(finalPrompt: string): PromptMetrics {
  return {
    charCount: finalPrompt.length,
    tokenEstimate: estimatePromptTokens(finalPrompt),
    targetCharCount: PROMPT_TARGET_CHAR_COUNT,
    targetTokenEstimate: PROMPT_TARGET_TOKEN_ESTIMATE,
  };
}
