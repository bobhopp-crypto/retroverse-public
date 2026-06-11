import { compositionForKey } from "./concept-compositions";
import {
  ARTWORK_INFORMATION_PANELS,
  CREDENTIAL_LAYOUT_LAMINATE_V1,
  QR_ZONE,
  SERIAL_PANEL,
} from "./pass-credential-layout";
import { typographySummaryForWorld } from "./pass-credential-typography";
import { PASS_HEIGHT, PASS_WIDTH, qrZonePromptBlock } from "./pass-layout";
import type { ConceptVariationKey } from "./types";
import { visualWorldById, type VisualWorldId } from "./visual-worlds";

const PASS_FORMAT = "portrait VIP laminate credential";

const ARTWORK_ONLY_RULE = [
  `ARTWORK LAYER ONLY — CREDENTIAL ILLUSTRATOR MODE:`,
  `Generate credential background, framing, ornamentation, and implied information panels ONLY.`,
  `Provide structure, mood, decoration, frames, borders, and visual hierarchy.`,
  `ABSOLUTE ZERO TEXT RULE: No readable letters, numbers, dates, years, venue names, words, logos with text, QR codes, or credential wording anywhere.`,
  `Retroverse overlays all event data, pass type, years, QR, and serial area programmatically.`,
].join("\n");

const ARTWORK_FORBIDDEN = [
  `FORBIDDEN IN ARTWORK:`,
  `- Any readable text, numerals, dates, years, venue names, event titles`,
  `- QR patterns, checkerboard modules, fake barcodes, scannable-looking pixels`,
  `- Flat opaque blocks that cover illustration (except the intentional back-side white verification window)`,
  `- Placeholder lorem ipsum, gibberish lettering, or decorative fake type`,
].join("\n");

function informationPanelsBlock(side: "front" | "back"): string {
  const panels = ARTWORK_INFORMATION_PANELS[side];
  const lines = panels.map((panel) => {
    const pos =
      panel.x != null && panel.width != null
        ? `at x=${panel.x}, y=${panel.y}, ${panel.width}×${panel.height}px`
        : `at y=${panel.y}, height ${panel.height}px, full width`;
    return `- ${panel.label.toUpperCase()} (${panel.zoneId}) ${pos}: ${panel.guidance}`;
  });

  return [
    `IMPLIED CREDENTIAL INFORMATION PANELS — paint decorative frames, NOT blank rectangles:`,
    `Each zone should feel like a designed credential plate ready for typography overlay.`,
    `Use borders, embossing, foil bands, laminate stripes, ornamental crests, and subtle interior washes.`,
    `Keep panel interiors translucent or lightly textured so hero illustration shows through.`,
    ...lines,
    `- Serial stamp panel: ${SERIAL_PANEL.width}×${SERIAL_PANEL.height}px at bottom center — embossed empty footer frame only`,
    side === "back"
      ? `- Verification window: intentional flat white square in lower half — design element for export QR, not a fake code`
      : "",
    `Illustration remains the hero between and around panels. Ornament may frame OUTSIDE zones.`,
  ]
    .filter(Boolean)
    .join("\n");
}

/** v2 Phase 1 — artwork-only brief. Structure + mood; Retroverse owns all data. */
export function renderPassArtworkPrompt(input: {
  worldId: VisualWorldId;
  side: "front" | "back";
  conceptKey?: ConceptVariationKey;
}): string {
  const world = visualWorldById(input.worldId);
  const key = input.conceptKey ?? "A";
  const comp = compositionForKey(key, input.worldId);

  const sideLine =
    input.side === "back"
      ? [
          `BACK / REVERSE SIDE — mirror front visual family (palette, border, laminate stock).`,
          qrZonePromptBlock(),
        ]
      : [`FRONT SIDE — hero illustration with credential framing hierarchy.`];

  return [
    `Illustrate ${PASS_FORMAT} — ARTWORK LAYER ONLY (no data, no text).`,
    ``,
    `CANVAS: ${PASS_WIDTH}×${PASS_HEIGHT} pixels, portrait, full-bleed illustration edge to edge.`,
    `LAYOUT TEMPLATE: ${CREDENTIAL_LAYOUT_LAMINATE_V1.id} — ${CREDENTIAL_LAYOUT_LAMINATE_V1.label}`,
    ``,
    ARTWORK_ONLY_RULE,
    ``,
    ARTWORK_FORBIDDEN,
    ``,
    informationPanelsBlock(input.side),
    ``,
    ...sideLine,
    ``,
    `VISUAL WORLD: ${world.title}`,
    world.description,
    `Style references (mood only — do not print): ${world.visualReferences.join(", ")}.`,
    `Border language: ${world.borderStyle}.`,
    `Color treatment: ${world.colorTreatment}.`,
    `Palette direction: ${world.palette.join(", ")}.`,
    `Typography mood (Retroverse renders real type): ${typographySummaryForWorld(world)}.`,
    ``,
    `COMPOSITION ${key} — ${comp.label} (spatial structure only):`,
    `- Composition: ${comp.composition}`,
    `- Border: ${comp.borderTreatment}`,
    `- Ornamentation: ${comp.ornamentation}`,
    ``,
    `FINAL CHECK: Zero readable text. Implied credential panels with decorative frames — not flat blocks. Rich illustrated laminate ready for Retroverse zone overlay.`,
  ]
    .filter(Boolean)
    .join("\n");
}
