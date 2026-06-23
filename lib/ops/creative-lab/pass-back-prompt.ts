import { NO_GENERATED_NUMBERING_PROMPT } from "./pass-concept-prompt";
import { integratedBackFunctionalZonesPrompt, PASS_HEIGHT, PASS_WIDTH } from "./pass-layout";
import {
  normalizePassTypeLabel,
  textGovernancePromptBlock,
} from "./pass-text-governance";
import type { ConceptVariationKey } from "./types";
import { visualWorldById, type VisualWorldId } from "./visual-worlds";

export type PassBackPromptInput = {
  worldId: VisualWorldId;
  event: string;
  venue: string;
  date: string;
  secondaryLine: string;
  passTypeLabel?: string;
  qrUrl?: string;
  conceptKey: ConceptVariationKey;
  frontConceptSummary: string;
  frontCompositionLabel: string;
};

const BACK_LAYOUTS: Record<ConceptVariationKey, { label: string; layout: string }> = {
  A: {
    label: "Centered info panel",
    layout:
      "Authentication back — centered collector metadata panel with governed event text, production QR reserve, and generous serial/stamp area. Border language relates to the front without copying its hero layout.",
  },
  B: {
    label: "Split column metadata",
    layout:
      "Two-column authentication layout — governed event block left, venue/date/years right, production QR reserve lower-middle, serial/stamp area bottom.",
  },
  C: {
    label: "Footer banner stack",
    layout:
      "Upper supporting-art band, stacked collector metadata mid-canvas, production QR reserve above a generous serial/stamp panel.",
  },
  D: {
    label: "Symmetric credential back",
    layout:
      "Collector authentication back — ornamental corners relate to front stock, governed metadata rails, production QR reserve separated from bottom serial/stamp panel.",
  },
};

export function backCompositionForKey(key: ConceptVariationKey): { label: string; layout: string } {
  return BACK_LAYOUTS[key];
}

/** Reverse-side brief — governed text only; QR reserved for export compositing. */
export function renderPassBackPrompt(input: PassBackPromptInput): string {
  const world = visualWorldById(input.worldId);
  const backComp = backCompositionForKey(input.conceptKey);
  const musicTv =
    input.worldId === "music-television-credential" || input.worldId === "concert-backstage-laminate";

  return [
    `Illustrate the BACK / REVERSE SIDE of a finished portrait VIP laminate credential.`,
    `This is NOT a second front — it is the authentication and collector-information side of an approved pass.`,
    `Relate to the front's color palette, typography style, border language, and laminate stock without copying the front hero composition.`,
    ``,
    `CANVAS: ${PASS_WIDTH}×${PASS_HEIGHT} pixels, portrait orientation, full-bleed artwork edge to edge.`,
    ``,
    integratedBackFunctionalZonesPrompt(),
    ``,
    textGovernancePromptBlock(
      {
        event: input.event,
        venue: input.venue,
        date: input.date,
        secondaryLine: input.secondaryLine,
        passTypeLabel: normalizePassTypeLabel(input.passTypeLabel),
      },
      input.qrUrl,
    ),
    ``,
    ...(musicTv
      ? [
          `SUNDAY NIGHTS DIRECTION — MUSIC TELEVISION ONLY:`,
          `No cartoon characters or mascots. Bold typography, geometric graphics, broadcast laminate aesthetic.`,
          ``,
        ]
      : []),
    `LOCKED FRONT CONTEXT (same family, different purpose):`,
    `- Front composition: ${input.frontCompositionLabel}`,
    `- Front direction: ${input.frontConceptSummary}`,
    `- Visual world: ${world.title}`,
    world.description,
    `References: ${world.visualReferences.join(", ")}.`,
    ``,
    `WORLD STYLE LOCK:`,
    `- Typography personality: ${world.typographyStyle}`,
    `- Border language: ${world.borderStyle}`,
    `- Color treatment: ${world.colorTreatment}`,
    `- Palette (use these hues): ${world.palette.join(", ")}`,
    ``,
    `BACK LAYOUT VARIATION ${input.conceptKey} — ${backComp.label}:`,
    backComp.layout,
    ``,
    `REQUIRED BACK CONTENT — governed fields only (omit any empty field entirely):`,
    normalizePassTypeLabel(input.passTypeLabel) ? `- Pass type: ${normalizePassTypeLabel(input.passTypeLabel)}` : "",
    input.event.trim() ? `- Event: ${input.event.trim()}` : "",
    input.venue.trim() ? `- Venue: ${input.venue.trim()}` : "",
    input.date.trim() ? `- Date: ${input.date.trim()}` : "",
    input.secondaryLine.trim() ? `- Secondary line: ${input.secondaryLine.trim()}` : "",
    `- Production QR reserve + serial: square reserve is intentional laminate design — equal width and height, sharp 90-degree corners, NO rounded corners, NO text inside, NO QR graphics, NO checkerboard, NO fake barcode, NO generated serial numbers`,
    ``,
    `REVERSE-SIDE RULES:`,
    `- Feels related to the approved front, but organized for authentication and collector information`,
    `- Ornament and border motifs echo the front; layout optimized for governed metadata legibility`,
    `- Supporting artwork top, metadata middle, QR reserve lower-middle, generous serial/stamp area bottom`,
    `- Print-ready illustration — no wireframe, no UI mockup, no watermarks`,
    `- ${NO_GENERATED_NUMBERING_PROMPT.split("\n")[0]}`,
    ``,
    `FINAL CHECK: Production QR reserve + serial/stamp zones on back only. Production export renders the verification code. Back relates to front without duplicating the front hero layout.`,
  ]
    .filter(Boolean)
    .join("\n");
}
