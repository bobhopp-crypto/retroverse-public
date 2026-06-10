import type { ArtifactTypeId } from "../artifact-types";
import type { CreativeLabModuleId } from "../types";

export type ArtworkProviderId = "openai" | "gemini" | "disabled";

export type ArtworkGenerateOptions = {
  /** Number of images to generate (default 4) */
  count?: number;
  /** e.g. 1024x1536 portrait pass */
  size?: string;
  /** gpt-image-2 quality tier */
  quality?: "low" | "medium" | "high";
  /** Optional seed hint per image index */
  variationIndex?: number;
};

export type ArtworkImageResult = {
  index: number;
  buffer: Buffer;
  mimeType: "image/png";
};

export type ArtworkGenerateResult = {
  provider: ArtworkProviderId;
  images: ArtworkImageResult[];
};

export type ArtworkPromptContext = {
  prompt: string;
  artifactTypeId: ArtifactTypeId;
  presetName?: string;
  presetId?: string;
  event: string;
  venue: string;
  date: string;
  featuredYears: number[];
  module: CreativeLabModuleId;
  artDirectionTitle?: string;
  treatmentLabel?: string;
  variationIndex?: number;
};
