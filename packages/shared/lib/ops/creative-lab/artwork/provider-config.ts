import type { ArtworkProviderId } from "./types";

/** Active artwork provider — swappable via env. */
export function resolveArtworkProvider(): ArtworkProviderId {
  const explicit = process.env.CREATIVE_LAB_ARTWORK_PROVIDER?.trim().toLowerCase();
  if (explicit === "disabled" || explicit === "none" || explicit === "off") return "disabled";
  if (explicit === "gemini") return "gemini";
  if (explicit === "openai") return "openai";
  if (process.env.OPENAI_API_KEY?.trim()) return "openai";
  if (process.env.GEMINI_API_KEY?.trim() || process.env.GOOGLE_API_KEY?.trim()) return "gemini";
  return "disabled";
}

export function isArtworkProviderConfigured(id: ArtworkProviderId): boolean {
  if (id === "disabled") return false;
  if (id === "openai") return Boolean(process.env.OPENAI_API_KEY?.trim());
  if (id === "gemini") return Boolean(process.env.GEMINI_API_KEY?.trim() || process.env.GOOGLE_API_KEY?.trim());
  return false;
}
