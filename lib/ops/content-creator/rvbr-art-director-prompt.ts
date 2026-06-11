import type { CreativeDirectionSettings } from "@/lib/ops/content-creator/creative-direction";
import type { CollectiblePassFields } from "@/lib/ops/content-creator/collectible-pass-prompt";
import type { ContentArtifactType } from "@/lib/ops/content-creator/types";
import {
  composeRvbrPrompt,
  type ComposedRvbrPrompt,
  type PromptSide,
} from "@/lib/creative/rvbr-prompt-engine";
import type { RvbrProfile } from "@/lib/ops/rvbr/types";

export type ArtDirectorFields = CollectiblePassFields;

export type ArtDirectorPromptResult = ComposedRvbrPrompt;

function composeSide(args: {
  side: PromptSide;
  profile: RvbrProfile;
  fields: ArtDirectorFields;
  compositionSeed: number;
  settings: CreativeDirectionSettings;
  artifactType?: ContentArtifactType;
  frontSummary?: string;
}): ComposedRvbrPrompt {
  return composeRvbrPrompt({
    side: args.side,
    profile: args.profile,
    fields: args.fields,
    settings: args.settings,
    artifactType: args.artifactType ?? "pass",
    compositionSeed: args.compositionSeed,
    frontSummary: args.frontSummary,
  });
}

/** Branded front prompt — RVBR Prompt Engine only path to image model. */
export function renderArtDirectorFrontPrompt(
  profile: RvbrProfile,
  fields: ArtDirectorFields,
  compositionSeed: number = Date.now(),
  settings: CreativeDirectionSettings,
  artifactType: ContentArtifactType = "pass",
): ComposedRvbrPrompt {
  return composeSide({
    side: "front",
    profile,
    fields,
    compositionSeed,
    settings,
    artifactType,
  });
}

/** Branded back prompt — RVBR Prompt Engine only path to image model. */
export function renderArtDirectorBackPrompt(
  profile: RvbrProfile,
  fields: ArtDirectorFields,
  compositionSeed: number = Date.now(),
  settings: CreativeDirectionSettings,
  artifactType: ContentArtifactType = "pass",
): ComposedRvbrPrompt {
  const dir = settings.creativeDirection;
  const archetype =
    settings.artifactArchetype === "random" ? "random-archetype" : settings.artifactArchetype;
  const frontSummary = `${profile.name} · ${dir} · ${archetype} · seed ${compositionSeed}`;

  return composeSide({
    side: "back",
    profile,
    fields,
    compositionSeed,
    settings,
    artifactType,
    frontSummary,
  });
}

/** Legacy string export for callers expecting plain prompt text. */
export function artDirectorPromptText(result: ComposedRvbrPrompt): string {
  return result.finalPrompt;
}
