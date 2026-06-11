/** Shared pass canvas layout — prompts and export compositing must match. */

export const PASS_WIDTH = 1024;
export const PASS_HEIGHT = 1536;

/** Final print size: 2.25" × 3.5" portrait collectible. */
export const PASS_PRINT_WIDTH_IN = 2.25;
export const PASS_PRINT_HEIGHT_IN = 3.5;

export const PX_PER_IN = PASS_WIDTH / PASS_PRINT_WIDTH_IN;

/** Back — serial zone: ~25% wider than 1.25" → 1.5625" × 0.5" at print. */
export const SERIAL_PRINT_W_IN = 1.5625;
export const SERIAL_PRINT_H_IN = 0.5;

export const SERIAL_WIDTH_PX = Math.round(SERIAL_PRINT_W_IN * PX_PER_IN);
export const SERIAL_HEIGHT_PX = Math.round(SERIAL_PRINT_H_IN * PX_PER_IN);
export const SERIAL_X0 = Math.round((PASS_WIDTH - SERIAL_WIDTH_PX) / 2);
export const SERIAL_Y0 =
  PASS_HEIGHT - SERIAL_HEIGHT_PX - Math.round(0.12 * PX_PER_IN);

/** Back — QR reserve: 1.6" square (min 1.5", preferred 1.6" for scan reliability). */
export const QR_PRINT_SIZE_IN = 1.6;
export const QR_SIZE_PX = Math.round(QR_PRINT_SIZE_IN * PX_PER_IN);

const QR_SERIAL_GAP_PX = Math.round(0.18 * PX_PER_IN);

export const QR_ZONE = {
  left: Math.round((PASS_WIDTH - QR_SIZE_PX) / 2),
  top: SERIAL_Y0 - QR_SERIAL_GAP_PX - QR_SIZE_PX,
  size: QR_SIZE_PX,
} as const;

/** @deprecated Serial zone on back only — aliases for legacy debug layout code. */
export const STAMP_PRINT_W_IN = SERIAL_PRINT_W_IN;
/** @deprecated */
export const STAMP_PRINT_H_IN = SERIAL_PRINT_H_IN;
/** @deprecated */
export const STAMP_WIDTH_PX = SERIAL_WIDTH_PX;
/** @deprecated */
export const STAMP_HEIGHT_PX = SERIAL_HEIGHT_PX;
/** @deprecated */
export const STAMP_X0 = SERIAL_X0;
/** @deprecated */
export const STAMP_Y0 = SERIAL_Y0;

export function serialZonePromptInches(): string {
  return `${SERIAL_PRINT_W_IN}" wide × ${SERIAL_PRINT_H_IN}" high`;
}

export function qrZonePromptInches(): string {
  return `${QR_PRINT_SIZE_IN}" × ${QR_PRINT_SIZE_IN}" (min 1.5", preferred 1.6" at print)`;
}

const NO_GENERATED_NUMBERING = [
  `PRINT NUMBERING RULE — NO GENERATED NUMBERS ANYWHERE ON THE PASS:`,
  `Do NOT illustrate, print, emboss, or imply any serial number, edition count, or ticket number.`,
  `Real serial numbers are applied programmatically at export into the back serial zone only.`,
].join("\n");

/** Front — full bleed artwork, no reserved zones. */
export function fullBleedFrontPrompt(): string {
  return [
    `FRONT SURFACE — 100% ARTWORK (NO RESERVED ZONES):`,
    `Use the entire front for the collectible design — edge to edge, full bleed.`,
    `No stamp panel, no serial area, no blank rectangle, no masked dead zones.`,
    `The front is a complete Retroverse artifact face — not a partial template with reserved functional areas.`,
    `Illustration, ornament, typography, and atmosphere fill the complete surface.`,
    ``,
    NO_GENERATED_NUMBERING,
  ].join("\n");
}

/** Integrated serial zone on back — intentional souvenir element, not a blank white box. */
export function integratedSerialZonePrompt(): string {
  return [
    `INTEGRATED SERIAL ZONE (BACK ONLY — MANDATORY):`,
    `Reserve a bottom-center zone for programmatic serial overlay at export.`,
    `Print size: ${serialZonePromptInches()} (${SERIAL_WIDTH_PX}×${SERIAL_HEIGHT_PX}px at x=${SERIAL_X0}–${SERIAL_X0 + SERIAL_WIDTH_PX}, y=${SERIAL_Y0}–${PASS_HEIGHT}).`,
    `Wider collector stamp plate for reliable post-print numbering.`,
    ``,
    `This zone must look DESIGNED — part of the collectible back:`,
    `- Collector stamp plate, ticket stub numbering footer, embossed verification band, or souvenir edition frame`,
    `- Era-appropriate ornament framing the zone — foil band, scalloped edge, perforated tear, broadcast lower-third`,
    `- Interior stays clear for serial overlay — no numbers, no serial text, no barcode`,
    `- NOT a flat blank white rectangle — integrate into the artwork as an intentional keepsake element`,
    ``,
    NO_GENERATED_NUMBERING,
  ].join("\n");
}

/** @deprecated Use integratedSerialZonePrompt — serial is on back only. */
export function integratedSerialStampPrompt(): string {
  return integratedSerialZonePrompt();
}

/** Integrated QR zone — decorative era-colored frame; interior clear for high-contrast QR at export. */
export function integratedQrZonePrompt(): string {
  return [
    `INTEGRATED QR ZONE (BACK ONLY — MANDATORY):`,
    `Reserve a square zone (${qrZonePromptInches()}) for programmatic QR insertion.`,
    `Position: ${QR_ZONE.size}px square at x=${QR_ZONE.left}, y=${QR_ZONE.top} on ${PASS_WIDTH}×${PASS_HEIGHT} canvas.`,
    `Place above the serial zone — both functional areas live on the back only.`,
    ``,
    `This zone must look DESIGNED — part of the collectible back:`,
    `- QR medallion with era-colored decorative FRAME around the square — frame uses era palette, ornament outside zone only`,
    `- Interior must stay clear for high-contrast black/white QR inserted at export — no fake modules`,
    `- NOT a flat blank white box — integrate frame as intentional souvenir back element`,
    `- Minimum 1.5" square at print; 1.6" preferred for scan reliability after lamination`,
    ``,
    `Real scannable QR (black modules on white) is inserted at export — never generated by AI.`,
  ].join("\n");
}

/** Combined back functional zones — QR + serial, both integrated into artwork. */
export function integratedBackFunctionalZonesPrompt(): string {
  return [integratedQrZonePrompt(), ``, integratedSerialZonePrompt()].join("\n");
}

export function qrZonePromptBlock(): string {
  return integratedQrZonePrompt();
}
