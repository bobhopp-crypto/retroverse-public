/**
 * BobOS Pass Workspace — Print Boost adjustments.
 *
 * Non-destructive brightness/contrast/saturation controls for AI pass artwork. The raw
 * generation PNG in the Content Creator library is never touched — adjustments are always
 * derived at read/finish time and can be changed freely without re-running AI generation.
 *
 * Pure types + math only in this file (safe to import from client components). The actual
 * pixel processing (sharp) lives in `pass-artwork-adjustments.server.ts`.
 */

export type PassArtworkAdjustments = {
  /** Multiplier — 1 = 100%, default 1.3 (130%). Range 0–2.5 (brightness/contrast) or 0–3 (saturation). */
  brightness: number;
  contrast: number;
  saturation: number;
  /** Fixed correction on top of the sliders — tuned for the AI provider's characteristically
   *  dark, flat output so passes read well in print. On by default; always removable. */
  printBoost: boolean;
};

export type PassAdjustmentRange = {
  min: number;
  max: number;
  default: number;
  step: number;
};

/** Slider ranges — stored as multipliers; UI displays as percentages. */
export const PASS_BRIGHTNESS_RANGE: PassAdjustmentRange = {
  min: 0,
  max: 2.5,
  default: 1.3,
  step: 0.01,
};

export const PASS_CONTRAST_RANGE: PassAdjustmentRange = {
  min: 0,
  max: 2.5,
  default: 1.3,
  step: 0.01,
};

export const PASS_SATURATION_RANGE: PassAdjustmentRange = {
  min: 0,
  max: 3,
  default: 1.3,
  step: 0.01,
};

/** @deprecated Use PASS_*_RANGE instead — kept so older imports fail loudly at compile time. */
export const PASS_ADJUSTMENT_MIN = PASS_BRIGHTNESS_RANGE.min;
export const PASS_ADJUSTMENT_MAX = PASS_BRIGHTNESS_RANGE.max;
export const PASS_ADJUSTMENT_STEP = PASS_BRIGHTNESS_RANGE.step;

export const DEFAULT_PASS_ARTWORK_ADJUSTMENTS: PassArtworkAdjustments = {
  brightness: PASS_BRIGHTNESS_RANGE.default,
  contrast: PASS_CONTRAST_RANGE.default,
  saturation: PASS_SATURATION_RANGE.default,
  printBoost: true,
};

/** Applied only when `printBoost` is on, multiplied with the slider values below. */
export const PRINT_BOOST_BRIGHTNESS = 1.14;
export const PRINT_BOOST_CONTRAST = 1.1;
export const PRINT_BOOST_SATURATION = 1.08;

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

export function normalizePassArtworkAdjustments(
  raw: Partial<PassArtworkAdjustments> | undefined | null,
): PassArtworkAdjustments {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_PASS_ARTWORK_ADJUSTMENTS };
  return {
    brightness: clamp(Number(raw.brightness ?? PASS_BRIGHTNESS_RANGE.default), PASS_BRIGHTNESS_RANGE.min, PASS_BRIGHTNESS_RANGE.max),
    contrast: clamp(Number(raw.contrast ?? PASS_CONTRAST_RANGE.default), PASS_CONTRAST_RANGE.min, PASS_CONTRAST_RANGE.max),
    saturation: clamp(Number(raw.saturation ?? PASS_SATURATION_RANGE.default), PASS_SATURATION_RANGE.min, PASS_SATURATION_RANGE.max),
    printBoost: raw.printBoost !== false,
  };
}

/** True when the raw generation buffer can pass through unchanged (100% sliders, no boost). */
export function isIdentityAdjustment(adjustments: PassArtworkAdjustments): boolean {
  return (
    !adjustments.printBoost &&
    adjustments.brightness === 1 &&
    adjustments.contrast === 1 &&
    adjustments.saturation === 1
  );
}

/** Slider values combined with the fixed Print Boost correction, if enabled. Shared by the
 *  server-side sharp pipeline and the client-side live CSS preview so they stay in sync. */
export function effectiveAdjustmentFactors(adjustments: PassArtworkAdjustments): {
  brightness: number;
  contrast: number;
  saturation: number;
} {
  const boost = adjustments.printBoost;
  return {
    brightness: adjustments.brightness * (boost ? PRINT_BOOST_BRIGHTNESS : 1),
    contrast: adjustments.contrast * (boost ? PRINT_BOOST_CONTRAST : 1),
    saturation: adjustments.saturation * (boost ? PRINT_BOOST_SATURATION : 1),
  };
}

/** CSS `filter` value for an instant client-side preview — approximates the server-side
 *  sharp pipeline closely enough for live feedback while dragging sliders. */
export function adjustmentsToCssFilter(adjustments: PassArtworkAdjustments): string {
  const { brightness, contrast, saturation } = effectiveAdjustmentFactors(adjustments);
  if (brightness === 1 && contrast === 1 && saturation === 1) return "none";
  return `brightness(${brightness.toFixed(3)}) contrast(${contrast.toFixed(3)}) saturate(${saturation.toFixed(3)})`;
}
