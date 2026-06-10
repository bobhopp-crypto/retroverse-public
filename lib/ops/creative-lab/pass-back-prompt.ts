import {
  NO_GENERATED_NUMBERING_PROMPT,
  SERIAL_STAMP_AREA_PROMPT,
} from "./pass-concept-prompt";
import type { ConceptVariationKey } from "./types";
import { visualWorldById, type VisualWorldId } from "./visual-worlds";

export type PassBackPromptInput = {
  worldId: VisualWorldId;
  event: string;
  venue: string;
  date: string;
  featuredYears: number[];
  theme?: string;
  conceptKey: ConceptVariationKey;
  frontConceptSummary: string;
  frontCompositionLabel: string;
  quote?: string;
};

const PASS_WIDTH = 1024;
const PASS_HEIGHT = 1536;
const DEFAULT_QUOTE = "Where the years keep playing.";

const BACK_LAYOUTS: Record<ConceptVariationKey, { label: string; layout: string }> = {
  A: {
    label: "Centered info panel",
    layout:
      "Symmetric credential back — centered metadata panel with event hierarchy, quote band, and QR placeholder. Border language mirrors the front laminate frame.",
  },
  B: {
    label: "Split column metadata",
    layout:
      "Two-column back layout — event block left, venue/date/years right, quote footer, QR placeholder lower right. Same neon or foil accents as front.",
  },
  C: {
    label: "Footer banner stack",
    layout:
      "Upper ornamental band echoing front header graphics, stacked metadata bands mid-canvas, Retroverse.live and QR in footer banner above numbering panel.",
  },
  D: {
    label: "Symmetric credential back",
    layout:
      "Collector-style symmetric back — ornamental corners matching front, centered quote, metadata rails, QR placeholder and Retroverse.live in balanced footer.",
  },
};

function yearsLine(years: number[]): string {
  return years.length ? years.join(" · ") : "";
}

export function backCompositionForKey(key: ConceptVariationKey): { label: string; layout: string } {
  return BACK_LAYOUTS[key];
}

/** Reverse-side brief — must match locked front palette, type, and visual world. */
export function renderPassBackPrompt(input: PassBackPromptInput): string {
  const world = visualWorldById(input.worldId);
  const backComp = backCompositionForKey(input.conceptKey);
  const years = yearsLine(input.featuredYears);
  const quote = input.quote?.trim() || input.theme?.trim() || DEFAULT_QUOTE;
  const musicTv =
    input.worldId === "music-television-credential" || input.worldId === "concert-backstage-laminate";

  return [
    `Illustrate the BACK / REVERSE SIDE of a finished portrait VIP laminate credential.`,
    `This is NOT an independent design — it is the reverse of an already-approved FRONT pass.`,
    `Match the front's visual world, color palette, typography style, border language, and laminate stock exactly.`,
    ``,
    `CANVAS: ${PASS_WIDTH}×${PASS_HEIGHT} pixels, portrait orientation, full-bleed artwork edge to edge.`,
    ``,
    SERIAL_STAMP_AREA_PROMPT,
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
    `REQUIRED BACK CONTENT (readable, integrated — never a plain form):`,
    `- Event: ${input.event}`,
    `- Venue: ${input.venue}`,
    `- Date: ${input.date}`,
    years ? `- Years: ${years}` : "",
    `- Quote: "${quote}"`,
    `- URL text: Retroverse.live`,
    `- QR code: empty square placeholder box with thin border — no scannable pattern, no fake digits`,
    `- Stamp/serial area: use the mandatory bottom-center numbering panel only`,
    ``,
    `REVERSE-SIDE RULES:`,
    `- Feels like flipping the approved front over — same laminate, same era, same print house`,
    `- Ornament and border motifs echo the front; layout is optimized for metadata legibility`,
    `- 90% designed credential back, 10% event metadata`,
    `- Print-ready illustration — no wireframe, no UI mockup, no watermarks`,
    `- ${NO_GENERATED_NUMBERING_PROMPT.split("\n")[0]}`,
    ``,
    `FINAL CHECK: Bottom-center cream numbering panel, completely blank inside. Back matches front visual family.`,
  ]
    .filter(Boolean)
    .join("\n");
}
