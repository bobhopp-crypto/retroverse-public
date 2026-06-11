import type { RvbrGlance } from "@/lib/ops/rvbr/presentation";
import type { RvbrPromptFragments, RvbrVisualIdentity } from "@/lib/ops/rvbr/types";

export type ContentCreatorEraOption = RvbrGlance & {
  retroverseEraId: string;
  narrative: string | null;
  visualIdentity: Pick<RvbrVisualIdentity, "accent" | "subtitle" | "sections">;
  promptFragments: RvbrPromptFragments;
};

export type ContentArtifactType = "pass" | "poster" | "bumper" | "slide" | "social";
