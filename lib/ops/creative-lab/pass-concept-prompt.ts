import { compositionForKey } from "./concept-compositions";
import type { ArtRefinementTreatment } from "./art-direction-refinements";
import { refinementsForArtDirection } from "./art-direction-refinements";
import { fullBleedFrontPrompt, PASS_HEIGHT, PASS_WIDTH } from "./pass-layout";
import {
  normalizePassTypeLabel,
  textGovernancePromptBlock,
  type PassTextFields,
} from "./pass-text-governance";
import type { ConceptVariationKey } from "./types";
import { visualWorldById, type VisualWorldId } from "./visual-worlds";

export type PassPromptInput = {
  worldId: VisualWorldId;
  event: string;
  venue: string;
  date: string;
  featuredYears: number[];
  passTypeLabel?: string;
  conceptKey: ConceptVariationKey;
  refinement?: ArtRefinementTreatment;
  refinementIndex?: number;
  parentConceptSummary?: string;
};

const PASS_FORMAT = "portrait VIP laminate credential";

export const NO_GENERATED_NUMBERING_PROMPT = [
  `PRINT NUMBERING RULE — NO GENERATED NUMBERS ANYWHERE ON THE PASS:`,
  `Do NOT illustrate, print, emboss, or imply any serial number, edition count, or ticket number.`,
  `Forbidden: "071", "#042", "1 of 200", "042 of 250", "No. 17", "EDITION 1/500", fake ticket numbers, barcode digits, access codes, run counts, or limited-edition tallies.`,
  `Real serial numbers are applied at export into the back serial zone only.`,
].join("\n");

export const FULL_BLEED_FRONT_PROMPT = fullBleedFrontPrompt();

const MUSIC_TV_FORBIDDEN_PROMPT = [
  `SUNDAY NIGHTS DIRECTION — MUSIC TELEVISION ONLY (NO CARTOON CULTURE):`,
  `Do NOT use cartoon characters, Hanna-Barbera references, Flintstones, Jetsons, Rocky & Bullwinkle, Disney, mascots, or character-driven artwork.`,
  `Use bold typography, geometric graphics, neon accent colors, broadcast graphics, credential hierarchy, and laminated pass structure.`,
  `Collectible but adult — something a patron would keep in a wallet, scrapbook, or memorabilia collection.`,
  `Music culture, not cartoon culture.`,
].join("\n");

function passTextFields(input: PassPromptInput): PassTextFields {
  return {
    event: input.event,
    venue: input.venue,
    date: input.date,
    featuredYears: input.featuredYears,
    passTypeLabel: normalizePassTypeLabel(input.passTypeLabel),
  };
}

/** Illustrator-style brief — Retroverse controls text; AI controls artwork. */
export function renderPassConceptPrompt(input: PassPromptInput): string {
  const world = visualWorldById(input.worldId);
  const comp = compositionForKey(input.conceptKey, input.worldId);
  const textFields = passTextFields(input);
  const musicTv =
    input.worldId === "music-television-credential" || input.worldId === "concert-backstage-laminate";

  if (input.refinement) {
    const r = input.refinement;
    return [
      `Illustrate a finished ${PASS_FORMAT} ready for professional lamination and hand-out at the door.`,
      ``,
      `CANVAS: ${PASS_WIDTH}×${PASS_HEIGHT} pixels, portrait orientation, full-bleed artwork edge to edge.`,
      ``,
      FULL_BLEED_FRONT_PROMPT,
      ``,
      textGovernancePromptBlock(textFields),
      ``,
      ...(musicTv ? [MUSIC_TV_FORBIDDEN_PROMPT, ``] : []),
      `VISUAL WORLD: ${world.title}`,
      world.description,
      `Look and feel references: ${world.visualReferences.join(", ")}.`,
      ``,
      `KEEP FROM WINNING CONCEPT: Same overall composition and illustration hierarchy as the selected Concept ${input.conceptKey}.`,
      input.parentConceptSummary ? `Winning direction: ${input.parentConceptSummary}` : "",
      ``,
      `REFINEMENT VARIATION — change these while staying in ${world.title}:`,
      `- Border: ${r.borderTreatment.replace(/-/g, " ")}`,
      `- Typography: ${r.typography.replace(/-/g, " ")}`,
      `- Illustration density: ${r.illustrationDensity}`,
      `- Decorative motifs: ${r.decorativeMotif.replace(/-/g, " ")}`,
      `- Layout emphasis: ${r.layoutEmphasis.replace(/-/g, " ")}`,
      ``,
      `WORLD STYLE LOCK:`,
      `- Typography personality: ${world.typographyStyle}`,
      `- Border language: ${world.borderStyle}`,
      `- Color treatment: ${world.colorTreatment}`,
      ``,
      `REQUIREMENTS:`,
      `- 95% illustrated artwork, 5% governed text only`,
      `- Must read clearly when held at arm's length`,
      `- Print-ready, rich illustration, no placeholder blocks, no wireframe, no UI mockup`,
      `- No watermarks`,
      ``,
      `FINAL CHECK: 100% artwork front. No reserved zones.`,
    ]
      .filter(Boolean)
      .join("\n");
  }

  return [
    `Illustrate a finished ${PASS_FORMAT} ready for professional lamination and hand-out at the door.`,
    ``,
    `CANVAS: ${PASS_WIDTH}×${PASS_HEIGHT} pixels, portrait orientation, full-bleed artwork edge to edge.`,
    ``,
    FULL_BLEED_FRONT_PROMPT,
    ``,
    textGovernancePromptBlock(textFields),
    ``,
    ...(musicTv ? [MUSIC_TV_FORBIDDEN_PROMPT, ``] : []),
    `VISUAL WORLD: ${world.title}`,
    world.description,
    `Look and feel references: ${world.visualReferences.join(", ")}.`,
    ``,
    `CONCEPT ${input.conceptKey} — ${comp.label}`,
    `- Composition: ${comp.composition}`,
    `- Typography hierarchy: ${comp.typographyHierarchy}`,
    `- Border treatment: ${comp.borderTreatment}`,
    `- Numbering panel: ${comp.numberingTreatment}`,
    `- Ornamentation: ${comp.ornamentation}`,
    ``,
    `WORLD STYLE LOCK (all four concepts share this family):`,
    `- Typography personality: ${world.typographyStyle}`,
    `- Border language: ${world.borderStyle}`,
    `- Color treatment: ${world.colorTreatment}`,
    `- Palette direction: ${world.palette.join(", ")}`,
    ``,
    `READABILITY & PRINT:`,
    `- Governed text must be legible at 3 feet`,
    `- High contrast between text and background`,
    `- Safe margins for laminate punch hole if any — keep critical text inset 48px`,
    `- Rich illustrated poster quality`,
    ``,
    `COLLECTIBLE REQUIREMENTS:`,
    `- Hand-illustrated warmth, not stock photo, not generic credential template`,
    `- 100% artwork front — full-bleed collectible surface`,
    ``,
    `FINAL CHECK: 100% artwork front. No reserved zones.`,
  ].join("\n");
}

export function refinementTreatmentsForWorld(worldId: VisualWorldId): ArtRefinementTreatment[] {
  return refinementsForArtDirection(worldId);
}
