import { compositionForKey } from "./concept-compositions";
import type { ArtRefinementTreatment } from "./art-direction-refinements";
import { refinementsForArtDirection } from "./art-direction-refinements";
import type { ConceptVariationKey } from "./types";
import { visualWorldById, type VisualWorldId } from "./visual-worlds";

export type PassPromptInput = {
  worldId: VisualWorldId;
  event: string;
  venue: string;
  date: string;
  featuredYears: number[];
  conceptKey: ConceptVariationKey;
  refinement?: ArtRefinementTreatment;
  refinementIndex?: number;
  parentConceptSummary?: string;
};

const PASS_WIDTH = 1024;
const PASS_HEIGHT = 1536;
const PASS_FORMAT = "portrait VIP laminate credential";

/** 20% larger than original 22%×8% panel — sized for rubber-stamp numbering. */
const STAMP_WIDTH_PX = Math.round(PASS_WIDTH * 0.264);
const STAMP_HEIGHT_PX = Math.round(PASS_HEIGHT * 0.096);
const STAMP_X0 = Math.round((PASS_WIDTH - STAMP_WIDTH_PX) / 2);
const STAMP_Y0 = PASS_HEIGHT - STAMP_HEIGHT_PX;

/** No fake serials anywhere on the pass — real numbers are stamped after print. */
export const NO_GENERATED_NUMBERING_PROMPT = [
  `PRINT NUMBERING RULE — NO GENERATED NUMBERS ANYWHERE ON THE PASS:`,
  `Do NOT illustrate, print, emboss, or imply any serial number, edition count, or ticket number.`,
  `Forbidden: "071", "#042", "1 of 200", "042 of 250", "No. 17", "EDITION 1/500", fake ticket numbers, barcode digits, access codes, run counts, or limited-edition tallies.`,
  `Real serial numbers are applied by physical stamp after printing. The blank numbering panel is the only place reserved for that.`,
].join("\n");

/** Mandatory blank zone for post-print physical ink stamping — all visual worlds. */
export const SERIAL_STAMP_AREA_PROMPT = [
  `CRITICAL PRINT CONSTRAINT — PHYSICAL NUMBERING PANEL (MANDATORY, ALL WORLDS):`,
  `Reserve a clean blank numbering panel near the bottom center of the credential.`,
  `Leave the area completely empty for a physical ink stamp applied after printing.`,
  ``,
  `Numbering panel specifications:`,
  `- Rectangle: ${STAMP_WIDTH_PX}px wide × ${STAMP_HEIGHT_PX}px tall (~26% × 10% of canvas)`,
  `- Position: bottom center — x=${STAMP_X0}–${STAMP_X0 + STAMP_WIDTH_PX}, y=${STAMP_Y0}–${PASS_HEIGHT} on ${PASS_WIDTH}×${PASS_HEIGHT} canvas`,
  `- Interior fill: flat solid cream #f5e6c8 or white #ffffff — smooth blank paper, zero texture, zero gradient, zero shadow`,
  `- Border: thin dark ink outline (#2d2d2d) around the rectangle only — no inner rules, no corner marks`,
  `- Sacred whitespace: treat this panel as masked-out dead zone — no artwork, characters, typography, flourishes, shadows, halftone, distress, foil, numbers, or letters inside`,
  `- Nothing may overlap the panel — all illustration and ornamentation STOP at the border`,
  `- Compose the full illustrated pass ABOVE this zone`,
  ``,
  NO_GENERATED_NUMBERING_PROMPT,
].join("\n");

const SERIAL_STAMP_FINAL_REMINDER = [
  `FINAL CHECK: Bottom-center cream/white numbering panel (${STAMP_WIDTH_PX}×${STAMP_HEIGHT_PX}px), thin dark border, completely blank inside.`,
  `No generated serial numbers anywhere on the pass. Physical stamp added after printing.`,
].join(" ");

const MUSIC_TV_FORBIDDEN_PROMPT = [
  `SUNDAY NIGHTS DIRECTION — MUSIC TELEVISION ONLY (NO CARTOON CULTURE):`,
  `Do NOT use cartoon characters, Hanna-Barbera references, Flintstones, Jetsons, Rocky & Bullwinkle, Disney, mascots, or character-driven artwork.`,
  `Use bold typography, geometric graphics, neon accent colors, broadcast graphics, credential hierarchy, and laminated pass structure.`,
  `Collectible but adult — something a patron would keep in a wallet, scrapbook, or memorabilia collection.`,
  `Music culture, not cartoon culture.`,
].join("\n");

function yearsLine(years: number[]): string {
  return years.length ? years.join(" · ") : "";
}

/** Illustrator-style brief — no metadata tags, no JSON labels. */
export function renderPassConceptPrompt(input: PassPromptInput): string {
  const world = visualWorldById(input.worldId);
  const comp = compositionForKey(input.conceptKey, input.worldId);
  const years = yearsLine(input.featuredYears);
  const musicTv =
    input.worldId === "music-television-credential" || input.worldId === "concert-backstage-laminate";

  if (input.refinement) {
    const r = input.refinement;
    return [
      `Illustrate a finished ${PASS_FORMAT} ready for professional lamination and hand-out at the door.`,
      ``,
      `CANVAS: ${PASS_WIDTH}×${PASS_HEIGHT} pixels, portrait orientation, full-bleed artwork edge to edge.`,
      ``,
      SERIAL_STAMP_AREA_PROMPT,
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
      `EVENT (small, readable, integrated — never a form):`,
      `${input.event} · ${input.venue} · ${input.date}`,
      years ? `Featured years: ${years}` : "",
      ``,
      `REQUIREMENTS:`,
      `- 95% illustrated artwork, 5% event information`,
      `- Must read clearly when held at arm's length`,
      `- Collectible festival credential someone keeps for decades`,
      `- Print-ready, rich illustration, no placeholder blocks, no wireframe, no UI mockup`,
      `- No watermarks, no logos except integrated pass design elements`,
      ``,
      SERIAL_STAMP_FINAL_REMINDER,
    ]
      .filter(Boolean)
      .join("\n");
  }

  return [
    `Illustrate a finished ${PASS_FORMAT} ready for professional lamination and hand-out at the door.`,
    ``,
    `CANVAS: ${PASS_WIDTH}×${PASS_HEIGHT} pixels, portrait orientation, full-bleed artwork edge to edge.`,
    ``,
    SERIAL_STAMP_AREA_PROMPT,
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
    `EVENT (small, readable, integrated into artwork — never a form layout):`,
    `Event: ${input.event}`,
    `Venue: ${input.venue}`,
    `Date: ${input.date}`,
    years ? `Years: ${years}` : "",
    ``,
    `READABILITY & PRINT:`,
    `- Event name must be legible at 3 feet`,
    `- High contrast between text and background`,
    `- Safe margins for laminate punch hole if any — keep critical text inset 48px`,
    `- Rich illustrated poster quality, not a business card or admin badge`,
    ``,
    `COLLECTIBLE REQUIREMENTS:`,
    musicTv
      ? `- Feels like a real MTV/VH1-era laminate worth keeping in a wallet, scrapbook, or memorabilia collection`
      : `- Feels like a rare festival credential worth keeping`,
    musicTv
      ? `- Print-ready laminated pass — bold graphic design, not stock photo, not generic AI layout`
      : `- Hand-illustrated warmth, not stock photo, not generic AI layout`,
    `- The numbering panel is sacred whitespace — the only intentional blank rectangle on the pass`,
    ``,
    SERIAL_STAMP_FINAL_REMINDER,
  ].join("\n");
}

export function refinementTreatmentsForWorld(worldId: VisualWorldId): ArtRefinementTreatment[] {
  return refinementsForArtDirection(worldId);
}
