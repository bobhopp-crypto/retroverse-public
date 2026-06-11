import { QR_PRODUCTION_DATA_RULES } from "./qr-production";

/** Shared pass canvas layout — prompts and export compositing must match. */

export const PASS_WIDTH = 1024;
export const PASS_HEIGHT = 1536;

/** Final print size: 2.25" × 3.5" portrait collectible. */
export const PASS_PRINT_WIDTH_IN = 2.25;
export const PASS_PRINT_HEIGHT_IN = 3.5;

export const PX_PER_IN = PASS_WIDTH / PASS_PRINT_WIDTH_IN;

/** QR occupies ~65–75% of card width — functional first, not decorative. */
export const QR_CARD_WIDTH_RATIO_MIN = 0.65;
export const QR_CARD_WIDTH_RATIO_MAX = 0.75;
export const QR_CARD_WIDTH_RATIO_TARGET = 0.7;

export const QR_PRINT_MIN_IN = 1.5;
export const QR_PRINT_PREFERRED_MIN_IN = 1.6;
export const QR_PRINT_PREFERRED_MAX_IN = 1.7;

/** Target square QR — center of preferred band (~76% card width). */
export const QR_PRINT_SIZE_IN = 1.72;

export const QR_SIZE_PX = Math.round(QR_PRINT_SIZE_IN * PX_PER_IN);
export const QR_WIDTH_RATIO_OF_CARD = QR_PRINT_SIZE_IN / PASS_PRINT_WIDTH_IN;

/** Back — serial stamp at bottom edge. */
export const SERIAL_PRINT_W_IN = 1.95;
export const SERIAL_PRINT_H_IN = 0.5;
export const SERIAL_BOTTOM_MARGIN_IN = 0.06;

export const SERIAL_WIDTH_PX = Math.round(SERIAL_PRINT_W_IN * PX_PER_IN);
export const SERIAL_HEIGHT_PX = Math.round(SERIAL_PRINT_H_IN * PX_PER_IN);
export const SERIAL_X0 = Math.round((PASS_WIDTH - SERIAL_WIDTH_PX) / 2);
export const SERIAL_Y0 =
  PASS_HEIGHT - SERIAL_HEIGHT_PX - Math.round(SERIAL_BOTTOM_MARGIN_IN * PX_PER_IN);

/** Back — retroverse.live label band below QR. */
export const URL_PRINT_H_IN = 0.2;
export const URL_HEIGHT_PX = Math.round(URL_PRINT_H_IN * PX_PER_IN);
export const URL_QR_GAP_IN = 0.08;
export const URL_SERIAL_GAP_IN = 0.1;

export const URL_ZONE = {
  left: Math.round((PASS_WIDTH - QR_SIZE_PX) / 2),
  top:
    SERIAL_Y0 -
    Math.round(URL_SERIAL_GAP_IN * PX_PER_IN) -
    URL_HEIGHT_PX,
  width: QR_SIZE_PX,
  height: URL_HEIGHT_PX,
} as const;

/** Back — large QR dominates lower half; composited at export. */
export const QR_ZONE = {
  left: Math.round((PASS_WIDTH - QR_SIZE_PX) / 2),
  top:
    URL_ZONE.top -
    Math.round(URL_QR_GAP_IN * PX_PER_IN) -
    QR_SIZE_PX,
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
  const pct = Math.round(QR_WIDTH_RATIO_OF_CARD * 100);
  return `${QR_PRINT_SIZE_IN}" × ${QR_PRINT_SIZE_IN}" (~${pct}% card width; min ${QR_PRINT_MIN_IN}")`;
}

export function qrPhysicalSizeIn(pixelSize: number): number {
  return pixelSize / PX_PER_IN;
}

export function qrCardWidthPercent(): number {
  return Math.round(QR_WIDTH_RATIO_OF_CARD * 100);
}

const NO_GENERATED_NUMBERING = [
  `PRINT NUMBERING RULE — NO GENERATED NUMBERS ANYWHERE ON THE PASS:`,
  `Do NOT illustrate, print, emboss, or imply any serial number, edition count, or ticket number.`,
  `Real serial numbers are applied programmatically at export into the back serial zone only.`,
].join("\n");

/** Front — full bleed artwork, no reserved zones. */
export function fullBleedFrontPrompt(): string {
  return [
    `FRONT SURFACE — 100% COLLECTIBLE ARTWORK (NO RESERVED ZONES):`,
    `Use the entire front for the collectible design — edge to edge, full bleed.`,
    `No stamp panel, no serial area, no blank rectangle, no masked dead zones.`,
    `The front is a complete Retroverse collector card face — not a partial template.`,
    `Illustration, ornament, typography, and atmosphere fill the complete surface.`,
    ``,
    NO_GENERATED_NUMBERING,
  ].join("\n");
}

/** Integrated serial zone on back — bottom edge, subordinate to QR. */
export function integratedSerialZonePrompt(): string {
  return [
    `SERIAL STAMP ZONE (BACK ONLY — BOTTOM EDGE):`,
    `Reserve bottom-center zone for programmatic serial overlay at export.`,
    `Flush to bottom edge — thin collector stamp plate, not a dominant panel.`,
    `- Interior stays clear for serial overlay — no numbers, no serial text`,
    `- Reduce ornament before shrinking QR or URL band`,
    ``,
    NO_GENERATED_NUMBERING,
  ].join("\n");
}

/** @deprecated Use integratedSerialZonePrompt — serial is on back only. */
export function integratedSerialStampPrompt(): string {
  return integratedSerialZonePrompt();
}

/** URL label band below QR — AI may paint retroverse.live here; export QR is above. */
export function integratedUrlZonePrompt(): string {
  return [
    `URL LABEL BAND (BACK ONLY — BELOW QR):`,
    `Reserve a narrow band directly below the verification square.`,
    `Small typeset URL label — subordinate to QR, not competing for space.`,
    `Do NOT draw fake QR modules or barcodes in this band.`,
  ].join("\n");
}

/** QR reserve — intentional white window in artwork; scannable QR is export production data. */
export function integratedQrZonePrompt(): string {
  return [
    QR_PRODUCTION_DATA_RULES,
    ``,
    `QR RESERVE WINDOW (BACK ONLY — INTENTIONAL DESIGN ELEMENT):`,
    `Paint one large, flat, clean white square in the lower half of the back.`,
    `This is laminate stock reserved for verification — not a temporary placeholder.`,
    `Do NOT print measurements, zone names, or editor labels on the artwork.`,
    ``,
    `LAYOUT PRIORITY (back, top to bottom):`,
    `1. Upper area — collectible artwork + small authenticity seal`,
    `2. White verification window — empty, flat white, no modules, no texture inside`,
    `3. URL label band below the window`,
    `4. Serial stamp at bottom edge`,
    ``,
    `Ornament may frame outside the white window only. Never draw QR patterns in artwork.`,
  ].join("\n");
}

/** Back layout for RVBR prompts — no compositing coordinates. */
export function artworkBackLayoutPrompt(): string {
  return [
    integratedQrZonePrompt(),
    ``,
    integratedUrlZonePrompt(),
    ``,
    integratedSerialZonePrompt(),
  ].join("\n");
}

/** Combined back functional zones — QR-first layout. */
export function integratedBackFunctionalZonesPrompt(): string {
  return [
    `BACK SIDE — FUNCTIONAL LAYOUT (COLLECTOR CARD):`,
    `Front = collectible artwork. Back = collectible artwork + dominant QR + serial.`,
    `QR is the primary functional element — not a small medallion or badge.`,
    ``,
    integratedQrZonePrompt(),
    ``,
    integratedUrlZonePrompt(),
    ``,
    integratedSerialZonePrompt(),
  ].join("\n");
}

export function qrZonePromptBlock(): string {
  return integratedBackFunctionalZonesPrompt();
}
