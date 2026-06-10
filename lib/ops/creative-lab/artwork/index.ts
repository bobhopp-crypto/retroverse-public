import { generateGeminiArtwork } from "./gemini-provider";
import { generateOpenAIArtwork } from "./openai-provider";
import { isArtworkProviderConfigured, resolveArtworkProvider } from "./provider-config";
import type { ArtworkGenerateOptions, ArtworkGenerateResult, ArtworkPromptContext, ArtworkProviderId } from "./types";

export type { ArtworkGenerateOptions, ArtworkGenerateResult, ArtworkPromptContext, ArtworkProviderId };
export { buildArtworkContext, buildArtworkPromptText } from "./build-prompt";
export { isArtworkProviderConfigured, resolveArtworkProvider };

/** Provider-neutral artwork generation entry point. */
export async function generateArtwork(
  context: ArtworkPromptContext,
  options: ArtworkGenerateOptions = {},
): Promise<ArtworkGenerateResult> {
  const provider = resolveArtworkProvider();
  if (provider === "disabled") {
    throw new Error(
      "Artwork provider is disabled. Set OPENAI_API_KEY and CREATIVE_LAB_ARTWORK_PROVIDER=openai.",
    );
  }
  if (!isArtworkProviderConfigured(provider)) {
    throw new Error(`Artwork provider "${provider}" is not configured.`);
  }

  switch (provider) {
    case "gemini":
      return generateGeminiArtwork(context, options);
    case "openai":
    default:
      return generateOpenAIArtwork(context, options);
  }
}
