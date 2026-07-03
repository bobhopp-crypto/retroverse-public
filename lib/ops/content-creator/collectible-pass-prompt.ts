import {
  NO_FAKE_NETWORK_BRANDS_PROMPT,
  NO_MEASUREMENT_ON_ARTWORK_PROMPT,
} from "@/lib/ops/creative-lab/pass-prompt-safety";
import {
  avoidEraTropesPromptBlock,
  creativeDirectionById,
  creativeDirectionPromptBlock,
  maximizeVariationPromptBlock,
  type CreativeDirectionSettings,
} from "@/lib/ops/content-creator/creative-direction";
import {
  fullBleedFrontPrompt,
  integratedBackFunctionalZonesPrompt,
  PASS_HEIGHT,
  PASS_WIDTH,
} from "@/lib/ops/creative-lab/pass-layout";
import {
  normalizePassTypeLabel,
  textGovernancePromptBlock,
  type PassTextFields,
} from "@/lib/ops/creative-lab/pass-text-governance";
import type { CollectorCardContent, CollectorCardPresentation } from "@/lib/ops/content-creator/collector-card";
import { visualWorldById } from "@/lib/ops/creative-lab/visual-worlds";
import { resolveVisualWorldFromRvbr } from "@/lib/ops/content-creator/resolve-visual-world";
import type { RvbrProfile } from "@/lib/ops/rvbr/types";

export type CollectiblePassFields = PassTextFields & {
  qrUrl?: string;
  /** Free-form creative direction notes — guidance for the art director layer,
   *  never rendered as governed text on the artifact. */
  creativeNotes?: string;
  collectorCardContent?: CollectorCardContent;
  collectorCardPresentation?: CollectorCardPresentation;
};

const COLLECTIBLE_ARTIFACT_BRIEF = [
  `COLLECTIBLE ARTIFACT — NOT A CREDENTIAL TEMPLATE:`,
  `Design a finished portrait collectible — souvenir first, credential second.`,
  `NOT: conference badge, employee pass, generic VIP template, lanyard corporate ID.`,
  ``,
  `ARTWORK DOMINANCE:`,
  `- Illustration, ornament, and era atmosphere occupy 90–95% of available space`,
  `- Event text woven into design — poster typography, hand-lettering, editorial placement`,
  `- Avoid stacked label fields, form-like metadata bands, and security-pass layout grids`,
  `- Front: 100% artwork surface. Back: functional QR + serial zones only, integrated into design.`,
].join("\n");

const ANTI_TEMPLATE_RULES = [
  `ANTI-TEMPLATE RULES:`,
  `- No generic laminate credential layout with horizontal metadata strips`,
  `- No conference-badge composition with photo hole or lanyard punch`,
  `- No employee-access pass structure with color-block security zones`,
  `- Vary structural composition — do not reuse the same layout skeleton across generations`,
].join("\n");

const ERA_STYLE_SCOPE = [
  `ERA STYLE SCOPE (VISUAL LANGUAGE ONLY):`,
  `Era controls: palette, typography personality, ornament language, print texture, period authenticity.`,
  `Era does NOT control: subject matter, central illustration choice, layout skeleton, or composition type.`,
  `Those belong to Creative Direction.`,
].join("\n");

const TEXT_INTEGRATION = [
  `TEXT INTEGRATION:`,
  `- Render governed text as designed poster typography — curved, arched, bannered, or hand-lettered`,
  `- Weave event, venue, date, and years into typographic bands and ornament — venue is text only, never illustrated`,
  `- Pass type may appear as small souvenir marking, not a security header bar`,
].join("\n");

const BACK_COMPOSITIONS = [
  "Souvenir back — metadata woven into ornamental border; hard-edged empty white verification square and serial stamp plate integrated in lower area.",
  "Handbill reverse — illustration echo, event details in editorial band; sharp-corner reserved white square above collector serial footer.",
  "Ticket back — stub information layout; export-owned hard-edged white square in an outside frame, serial in stub numbering plate below.",
  "Poster reverse — complementary illustration strip, ribbon banner text; empty white verification square and serial as designed production areas.",
  "Memorabilia back — collage ephemera matching front; reserved white square and serial embedded as souvenir stamp and seal plates, with ornament outside the square only.",
] as const;

function pickBackComposition(seed: number): string {
  return BACK_COMPOSITIONS[Math.abs(seed + 17) % BACK_COMPOSITIONS.length]!;
}

export function renderCollectibleFrontPrompt(
  profile: RvbrProfile,
  fields: CollectiblePassFields,
  compositionSeed: number,
  settings: CreativeDirectionSettings,
): string {
  const worldId = resolveVisualWorldFromRvbr(profile);
  const world = visualWorldById(worldId);
  const dir = creativeDirectionById(settings.creativeDirection);
  const textFields: PassTextFields = {
    event: fields.event,
    venue: fields.venue,
    date: fields.date,
    secondaryLine: fields.secondaryLine,
    passTypeLabel: normalizePassTypeLabel(fields.passTypeLabel),
  };

  return [
    `Create a FINISHED FRONT of a portrait collectible artifact.`,
    `Canvas: ${PASS_WIDTH}×${PASS_HEIGHT}px, portrait, print-ready at 2.25" × 3.5".`,
    ``,
    `═══ ERA STYLE ═══`,
    `Era: ${profile.name} (${profile.eraStartYear}–${profile.eraEndYear})`,
    ERA_STYLE_SCOPE,
    `Palette support: ${world.palette.join(", ")}.`,
    `Border language: ${world.borderStyle}.`,
    `Typography mood: ${world.typographyStyle}.`,
    ``,
    `═══ CREATIVE DIRECTION ═══`,
    creativeDirectionPromptBlock(settings, compositionSeed),
    ``,
    `═══ EVENT DATA ═══`,
    textGovernancePromptBlock(textFields),
    TEXT_INTEGRATION,
    ``,
    COLLECTIBLE_ARTIFACT_BRIEF,
    ANTI_TEMPLATE_RULES,
    NO_MEASUREMENT_ON_ARTWORK_PROMPT,
    NO_FAKE_NETWORK_BRANDS_PROMPT,
    fullBleedFrontPrompt(),
    avoidEraTropesPromptBlock(settings.avoidEraTropes),
    maximizeVariationPromptBlock(settings.maximizeVariation),
    ``,
    `FINAL CHECK: 100% artwork front. Direction: ${dir.label}. Era visual language applied — era clichés NOT auto-injected.`,
  ]
    .filter(Boolean)
    .join("\n");
}

export function renderCollectibleBackPrompt(
  profile: RvbrProfile,
  fields: CollectiblePassFields,
  compositionSeed: number,
  settings: CreativeDirectionSettings,
  frontSummary: string,
): string {
  const worldId = resolveVisualWorldFromRvbr(profile);
  const world = visualWorldById(worldId);
  const dir = creativeDirectionById(settings.creativeDirection);
  const backLayout = pickBackComposition(compositionSeed);
  const textFields: PassTextFields = {
    event: fields.event,
    venue: fields.venue,
    date: fields.date,
    secondaryLine: fields.secondaryLine,
    passTypeLabel: normalizePassTypeLabel(fields.passTypeLabel),
  };

  return [
    `Create a FINISHED BACK of a portrait collectible artifact.`,
    `Back of the pass — related to the front's era and print house, but organized for authentication and collector information.`,
    `Canvas: ${PASS_WIDTH}×${PASS_HEIGHT}px, portrait, print-ready at 2.25" × 3.5".`,
    ``,
    `═══ ERA STYLE ═══`,
    `Era: ${profile.name} (${profile.eraStartYear}–${profile.eraEndYear})`,
    ERA_STYLE_SCOPE,
    `Palette: ${world.palette.join(", ")}.`,
    ``,
    `═══ CREATIVE DIRECTION ═══`,
    creativeDirectionPromptBlock(settings, compositionSeed),
    `Front family context, do not copy hero layout: ${frontSummary}`,
    `Back layout: ${backLayout}`,
    ``,
    `═══ EVENT DATA ═══`,
    textGovernancePromptBlock(textFields, fields.qrUrl),
    TEXT_INTEGRATION,
    ``,
    COLLECTIBLE_ARTIFACT_BRIEF,
    NO_MEASUREMENT_ON_ARTWORK_PROMPT,
    NO_FAKE_NETWORK_BRANDS_PROMPT,
    integratedBackFunctionalZonesPrompt(),
    avoidEraTropesPromptBlock(settings.avoidEraTropes),
    maximizeVariationPromptBlock(settings.maximizeVariation),
    ``,
    `FINAL CHECK: Direction: ${dir.label}. Production QR reserve + generous serial/stamp area on back only; no rounded corners, QR graphics, checkerboard, or text inside the square; production export renders verification code.`,
  ]
    .filter(Boolean)
    .join("\n");
}
