import { QR_PRODUCTION_DATA_RULES } from "./qr-production";
import type { PassQrPlacement } from "./types";

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
export const QR_PRINT_PREFERRED_MAX_IN = 1.8;

/** Target square QR — centered in 1.6–1.8" print band. */
export const QR_PRINT_SIZE_IN = 1.7;

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

/** Back — spacer band between QR reserve and serial/stamp area. */
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

/** Back — reserved verification area in lower half; code composited at export. */
export const QR_ZONE = {
  left: Math.round((PASS_WIDTH - QR_SIZE_PX) / 2),
  top:
    URL_ZONE.top -
    Math.round(URL_QR_GAP_IN * PX_PER_IN) -
    QR_SIZE_PX,
  size: QR_SIZE_PX,
} as const;

function isFinitePlacementNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function normalizeQrPlacement(raw: unknown): PassQrPlacement | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const row = raw as Partial<PassQrPlacement>;
  if (
    !isFinitePlacementNumber(row.left) ||
    !isFinitePlacementNumber(row.top) ||
    !isFinitePlacementNumber(row.size)
  ) {
    return undefined;
  }

  const left = Math.round(row.left);
  const top = Math.round(row.top);
  const size = Math.round(row.size);
  if (size <= 0 || left < 0 || top < 0 || left + size > PASS_WIDTH || top + size > PASS_HEIGHT) {
    return undefined;
  }
  return { left, top, size };
}

export function resolveQrPlacement(
  project?: { qrPlacement?: PassQrPlacement } | null,
): PassQrPlacement {
  return normalizeQrPlacement(project?.qrPlacement) ?? QR_ZONE;
}

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
    `SERIAL / STAMP ZONE (BACK ONLY — BOTTOM AUTHENTICATION AREA):`,
    `Reserve a generous bottom-center stamp area, visually about 15–18% of card height.`,
    `This area must support hand-stamped numbers, collector codes, and future authentication markings.`,
    `- Interior stays clear for serial overlay — no numbers, no serial text`,
    `- Keep clear separation from the QR reserve; neither area should overlap or visually compete`,
    `- Reduce supporting ornament before shrinking the QR reserve or serial/stamp area`,
    ``,
    NO_GENERATED_NUMBERING,
  ].join("\n");
}

/** @deprecated Use integratedSerialZonePrompt — serial is on back only. */
export function integratedSerialStampPrompt(): string {
  return integratedSerialZonePrompt();
}

/** @deprecated URL label bands are no longer model-facing artwork instructions. */
export function integratedUrlZonePrompt(): string {
  return "";
}

/** Verification reserve — intentional white window in artwork; code is export production data. */
export function integratedQrZonePrompt(): string {
  return [
    QR_PRODUCTION_DATA_RULES,
    ``,
    `PRODUCTION QR RESERVE (BACK ONLY — SQUARE ONLY):`,
    `Paint one production-safe reserved square, visually about 40–43% of card height.`,
    `The opening must be perfectly square — equal width and height. Never a rectangle, wide band, circle, badge, or rounded card.`,
    `Edges must be hard and straight with sharp 90-degree corners.`,
    `This is blank laminate stock reserved for production — not a temporary placeholder and not a decorative panel.`,
    `Do NOT print measurements, zone names, editor labels, URL text, or any words inside the square.`,
    ``,
    `The reserve is important for scanning but secondary to the full back layout; do not make it the primary design element.`,
    `Place it below collector/authentication information and above the serial/stamp area, with clear gutter space.`,
    `Ornament may frame outside the white square only. Never overlap the square and never draw code patterns in artwork.`,
  ].join("\n");
}

/** Back layout for RVBR prompts — no compositing coordinates. */
export function artworkBackLayoutPrompt(): string {
  return [
    integratedQrZonePrompt(),
    ``,
    integratedSerialZonePrompt(),
  ].join("\n");
}

/** Combined back functional zones — verification reserve owned by export. */
export function integratedBackFunctionalZonesPrompt(): string {
  return [
    `BACK SIDE — COLLECTOR CARD LAYOUT:`,
    `Front = hero artwork. Back = supporting artwork + collector/authentication information + production QR reserve + serial/stamp area.`,
    `Top: supporting artwork and era texture. Middle: collector/authentication information. Lower-middle: square QR reserve. Bottom: generous serial/stamp area.`,
    `The QR reserve is export-owned production space — not a medallion, badge, rounded panel, illustrated code, or text area.`,
    ``,
    integratedQrZonePrompt(),
    ``,
    integratedSerialZonePrompt(),
  ].join("\n");
}

export function qrZonePromptBlock(): string {
  return integratedBackFunctionalZonesPrompt();
}
