/** Shared pass canvas layout — prompts and export compositing must match. */

export const PASS_WIDTH = 1024;
export const PASS_HEIGHT = 1536;

/** Final print size: 2.25" × 3.5" portrait collectible. */
export const PASS_PRINT_WIDTH_IN = 2.25;
export const PASS_PRINT_HEIGHT_IN = 3.5;

export const PX_PER_IN = PASS_WIDTH / PASS_PRINT_WIDTH_IN;

/** Back — serial/stamp reserve: 1.25" × 0.5" at print size. */
export const SERIAL_PRINT_W_IN = 1.25;
export const SERIAL_PRINT_H_IN = 0.5;

export const SERIAL_WIDTH_PX = Math.round(SERIAL_PRINT_W_IN * PX_PER_IN);
export const SERIAL_HEIGHT_PX = Math.round(SERIAL_PRINT_H_IN * PX_PER_IN);
export const SERIAL_X0 = Math.round((PASS_WIDTH - SERIAL_WIDTH_PX) / 2);
export const SERIAL_Y0 =
  PASS_HEIGHT - SERIAL_HEIGHT_PX - Math.round(0.15 * PX_PER_IN);

/** Back — QR reserve: ~1.375" square (within 1.25–1.5" range) at print size. */
export const QR_PRINT_SIZE_IN = 1.375;
export const QR_SIZE_PX = Math.round(QR_PRINT_SIZE_IN * PX_PER_IN);

const QR_SERIAL_GAP_PX = Math.round(0.2 * PX_PER_IN);

export const QR_ZONE = {
  left: Math.round((PASS_WIDTH - QR_SIZE_PX) / 2),
  top: SERIAL_Y0 - QR_SERIAL_GAP_PX - QR_SIZE_PX,
  size: QR_SIZE_PX,
} as const;

/** @deprecated Serial zone moved to back — aliases for legacy debug layout code. */
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
  return `${QR_PRINT_SIZE_IN}" × ${QR_PRINT_SIZE_IN}" (approx. 1.25–1.5" at print)`;
}

const NO_GENERATED_NUMBERING = [
  `PRINT NUMBERING RULE — NO GENERATED NUMBERS ANYWHERE ON THE PASS:`,
  `Do NOT illustrate, print, emboss, or imply any serial number, edition count, or ticket number.`,
  `Real serial numbers are applied programmatically at export into the back serial zone.`,
].join("\n");

/** Front — full bleed artwork, no reserved zones. */
export function fullBleedFrontPrompt(): string {
  return [
    `FRONT SURFACE — 100% ARTWORK (NO RESERVED ZONES):`,
    `Use the entire front for the collectible design — edge to edge, full bleed.`,
    `No stamp panel, no serial area, no blank rectangle, no masked dead zones.`,
    `The front should feel like a miniature poster, festival pass, concert souvenir, TV promo card, or era-native collectible credential.`,
    `Illustration, ornament, typography, and atmosphere fill the complete surface.`,
    ``,
    NO_GENERATED_NUMBERING,
  ].join("\n");
}

/** Integrated serial zone on back — intentional souvenir element, not a blank white box. */
export function integratedSerialZonePrompt(): string {
  return [
    `INTEGRATED SERIAL ZONE (BACK ONLY — MANDATORY):`,
    `Reserve a small bottom-center zone for programmatic serial overlay at export.`,
    `Print size: ${serialZonePromptInches()} (${SERIAL_WIDTH_PX}×${SERIAL_HEIGHT_PX}px at x=${SERIAL_X0}–${SERIAL_X0 + SERIAL_WIDTH_PX}, y=${SERIAL_Y0}–${PASS_HEIGHT}).`,
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

/** Integrated QR zone — decorative frame, clear interior for programmatic QR. */
export function integratedQrZonePrompt(): string {
  return [
    `INTEGRATED QR ZONE (BACK ONLY — MANDATORY):`,
    `Reserve a square zone (${qrZonePromptInches()}) for programmatic QR insertion.`,
    `Position: ${QR_ZONE.size}px square at x=${QR_ZONE.left}, y=${QR_ZONE.top} on ${PASS_WIDTH}×${PASS_HEIGHT} canvas.`,
    `Place above the serial zone — both functional areas live on the back only.`,
    ``,
    `This zone must look DESIGNED — part of the collectible back:`,
    `- QR medallion, broadcast badge frame, collector seal, or souvenir verification plate`,
    `- Era-appropriate decorative frame AROUND the square — ornament outside the zone only`,
    `- Interior clear for real QR — no checkerboard, no fake modules, no scannable pixels`,
    `- NOT a flat blank white box — integrate as intentional souvenir back element`,
    ``,
    `Real scannable QR is inserted at export — never generated by AI.`,
  ].join("\n");
}

/** Combined back functional zones — QR + serial, both integrated into artwork. */
export function integratedBackFunctionalZonesPrompt(): string {
  return [integratedQrZonePrompt(), ``, integratedSerialZonePrompt()].join("\n");
}

export function qrZonePromptBlock(): string {
  return integratedQrZonePrompt();
}
