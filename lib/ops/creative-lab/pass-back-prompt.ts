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
      "Symmetric credential back — centered metadata panel with governed event text and empty QR placeholder. Border language mirrors the front laminate frame.",
  },
  B: {
    label: "Split column metadata",
    layout:
      "Two-column back layout — governed event block left, venue/date/years right, empty QR placeholder lower right. Same accents as front.",
  },
  C: {
    label: "Footer banner stack",
    layout:
      "Upper ornamental band echoing front header graphics, stacked governed metadata bands mid-canvas, empty QR placeholder in footer banner above numbering panel.",
  },
  D: {
    label: "Symmetric credential back",
    layout:
      "Collector-style symmetric back — ornamental corners matching front, governed metadata rails, empty QR placeholder in balanced footer above numbering panel.",
  },
};

function displayUrl(qrUrl?: string): string | null {
  if (!qrUrl?.trim()) return null;
  try {
    return new URL(qrUrl.trim()).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

export function backCompositionForKey(key: ConceptVariationKey): { label: string; layout: string } {
  return BACK_LAYOUTS[key];
}

/** Reverse-side brief — governed text only; QR reserved for export compositing. */
export function renderPassBackPrompt(input: PassBackPromptInput): string {
  const world = visualWorldById(input.worldId);
  const backComp = backCompositionForKey(input.conceptKey);
  const urlLabel = displayUrl(input.qrUrl);
  const musicTv =
    input.worldId === "music-television-credential" || input.worldId === "concert-backstage-laminate";

  return [
    `Illustrate the BACK / REVERSE SIDE of a finished portrait VIP laminate credential.`,
    `This is NOT an independent design — it is the reverse of an already-approved FRONT pass.`,
    `Match the front's visual world, color palette, typography style, border language, and laminate stock exactly.`,
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
    `LOCKED FRONT CONTEXT (mirror this family — same stock, palette, and credential language):`,
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
    urlLabel ? `- URL label (exact): ${urlLabel}` : "",
    `- Verification window + serial: white QR window is intentional laminate design — NO QR modules, NO fake barcode, NO generated serial numbers`,
    ``,
    `REVERSE-SIDE RULES:`,
    `- Feels like flipping the approved front over — same laminate, same era, same print house`,
    `- Ornament and border motifs echo the front; layout optimized for governed metadata legibility`,
    `- 90% designed credential back, 10% governed event metadata`,
    `- Print-ready illustration — no wireframe, no UI mockup, no watermarks`,
    `- ${NO_GENERATED_NUMBERING_PROMPT.split("\n")[0]}`,
    ``,
    `FINAL CHECK: White verification window + serial zones on back only. Real QR is export production data. Back matches front collectible family.`,
  ]
    .filter(Boolean)
    .join("\n");
}
