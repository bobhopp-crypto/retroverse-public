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

function yearsLine(years: number[]): string {
  return years.length ? years.join(" · ") : "";
}

/** Illustrator-style brief — no metadata tags, no JSON labels. */
export function renderPassConceptPrompt(input: PassPromptInput): string {
  const world = visualWorldById(input.worldId);
  const comp = compositionForKey(input.conceptKey);
  const years = yearsLine(input.featuredYears);

  if (input.refinement) {
    const r = input.refinement;
    return [
      `Illustrate a finished ${PASS_FORMAT} ready for professional lamination and hand-out at the door.`,
      ``,
      `CANVAS: ${PASS_WIDTH}×${PASS_HEIGHT} pixels, portrait orientation, full-bleed artwork edge to edge.`,
      ``,
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
      `- Numbering: ${r.numberingTreatment.replace(/-/g, " ")}`,
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
    ]
      .filter(Boolean)
      .join("\n");
  }

  return [
    `Illustrate a finished ${PASS_FORMAT} ready for professional lamination and hand-out at the door.`,
    ``,
    `CANVAS: ${PASS_WIDTH}×${PASS_HEIGHT} pixels, portrait orientation, full-bleed artwork edge to edge.`,
    ``,
    `VISUAL WORLD: ${world.title}`,
    world.description,
    `Look and feel references: ${world.visualReferences.join(", ")}.`,
    ``,
    `CONCEPT ${input.conceptKey} — ${comp.label}`,
    `- Composition: ${comp.composition}`,
    `- Typography hierarchy: ${comp.typographyHierarchy}`,
    `- Border treatment: ${comp.borderTreatment}`,
    `- Numbering treatment: ${comp.numberingTreatment}`,
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
    `- Feels like a rare festival credential worth keeping`,
    `- Hand-illustrated warmth, not stock photo, not generic AI layout`,
    `- No empty rectangles, no placeholder gradients, no lorem ipsum`,
  ].join("\n");
}

export function refinementTreatmentsForWorld(worldId: VisualWorldId): ArtRefinementTreatment[] {
  return refinementsForArtDirection(worldId);
}
