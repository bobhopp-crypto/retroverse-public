import type { ArtworkGenerateOptions, ArtworkGenerateResult, ArtworkPromptContext } from "./types";

/** Stub — Gemini artwork generation deferred to a later phase. */
export async function generateGeminiArtwork(
  _context: ArtworkPromptContext,
  _options: ArtworkGenerateOptions = {},
): Promise<ArtworkGenerateResult> {
  throw new Error("Gemini artwork provider is not implemented yet. Set CREATIVE_LAB_ARTWORK_PROVIDER=openai.");
}
