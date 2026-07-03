import type { CreativeDirectionSettings } from "@/lib/ops/content-creator/creative-direction";
import type { CollectiblePassFields } from "@/lib/ops/content-creator/collectible-pass-prompt";
import type { ContentArtifactType } from "@/lib/ops/content-creator/types";
import {
  composeRvbrPrompt,
  type ComposedRvbrPrompt,
  type PromptSide,
  type RvbrStyleDirective,
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
  styleDirective?: RvbrStyleDirective;
}): ComposedRvbrPrompt {
  return composeRvbrPrompt({
    side: args.side,
    profile: args.profile,
    fields: args.fields,
    settings: args.settings,
    artifactType: args.artifactType ?? "pass",
    compositionSeed: args.compositionSeed,
    frontSummary: args.frontSummary,
    styleDirective: args.styleDirective,
  });
}

/** Branded front prompt — RVBR Prompt Engine only path to image model. */
export function renderArtDirectorFrontPrompt(
  profile: RvbrProfile,
  fields: ArtDirectorFields,
  compositionSeed: number = Date.now(),
  settings: CreativeDirectionSettings,
  artifactType: ContentArtifactType = "pass",
  styleDirective?: RvbrStyleDirective,
): ComposedRvbrPrompt {
  return composeSide({
    side: "front",
    profile,
    fields,
    compositionSeed,
    settings,
    artifactType,
    styleDirective,
  });
}

/** Branded back prompt — RVBR Prompt Engine only path to image model. */
export function renderArtDirectorBackPrompt(
  profile: RvbrProfile,
  fields: ArtDirectorFields,
  compositionSeed: number = Date.now(),
  settings: CreativeDirectionSettings,
  artifactType: ContentArtifactType = "pass",
  styleDirective?: RvbrStyleDirective,
): ComposedRvbrPrompt {
  const frontSummary = styleDirective
    ? `${styleDirective.styleLabel} style · ${styleDirective.colorSchemeLabel} palette · seed ${compositionSeed}`
    : `${profile.name} · ${settings.creativeDirection} · ${settings.artifactArchetype} · seed ${compositionSeed}`;

  return composeSide({
    side: "back",
    profile,
    fields,
    compositionSeed,
    settings,
    artifactType,
    frontSummary,
    styleDirective,
  });
}

/** Legacy string export for callers expecting plain prompt text. */
export function artDirectorPromptText(result: ComposedRvbrPrompt): string {
  return result.finalPrompt;
}
