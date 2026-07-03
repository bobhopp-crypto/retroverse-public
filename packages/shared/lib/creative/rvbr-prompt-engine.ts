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
  RvbrStyleDirective,
} from "@/lib/creative/rvbr-prompt-types";
import {
  creativeDirectionById,
  creativeDirectionPromptBlock,
  type CreativeDirectionSettings,
} from "@/lib/ops/content-creator/creative-direction";
import {
  NO_FAKE_NETWORK_BRANDS_PROMPT,
  NO_MEASUREMENT_ON_ARTWORK_PROMPT,
} from "@/lib/ops/creative-lab/pass-prompt-safety";
import { artworkBackLayoutPrompt, PASS_HEIGHT, PASS_WIDTH } from "@/lib/ops/creative-lab/pass-layout";
import {
  compressedTextGovernancePromptBlock,
  normalizePassTypeLabel,
  type PassTextFields,
} from "@/lib/ops/creative-lab/pass-text-governance";
import { COLLECTOR_CARD_SUIT_LABELS, COLLECTOR_CARD_TYPE_LABELS } from "@/lib/ops/content-creator/collector-card";
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
  RvbrStyleDirective,
} from "@/lib/creative/rvbr-prompt-types";

export type RvbrPromptEngineInput = {
  side: PromptSide;
  profile: RvbrProfile;
  fields: CollectiblePassFields;
  settings: CreativeDirectionSettings;
  artifactType: ContentArtifactType;
  compositionSeed: number;
  frontSummary?: string;
  /** When present, leads the prompt: Style dominates composition, Color Scheme dominates palette. */
  styleDirective?: RvbrStyleDirective;
};

const RETROVERSE_BRAND_RULES = [
  `Collectible artifact first, credential second`,
  `Music-history object — discovered, not manufactured`,
  `Printed ephemera stock — ticket, pass, card, invite, laminate`,
  `Visual storytelling over form-field layout`,
  `Avoid corporate badge, SaaS UI, generic poster template`,
  `BIG TITLE → BIG ART → DATE stack is forbidden`,
].join("\n");

const COLLECTIBLE_HERO_RULES = [
  `THE COLLECTIBLE OBJECT IS THE HERO — not a person, portrait, or crowd scene`,
  `Prioritize: credential design, collector ephemera, typography, seals, stamps, archival memorabilia, admission artifacts`,
  `Favor: laminate plates, ticket stock, VIP panels, embossed seals, foil bands, hand-lettered event typography`,
  `The pass should look like a discovered physical artifact — not an AI illustration of someone`,
].join("\n");

const SUBJECT_AVOIDANCE_RULES = [
  `Strongly avoid: random people, celebrity lookalikes, AI portraits, generic faces, stock models, crowd scenes`,
  `Do not center the composition on a human figure — center on the collectible object, typography, and era ephemera`,
  `No photorealistic headshots, no famous-person resemblance, no audience silhouettes as focal subject`,
].join("\n");

const BACK_PURPOSE_RULES = [
  `BACK PURPOSE — RELATED TO FRONT, NOT A SECOND FRONT:`,
  `Front = hero artwork and emotional collectible face.`,
  `Back = authentication, collector information, production reserve, serial/stamp area, and supporting artwork.`,
  `Use the front only as a family reference for palette, stock, border language, and era mood.`,
  `Do not repeat the front hero composition, focal subject, or poster-style hierarchy on the back.`,
  `Back layout order: supporting artwork at top, collector/authentication information in the middle, production QR reserve below, generous serial/stamp area at bottom.`,
].join("\n");

const COLLECTOR_CARD_VISUAL_RULES = [
  `AVOID AI CONCERT POSTER SYNDROME:`,
  `Do not generate singers, performers, microphones, crowds, stages, band portraits, celebrity likenesses, or live-performance scenes.`,
  `Represent the memory of the song through objects, environments, symbols, materials, and atmosphere.`,
  `Prefer empty rooms after the music, instruments as objects, street signs, radio dials, dance-floor traces, record sleeves, studio equipment, weather, cars, textiles, lights, and era-specific ephemera.`,
  `Collector card first, not casino card; no mirrored corners, no playing-card border gimmick, no poker-table language.`,
].join("\n");

function collectorCardPromptBlock(fields: CollectiblePassFields): string {
  const content = fields.collectorCardContent;
  const presentation = fields.collectorCardPresentation;
  if (!content || !presentation) return "";

  const chartLine = content.chartPosition
    ? `Retroverse Hot 100 year rank: #${content.chartPosition}`
    : "Retroverse Pick: manual / face-card selection";
  return [
    `CARD IDENTITY`,
    `Year: ${content.year}`,
    `Song Title: ${content.song}`,
    `Artist: ${content.artist}`,
    chartLine,
    `RVTR: ${content.rvtr || "manual resolution pending"}`,
    `Fact, one sentence only: ${content.fact}`,
    ``,
    `PRESENTATION`,
    `Card type: ${COLLECTOR_CARD_TYPE_LABELS[presentation.cardType]}`,
    `Rank: ${presentation.rank}`,
    `Suit: ${COLLECTOR_CARD_SUIT_LABELS[presentation.suit]}`,
    ``,
    `LAYOUT HIERARCHY`,
    `1. Artwork dominates the portrait card.`,
    `2. Song title below artwork as strong collector-card typography.`,
    `3. Artist + year below title.`,
    `4. One-line fact below artist/year; never a paragraph.`,
    `5. Upper-right corner only contains rank and suit; no mirrored corner marks.`,
  ].join("\n");
}

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

  const variationScore: PromptQualityLevel = input.settings.maximizeVariation ? "high" : "medium";

  let clicheRisk: PromptQualityLevel = "medium";
  if (input.settings.avoidEraTropes && eraProfile.negativePromptTerms.length >= 4) {
    clicheRisk = "low";
  } else if (!input.settings.avoidEraTropes) {
    clicheRisk = "high";
  }

  return { eraSpecificity, brandSpecificity, variationScore, clicheRisk };
}

/** The strongest block in the prompt — Style owns composition, Color Scheme owns palette,
 *  event data decorates rather than defines. Placed first, immediately after the header. */
function styleDirectivePromptBlock(directive: RvbrStyleDirective): string {
  return [
    `DESIGN STYLE — PRIMARY DIRECTIVE (HIGHEST PRIORITY)`,
    `Selected style: ${directive.styleLabel}.`,
    directive.styleDirection,
    `This style dictates the composition, layout skeleton, typography, ornament, and overall design language of the entire artifact. It outranks era styling and event information. The result must be immediately recognizable as ${directive.styleLabel} artwork.`,
    ``,
    `COLOR SCHEME — PRIMARY PALETTE (HIGHEST PRIORITY)`,
    `Selected scheme: ${directive.colorSchemeLabel}.`,
    directive.colorSchemeDirection,
    `This scheme governs every major surface: backgrounds, typography, borders, and ornament. It overrides the era's default palette entirely.`,
    ``,
    `Event information below is content rendered INSIDE this style — it decorates the design and must never change the style or the palette.`,
  ].join("\n");
}

/** Branded prompt orchestration — compressed 5-layer brief, each concept once. */
export function composeRvbrPrompt(input: RvbrPromptEngineInput): ComposedRvbrPrompt {
  const eraProfile = loadRvbrPromptProfile(input.profile.slug);
  const dir = creativeDirectionById(input.settings.creativeDirection);
  const isCollectorCard = input.artifactType === "collector-card";
  const styleDirective = input.styleDirective;

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
    input.artifactType === "pass"
      ? "collectible pass"
      : input.artifactType === "collector-card"
        ? "collector card"
        : `${input.artifactType} artifact`;

  const archetypeContent = isCollectorCard
    ? [
        `Retroverse Collector Card`,
        `Primary: portrait collector card for a canonical music memory.`,
        `Structure: artwork-first card with song title, artist + year, one-sentence fact, and upper-right rank/suit only.`,
        `Never generate: concert poster, performer portrait, microphone hero, crowd scene, stage scene, casino card, mirrored playing-card corners.`,
        `Feel: a tactile card pulled from a box of cultural memories.`,
      ].join("\n")
    : artifactArchetypePromptBlock(archetype, input.compositionSeed);
  const eraContentBase = compressedEraProfileBlock(eraProfile, input.profile, input.settings);
  // With a style directive, the era supplies period texture and authenticity only —
  // composition belongs to the Style and the palette belongs to the Color Scheme.
  const eraContent = styleDirective
    ? `${eraContentBase}\nEra scope: period texture, print character, and authenticity only — the DESIGN STYLE directive controls composition and the COLOR SCHEME directive controls the palette.`
    : eraContentBase;
  const directionBlock = creativeDirectionPromptBlock(
    input.settings,
    input.compositionSeed,
    input.side,
    input.side === "back" ? input.frontSummary : undefined,
    styleDirective?.styleLabel,
  );
  // Creative notes ride the direction layer — director guidance, never governed text.
  const creativeNotes = input.fields.creativeNotes?.trim();
  const directionContent = creativeNotes
    ? `${directionBlock}\n\nDIRECTOR NOTES (guidance only — never render these words as text):\n${creativeNotes}`
    : directionBlock;
  const brandContent = RETROVERSE_BRAND_RULES;
  const governedText = isCollectorCard ? collectorCardPromptBlock(input.fields) : compressedTextGovernancePromptBlock(textFields);

  const debugBreakdown: PromptDebugBreakdown = {
    artifactArchetype: { id: "archetype", label: "Artifact Archetype", content: archetypeContent },
    eraProfile: { id: "era", label: "RVBR Era Profile", content: eraContent },
    brandRules: { id: "brand", label: "Retroverse Brand Rules", content: brandContent },
    directionRules: {
      id: "direction",
      label: styleDirective ? "Style Directive + Direction" : "Creative Direction",
      content: styleDirective
        ? `${styleDirectivePromptBlock(styleDirective)}\n\n${directionContent}`
        : directionContent,
    },
    governedText: { id: "text", label: "Governed Text", content: governedText },
  };

  const finalPrompt = [
    `FINISHED ${sideLabel} · ${artifactLabel} · ${PASS_WIDTH}×${PASS_HEIGHT}px · 2.25"×3.5" print`,
    ...(styleDirective ? [``, styleDirectivePromptBlock(styleDirective)] : []),
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
    `COLLECTIBLE HERO`,
    COLLECTIBLE_HERO_RULES,
    ``,
    `SUBJECT AVOIDANCE`,
    SUBJECT_AVOIDANCE_RULES,
    ``,
    `ARTWORK SAFETY`,
    NO_MEASUREMENT_ON_ARTWORK_PROMPT,
    NO_FAKE_NETWORK_BRANDS_PROMPT,
    ...(isCollectorCard
      ? [
          ``,
          `COLLECTOR CARD RULES`,
          COLLECTOR_CARD_VISUAL_RULES,
        ]
      : []),
    ...(input.side === "back" && !isCollectorCard
      ? [
          ``,
          `BACK PURPOSE`,
          BACK_PURPOSE_RULES,
          ``,
          `BACK LAYOUT`,
          artworkBackLayoutPrompt(),
        ]
      : []),
    ``,
    `GOVERNED TEXT`,
    governedText,
    ``,
    styleDirective
      ? `${styleDirective.styleLabel} style · ${styleDirective.colorSchemeLabel} palette · seed ${input.compositionSeed}`
      : `${archetype.label} · ${dir.label} · seed ${input.compositionSeed}`,
  ].join("\n");

  return {
    finalPrompt,
    debugBreakdown,
    qualityScores: scorePromptQuality(input, eraProfile),
    promptMetrics: buildPromptMetrics(finalPrompt),
  };
}
