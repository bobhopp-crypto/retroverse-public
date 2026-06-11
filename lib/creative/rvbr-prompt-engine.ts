import {
  artifactArchetypeById,
  artifactArchetypePromptBlock,
  resolveArtifactArchetype,
} from "@/lib/creative/artifact-archetypes";
import { buildPromptMetrics } from "@/lib/creative/prompt-metrics";
import {
  compressedEraProfileBlock,
  loadRvbrPromptProfile,
} from "@/lib/creative/rvbr-prompt-profile";
import type {
  ComposedRvbrPrompt,
  PromptDebugBreakdown,
  PromptQualityLevel,
  PromptQualityScores,
  PromptSide,
} from "@/lib/creative/rvbr-prompt-types";
import {
  creativeDirectionById,
  creativeDirectionPromptBlock,
  type CreativeDirectionSettings,
} from "@/lib/ops/content-creator/creative-direction";
import { PASS_HEIGHT, PASS_WIDTH } from "@/lib/ops/creative-lab/pass-layout";
import {
  compressedTextGovernancePromptBlock,
  normalizePassTypeLabel,
  type PassTextFields,
} from "@/lib/ops/creative-lab/pass-text-governance";
import type { CollectiblePassFields } from "@/lib/ops/content-creator/collectible-pass-prompt";
import type { ContentArtifactType } from "@/lib/ops/content-creator/types";
import type { RvbrProfile } from "@/lib/ops/rvbr/types";

export type {
  ComposedRvbrPrompt,
  PromptDebugBreakdown,
  PromptLayer,
  PromptMetrics,
  PromptQualityLevel,
  PromptQualityScores,
  PromptSide,
} from "@/lib/creative/rvbr-prompt-types";

export type RvbrPromptEngineInput = {
  side: PromptSide;
  profile: RvbrProfile;
  fields: CollectiblePassFields;
  settings: CreativeDirectionSettings;
  artifactType: ContentArtifactType;
  compositionSeed: number;
  frontSummary?: string;
};

const RETROVERSE_BRAND_RULES = [
  `Collectible artifact first, credential second`,
  `Music-history object — discovered, not manufactured`,
  `Printed ephemera stock — ticket, pass, card, invite, laminate`,
  `Visual storytelling over form-field layout`,
  `Avoid corporate badge, SaaS UI, generic poster template`,
  `BIG TITLE → BIG ART → DATE stack is forbidden`,
].join("\n");

function scorePromptQuality(
  input: RvbrPromptEngineInput,
  eraProfile: ReturnType<typeof loadRvbrPromptProfile>,
): PromptQualityScores {
  const motifCount =
    eraProfile.preferredMotifs.length +
    eraProfile.preferredComposition.length +
    (eraProfile.compositionVariety?.length ?? 0);
  const eraSpecificity: PromptQualityLevel =
    motifCount >= 10 ? "high" : motifCount >= 5 ? "medium" : "low";

  const brandSpecificity: PromptQualityLevel = "high";

  const variationScore: PromptQualityLevel =
    input.settings.maximizeVariation && input.settings.artifactArchetype === "random"
      ? "high"
      : input.settings.maximizeVariation
        ? "medium"
        : "low";

  let clicheRisk: PromptQualityLevel = "medium";
  if (input.settings.avoidEraTropes && eraProfile.negativePromptTerms.length >= 4) {
    clicheRisk = "low";
  } else if (!input.settings.avoidEraTropes) {
    clicheRisk = "high";
  }

  return { eraSpecificity, brandSpecificity, variationScore, clicheRisk };
}

/** Branded prompt orchestration — compressed 5-layer brief, each concept once. */
export function composeRvbrPrompt(input: RvbrPromptEngineInput): ComposedRvbrPrompt {
  const eraProfile = loadRvbrPromptProfile(input.profile.slug);
  const dir = creativeDirectionById(input.settings.creativeDirection);

  const archetypeId = resolveArtifactArchetype(
    input.settings.artifactArchetype,
    input.compositionSeed,
  );
  const archetype = artifactArchetypeById(archetypeId);

  const textFields: PassTextFields = {
    event: input.fields.event,
    venue: input.fields.venue,
    date: input.fields.date,
    secondaryLine: input.fields.secondaryLine,
    passTypeLabel: normalizePassTypeLabel(input.fields.passTypeLabel),
  };

  const sideLabel = input.side === "front" ? "FRONT" : "BACK";
  const artifactLabel =
    input.artifactType === "pass" ? "collectible pass" : `${input.artifactType} artifact`;

  const archetypeContent = artifactArchetypePromptBlock(archetype, input.compositionSeed);
  const eraContent = compressedEraProfileBlock(eraProfile, input.profile, input.settings);
  const directionContent = creativeDirectionPromptBlock(
    input.settings,
    input.compositionSeed,
    input.side,
    input.side === "back" ? input.frontSummary : undefined,
  );
  const brandContent = RETROVERSE_BRAND_RULES;
  const governedText = compressedTextGovernancePromptBlock(textFields, input.fields.qrUrl);

  const debugBreakdown: PromptDebugBreakdown = {
    artifactArchetype: { id: "archetype", label: "Artifact Archetype", content: archetypeContent },
    eraProfile: { id: "era", label: "RVBR Era Profile", content: eraContent },
    brandRules: { id: "brand", label: "Retroverse Brand Rules", content: brandContent },
    directionRules: { id: "direction", label: "Creative Direction", content: directionContent },
    governedText: { id: "text", label: "Governed Text", content: governedText },
  };

  const finalPrompt = [
    `FINISHED ${sideLabel} · ${artifactLabel} · ${PASS_WIDTH}×${PASS_HEIGHT}px · 2.25"×3.5" print`,
    ``,
    `ARTIFACT ARCHETYPE`,
    archetypeContent,
    ``,
    `RVBR ERA PROFILE`,
    eraContent,
    ``,
    `CREATIVE DIRECTION`,
    directionContent,
    ``,
    `RETROVERSE BRAND`,
    brandContent,
    ``,
    `GOVERNED TEXT`,
    governedText,
    ``,
    `${archetype.label} · ${dir.label} · seed ${input.compositionSeed}`,
  ].join("\n");

  return {
    finalPrompt,
    debugBreakdown,
    qualityScores: scorePromptQuality(input, eraProfile),
    promptMetrics: buildPromptMetrics(finalPrompt),
  };
}
